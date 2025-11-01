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
  const [showMenu, setShowMenu] = useState(false);
  const [collaboration, setCollaboration] = useState<any>(null);
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<any>(null);

  useEffect(() => {
    fetchChatRoom();
    fetchMessages();
    fetchCollaboration();
    initializeSocket();

    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
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
      // Auto scroll to bottom after fetching
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    try {
      // Immediately add message to UI (optimistic update)
      const tempMessage = {
        id: Date.now().toString(),
        room_id: id,
        sender_id: user?.id,
        message: messageText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);

      // Send to backend via HTTP
      const response = await axios.post(
        `${BACKEND_URL}/api/chat/messages`,
        {
          room_id: id,
          message: messageText,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update with actual message from server
      setMessages((prev) => 
        prev.map(msg => msg.id === tempMessage.id ? response.data : msg)
      );

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd();
      }, 100);

      // Also emit via socket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          room_id: id,
          sender_id: user?.id,
          message: messageText,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove failed message
      setMessages((prev) => prev.slice(0, -1));
      setInputText(messageText);
    }
  };

  const getOtherUserId = () => {
    if (!roomInfo) return null;
    
    if (roomInfo.chat_type === 'artist_artist' || roomInfo.chat_type === 'partner_partner') {
      const isParticipant1 = roomInfo.participant1_id === user?.id;
      return isParticipant1 ? roomInfo.participant2_id : roomInfo.participant1_id;
    }
    
    if (user?.user_type === 'venue') {
      return roomInfo.provider_user_id;
    } else {
      return roomInfo.venue_user_id;
    }
  };

  const handleReport = () => {
    setShowMenu(false);
    Alert.prompt(
      'Report User',
      'Please describe the reason for reporting this user:',
      async (reason) => {
        if (!reason || !reason.trim()) {
          Alert.alert('Error', 'Please provide a reason');
          return;
        }

        try {
          await axios.post(
            `${BACKEND_URL}/api/users/report`,
            {
              reported_user_id: getOtherUserId(),
              reason: reason.trim(),
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          Alert.alert('Success', 'User reported successfully');
        } catch (error: any) {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to report user');
        }
      }
    );
  };

  const handleBlock = () => {
    setShowMenu(false);
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to chat with you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.post(
                `${BACKEND_URL}/api/users/block/${getOtherUserId()}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Success', 'User blocked successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleProposeCollaboration = async () => {
    if (collaboration) {
      Alert.alert('Info', 'Collaboration already proposed for this chat');
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/collaborations/propose`,
        { chat_room_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Fetch updated collaboration
      fetchCollaboration();
      Alert.alert('Success', 'Collaboration proposed! Waiting for approval from both parties.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to propose collaboration');
    }
  };

  const handleApproveCollaboration = async () => {
    if (!collaboration) return;

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/collaborations/${collaboration.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchCollaboration();
      Alert.alert('Success', response.data.message);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to approve collaboration');
    }
  };

  const fetchCollaboration = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/collaborations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Find collaboration for this chat room
      const collab = response.data.find((c: any) => c.chat_room_id === id);
      setCollaboration(collab || null);
    } catch (error) {
      console.log('Error fetching collaboration:', error);
    }
  };

  const getOtherPartyName = () => {
    if (!roomInfo) return 'Chat';
    
    // Artist-to-artist chat
    if (roomInfo.chat_type === 'artist_artist') {
      const isParticipant1 = roomInfo.participant1_id === user?.id;
      const otherArtist = isParticipant1 ? roomInfo.artist2_profile : roomInfo.artist1_profile;
      return otherArtist?.stage_name || 'Artist';
    }
    
    // Partner-to-partner chat
    if (roomInfo.chat_type === 'partner_partner') {
      const isParticipant1 = roomInfo.participant1_id === user?.id;
      const otherPartner = isParticipant1 ? roomInfo.partner2_profile : roomInfo.partner1_profile;
      return otherPartner?.brand_name || 'Partner';
    }
    
    // Venue chat
    if (user?.user_type === 'venue') {
      const profile = roomInfo.provider_profile;
      return profile?.stage_name || profile?.brand_name || 'Provider';
    } else {
      const profile = roomInfo.venue_profile;
      return profile?.venue_name || 'Venue';
    }
  };

  const isArtistChat = roomInfo?.chat_type === 'artist_artist';
  const isPartnerChat = roomInfo?.chat_type === 'partner_partner';

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.sender_id === user?.id;

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myBubble : styles.theirBubble,
          isArtistChat && isMyMessage && styles.artistMyBubble,
          isArtistChat && !isMyMessage && styles.artistTheirBubble,
          isPartnerChat && isMyMessage && styles.artistMyBubble,  // Same lavender for partners
          isPartnerChat && !isMyMessage && styles.artistTheirBubble,
        ]}>
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
        
        {/* 3-Dot Menu */}
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu Dropdown */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
            <Ionicons name="flag" size={20} color={theme.colors.error} />
            <Text style={styles.menuItemText}>Report User</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
            <Ionicons name="ban" size={20} color={theme.colors.error} />
            <Text style={styles.menuItemText}>Block User</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.monitoringNotice}>
        🔒 This chat is monitored for security and safety purposes
      </Text>

      {/* Collaboration Section */}
      {collaboration ? (
        <View style={styles.collaborationBanner}>
          {collaboration.participant1_approved && collaboration.participant2_approved ? (
            <View style={styles.collaborationApproved}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={styles.collaborationText}>
                ✨ Collaboration approved! Will be shared on Raaya.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.collaborationPending}
              onPress={handleApproveCollaboration}
            >
              <Ionicons name="people" size={20} color={theme.colors.secondary} />
              <Text style={styles.collaborationText}>
                {(user?.id === collaboration.participant1_id && collaboration.participant1_approved) ||
                 (user?.id === collaboration.participant2_id && collaboration.participant2_approved)
                  ? '⏳ Waiting for other party to approve collaboration'
                  : '✋ Tap to approve collaboration'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.proposeCollaborationButton}
          onPress={handleProposeCollaboration}
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.secondary} />
          <Text style={styles.proposeCollaborationText}>Mark as Successful Collaboration</Text>
        </TouchableOpacity>
      )}

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
  artistMyBubble: {
    backgroundColor: 'rgba(184, 165, 227, 0.3)', // Lavender tint for artist chats
  },
  artistTheirBubble: {
    backgroundColor: 'rgba(184, 165, 227, 0.15)', // Lighter lavender for received
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
