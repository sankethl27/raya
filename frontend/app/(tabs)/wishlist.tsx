import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function WishlistScreen() {
  const { user, token } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user?.user_type === 'venue') {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const removeFromWishlist = async (profileId: string) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/wishlist/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlist(wishlist.filter((item: any) => item.profile.id !== profileId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove from wishlist');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  };

  const renderItem = ({ item }: any) => {
    const profile = item.profile;
    const isArtist = item.profile_type === 'artist';
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/${item.profile_type}/${profile.id}`)}
      >
        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            {profile.profile_image ? (
              <Image
                source={{ uri: profile.profile_image }}
                style={styles.image}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name={isArtist ? 'brush' : 'briefcase'}
                  size={32}
                  color={theme.colors.textSecondary}
                />
              </View>
            )}
          </View>
          
          <View style={styles.info}>
            <Text style={styles.name}>
              {isArtist ? profile.stage_name : profile.brand_name}
            </Text>
            <Text style={styles.type}>
              {isArtist ? profile.art_type : profile.service_type}
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="star" size={14} color={theme.colors.secondary} />
                <Text style={styles.statText}>{profile.rating.toFixed(1)}</Text>
              </View>
              
              {isArtist && (
                <View style={styles.stat}>
                  <Ionicons name="mic" size={14} color={theme.colors.secondary} />
                  <Text style={styles.statText}>{profile.experience_gigs} gigs</Text>
                </View>
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => {
              Alert.alert(
                'Remove from Wishlist',
                'Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeFromWishlist(profile.id) },
                ]
              );
            }}
          >
            <Ionicons name="heart" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (user?.user_type !== 'venue') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primaryDark, theme.colors.background]}
          style={styles.header}
        >
          <Text style={styles.title}>Wishlist</Text>
        </LinearGradient>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>Wishlist is only available for venues</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.background]}
        style={styles.header}
      >
        <Text style={styles.title}>My Wishlist</Text>
        <Text style={styles.subtitle}>{wishlist.length} saved</Text>
      </LinearGradient>

      <FlatList
        data={wishlist}
        renderItem={renderItem}
        keyExtractor={(item: any) => item.wishlist_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtext}>Save your favorite artists and partners</Text>
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
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  imageContainer: {
    width: 60,
    height: 60,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  type: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
  },
  removeButton: {
    padding: theme.spacing.sm,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
