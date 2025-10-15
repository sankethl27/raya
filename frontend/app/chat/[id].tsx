import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import io from 'socket.io-client';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    fetchChatRoom();
    fetchMessages();
    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  const initializeSocket = () => {
    const socket = io(BACKEND_URL.replace('/api', ''), {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('authenticate', { user_id: user?.id });
      socket.emit('join_room', { room_id: id });
    });

    socket.on('new_message', (message: any) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);
    });

    socket.on('user_typing', (data: any) => {
      // Handle typing indicator if needed
    });

    socketRef.current = socket;
  };

  const fetchChatRoom = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const room = response.data.find((r: any) => r.id === id);
      if (room) {
        setRoomInfo(room);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chat/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit('send_message', {
        room_id: id,
        sender_id: user?.id,
        message: inputText.trim(),
      });
      setInputText('');
    }
  };

  const getOtherPartyName = () => {
    if (!roomInfo) return 'Chat';
    
    if (user?.user_type === 'venue') {
      const profile = roomInfo.provider_profile;
      return profile?.stage_name || profile?.brand_name || 'Provider';
    } else {
      const profile = roomInfo.venue_profile;
      return profile?.venue_name || 'Venue';
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.sender_id === user?.id;

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myText : styles.theirText]}>
            {item.message}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getOtherPartyName()}</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <Text style={styles.monitoringNotice}>
        🔒 This chat is monitored for security and safety purposes
      </Text>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={theme.colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  monitoringNotice: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceLight,
  },
  messagesList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  messageContainer: {
    marginBottom: theme.spacing.sm,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  myBubble: {
    backgroundColor: theme.colors.secondary,
  },
  theirBubble: {
    backgroundColor: theme.colors.surface,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 20,
  },
  myText: {
    color: theme.colors.primaryDark,
  },
  theirText: {
    color: theme.colors.white,
  },
  timeText: {
    fontSize: theme.fontSize.xs,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
