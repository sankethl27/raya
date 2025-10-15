import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [reviews, setReviews] = useState([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartnerDetails();
    fetchReviews();
    if (user?.user_type === 'venue') {
      checkWishlist();
    }
  }, [id]);

  const fetchPartnerDetails = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/partners/${id}`);
      setPartner(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load partner details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/reviews/${id}`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkWishlist = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const inWishlist = response.data.some((item: any) => item.profile.id === id);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    if (user?.user_type !== 'venue') {
      Alert.alert('Info', 'Only venues can add to wishlist');
      return;
    }

    try {
      if (isInWishlist) {
        await axios.delete(`${BACKEND_URL}/api/wishlist/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsInWishlist(false);
        Alert.alert('Success', 'Removed from wishlist');
      } else {
        await axios.post(
          `${BACKEND_URL}/api/wishlist`,
          { profile_id: id, profile_type: 'partner' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsInWishlist(true);
        Alert.alert('Success', 'Added to wishlist');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update wishlist');
    }
  };

  const startChat = async () => {
    if (user?.user_type !== 'venue') {
      Alert.alert('Info', 'Only venues can start chats');
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/chat/room`,
        { provider_user_id: partner.user_id, provider_type: 'partner' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/chat/${response.data.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  if (loading || !partner) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primaryDark, theme.colors.primary]}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header with Image */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[theme.colors.primaryDark, theme.colors.primary]}
            style={styles.headerGradient}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
            </TouchableOpacity>

            {user?.user_type === 'venue' && (
              <TouchableOpacity style={styles.wishlistButton} onPress={toggleWishlist}>
                <Ionicons
                  name={isInWishlist ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isInWishlist ? theme.colors.error : theme.colors.white}
                />
              </TouchableOpacity>
            )}
          </LinearGradient>

          <View style={styles.profileImageContainer}>
            {partner.profile_image ? (
              <Image source={{ uri: partner.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="briefcase" size={80} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
        </View>

        {/* Partner Info */}
        <View style={styles.contentContainer}>
          <View style={styles.nameContainer}>
            <Text style={styles.brandName}>{partner.brand_name}</Text>
            {partner.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          <Text style={styles.serviceType}>{partner.service_type}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>{partner.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="chatbubbles" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>{partner.review_count}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="business" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>Pro</Text>
              <Text style={styles.statLabel}>Partner</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{partner.description || 'No description available.'}</Text>
          </View>

          {/* Services Highlight */}
          <View style={styles.servicesSection}>
            <View style={styles.servicesHeader}>
              <Ionicons name="briefcase" size={28} color={theme.colors.secondary} />
              <Text style={styles.servicesTitle}>What We Offer</Text>
            </View>
            <Text style={styles.servicesText}>
              Premium {partner.service_type} services for exclusive events and venues. Contact us to discuss your needs and availability.
            </Text>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.length > 0 ? (
              reviews.slice(0, 3).map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={14} color={theme.colors.secondary} />
                      <Text style={styles.reviewRatingText}>{review.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noReviews}>No reviews yet</Text>
            )}
          </View>

          {/* Action Buttons */}
          {user?.user_type === 'venue' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={startChat}>
                <Ionicons name="chatbubbles" size={20} color={theme.colors.primaryDark} />
                <Text style={styles.primaryButtonText}>Start Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push(`/review/${id}?type=partner`)}
              >
                <Ionicons name="star" size={20} color={theme.colors.secondary} />
                <Text style={styles.secondaryButtonText}>Leave Review</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
  },
  headerContainer: {
    height: 320,
  },
  headerGradient: {
    height: 240,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  wishlistButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: 0,
    left: width / 2 - 80,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: theme.colors.background,
    ...theme.shadows.lg,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  brandName: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.white,
    textAlign: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  featuredText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  serviceType: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.md,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  servicesSection: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    ...theme.shadows.gold,
  },
  servicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  servicesTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  servicesText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reviewerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  noReviews: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  actionButtons: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.gold,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
});
