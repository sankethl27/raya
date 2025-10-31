import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function MyChatsScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const fetchChatRooms = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatRooms(response.data);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChatRooms();
    setRefreshing(false);
  };

  const getOtherPartyInfo = (room: any) => {
    // Artist-to-artist chat
    if (room.chat_type === 'artist_artist') {
      // Determine which artist is the "other" participant
      const isParticipant1 = room.participant1_id === user?.id;
      const otherArtistProfile = isParticipant1 ? room.artist2_profile : room.artist1_profile;
      
      return {
        name: otherArtistProfile?.stage_name || 'Artist',
        image: otherArtistProfile?.profile_image,
        type: 'artist',
        isArtistChat: true,
      };
    }
    
    // Venue chat (existing logic)
    if (user?.user_type === 'venue') {
      const profile = room.provider_profile;
      return {
        name: profile?.stage_name || profile?.brand_name || 'Provider',
        image: profile?.profile_image,
        type: room.provider_type,
        isArtistChat: false,
      };
    } else {
      const profile = room.venue_profile;
      return {
        name: profile?.venue_name || 'Venue',
        image: profile?.profile_image,
        type: 'venue',
        isArtistChat: false,
      };
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderChatRoom = ({ item }: any) => {
    const otherParty = getOtherPartyInfo(item);
    const lastMessage = item.last_message;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatarContainer}>
          {otherParty.image ? (
            <Image source={{ uri: otherParty.image }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name={otherParty.type === 'venue' ? 'location' : otherParty.type === 'artist' ? 'brush' : 'briefcase'}
                size={28}
                color={theme.colors.textSecondary}
              />
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherParty.name}</Text>
            {lastMessage && (
              <Text style={styles.chatTime}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>
          
          {lastMessage ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage.sender_id === user?.id ? 'You: ' : ''}
              {lastMessage.message}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>My Chats</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <FlatList
        data={chatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation with artists or partners</Text>
          </View>
        }
      />
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
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  avatarContainer: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.white,
  },
  chatTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  lastMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  noMessages: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.white,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
