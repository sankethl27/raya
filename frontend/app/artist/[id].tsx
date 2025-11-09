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
import SubscriptionPopup from '../../components/SubscriptionPopup';
import { ArtistProModal } from '../../components/ArtistProModal';
import { showPaymentOptions } from '../../services/paymentService';
import { Calendar } from 'react-native-calendars';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const router = useRouter();
  const [artist, setArtist] = useState<any>(null);
  const [reviews, setReviews] = useState([]);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionPopup, setShowSubscriptionPopup] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  const isArtist = user?.user_type === 'artist';
  const isMyProfile = user?.id && artist?.user_id === user?.id;

  useEffect(() => {
    if (user?.user_type === 'venue') {
      trackView();
    } else if (user?.user_type === 'artist') {
      trackArtistView();
      fetchArtistSubscription();
    }
    fetchArtistDetails();
    fetchReviews();
    if (user?.user_type === 'venue') {
      checkWishlist();
    }
  }, [id]);

  const fetchArtistSubscription = async () => {
    if (!token || !isArtist) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artist/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const trackArtistView = async () => {
    if (!token || !isArtist) return;
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/artist/subscription/track-view`,
        { profile_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.data.allowed) {
        // Show Go Pro modal
        setShowProModal(true);
        // Optionally navigate back
        setTimeout(() => router.back(), 500);
        return;
      }
      
      // Update subscription state
      setSubscription((prev: any) => ({
        ...prev,
        profile_views_remaining: response.data.views_remaining,
      }));
    } catch (error) {
      console.error('Error tracking artist view:', error);
    }
  };

  const handleUpgradeToPro = async () => {
    setShowProModal(false);
    
    if (!token || !user) {
      Alert.alert('Error', 'Please login to upgrade');
      return;
    }

    // Show payment options
    showPaymentOptions(
      user.user_type as 'artist' | 'partner' | 'venue',
      token,
      async () => {
        // On success, refresh subscription data and profile
        await fetchArtistSubscription();
        Alert.alert(
          '🎉 Welcome to Pro!',
          'You now have unlimited profile views and chats. Enjoy increased visibility across the app!',
          [{ text: 'Awesome!', onPress: () => fetchArtistDetails() }]
        );
      }
    );
  };

  const trackView = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/subscription/track-view`,
        { profile_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data.allowed) {
        setShowSubscriptionPopup(true);
      }
    } catch (error) {
      console.log('View tracking:', error);
    }
  };

  const handleSubscribe = async (type: 'monthly' | 'pay_per_view') => {
    try {
      const orderResponse = await axios.post(
        `${BACKEND_URL}/api/subscription/create-razorpay-order`,
        { payment_type: type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // In test mode, auto-verify payment
      await axios.post(
        `${BACKEND_URL}/api/subscription/verify-payment`,
        {
          razorpay_order_id: orderResponse.data.order_id,
          razorpay_payment_id: 'test_payment_' + Date.now(),
          razorpay_signature: 'test_signature',
          payment_type: type,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success!', 'Subscription activated successfully!');
      setShowSubscriptionPopup(false);
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    }
  };

  const fetchArtistDetails = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artists/${id}`);
      setArtist(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load artist details');
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
          { profile_id: id, profile_type: 'artist' },
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
    if (!user) {
      Alert.alert('Login Required', 'Please login to start a chat');
      return;
    }

    // Artist-to-Artist chat
    if (user?.user_type === 'artist' && !isMyProfile) {
      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/chat/room`,
          { other_artist_id: artist?.user_id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        router.push(`/chat/${response.data.id}`);
      } catch (error: any) {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to start chat');
      }
      return;
    }

    // Venue chat (existing logic)
    if (user?.user_type !== 'venue') {
      Alert.alert('Info', 'Only venues can start chats');
      return;
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/chat/room`,
        { provider_user_id: artist.user_id, provider_type: 'artist' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push(`/chat/${response.data.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  if (loading || !artist) {
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
            {artist.profile_image ? (
              <Image source={{ uri: artist.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={80} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
        </View>

        {/* Artist Info */}
        <View style={styles.contentContainer}>
          <View style={styles.nameContainer}>
            <Text style={styles.stageName}>{artist.stage_name}</Text>
            {artist.is_featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={16} color={theme.colors.primaryDark} />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>

          <Text style={styles.artType}>{artist.art_type}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>{artist.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="mic" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>{artist.experience_gigs}</Text>
              <Text style={styles.statLabel}>Gigs</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="chatbubbles" size={24} color={theme.colors.secondary} />
              <Text style={styles.statValue}>{artist.review_count}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{artist.description || 'No description available.'}</Text>
          </View>

          {/* MEDIA GALLERY - BIGGER DISPLAY */}
          {artist.media_gallery && artist.media_gallery.length > 0 && (
            <View style={styles.mediaSection}>
              <View style={styles.mediaSectionHeader}>
                <Ionicons name="images" size={28} color={theme.colors.secondary} />
                <Text style={styles.sectionTitle}>Media Gallery</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                {artist.media_gallery.map((media: string, index: number) => (
                  <View key={index} style={styles.mediaItemContainer}>
                    {media.startsWith('data:video') ? (
                      <View style={styles.videoContainer}>
                        <Image source={{ uri: media }} style={styles.mediaImage} resizeMode="cover" />
                        <View style={styles.videoOverlay}>
                          <View style={styles.playButton}>
                            <Ionicons name="play" size={40} color={theme.colors.primaryDark} />
                          </View>
                          <Text style={styles.videoLabel}>Video {index + 1}</Text>
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: media }} style={styles.mediaImage} resizeMode="cover" />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Press Kit */}
          {artist.press_kit && (
            <View style={styles.section}>
              <View style={styles.pressKitHeader}>
                <Ionicons name="document-text" size={24} color={theme.colors.secondary} />
                <Text style={styles.sectionTitle}>Press Kit</Text>
              </View>
              <TouchableOpacity
                style={styles.pressKitButton}
                onPress={() => {
                  // Open URL
                  Alert.alert('Press Kit', artist.press_kit);
                }}
              >
                <Text style={styles.pressKitLink}>{artist.press_kit}</Text>
                <Ionicons name="open-outline" size={20} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Locations */}
          {artist.locations && artist.locations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.locationsSectionHeader}>
                <Ionicons name="location" size={24} color={theme.colors.secondary} />
                <Text style={styles.sectionTitle}>Performance Locations</Text>
              </View>
              <View style={styles.locationsGrid}>
                {artist.locations.map((location: string, index: number) => (
                  <View key={index} style={styles.locationChip}>
                    <Text style={styles.locationText}>{location}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AVAILABILITY - CALENDAR VIEW */}
          <View style={styles.availabilitySection}>
            <View style={styles.availabilityHeader}>
              <Ionicons name="calendar" size={28} color={theme.colors.secondary} />
              <Text style={styles.availabilityTitle}>Availability</Text>
            </View>

            {artist?.availability && artist.availability.length > 0 ? (
              <View style={styles.calendarContainer}>
                <Calendar
                  markedDates={
                    artist.availability.reduce((acc: any, slot: any) => {
                      if (slot.date) {
                        acc[slot.date] = {
                          selected: true,
                          marked: true,
                          selectedColor: theme.colors.secondary,
                          selectedTextColor: theme.colors.primaryDark,
                        };
                      }
                      return acc;
                    }, {})
                  }
                  theme={{
                    backgroundColor: theme.colors.surface,
                    calendarBackground: theme.colors.surface,
                    textSectionTitleColor: theme.colors.textSecondary,
                    selectedDayBackgroundColor: theme.colors.secondary,
                    selectedDayTextColor: theme.colors.primaryDark,
                    todayTextColor: theme.colors.secondary,
                    dayTextColor: theme.colors.text,
                    textDisabledColor: theme.colors.textTertiary,
                    dotColor: theme.colors.secondary,
                    selectedDotColor: theme.colors.primaryDark,
                    arrowColor: theme.colors.secondary,
                    monthTextColor: theme.colors.text,
                    textDayFontWeight: '500',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 14,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 12,
                  }}
                  style={styles.calendar}
                />
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noAvailability}>
                <Ionicons name="calendar-outline" size={48} color={theme.colors.textTertiary} />
                <Text style={styles.noAvailabilityText}>
                  No availability set. Contact the artist directly.
                </Text>
              </View>
            )}
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
                onPress={() => router.push(`/review/${id}?type=artist`)}
              >
                <Ionicons name="star" size={20} color={theme.colors.secondary} />
                <Text style={styles.secondaryButtonText}>Leave Review</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Artist-to-Artist Chat Button */}
          {isArtist && !isMyProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.primaryButton, styles.artistChatButton]} onPress={startChat}>
                <Ionicons name="chatbubbles" size={20} color="#B8A5E3" />
                <Text style={[styles.primaryButtonText, styles.artistChatButtonText]}>Chat with Artist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      <SubscriptionPopup
        visible={showSubscriptionPopup}
        onClose={() => setShowSubscriptionPopup(false)}
        onSubscribe={handleSubscribe}
      />

      <ArtistProModal
        visible={showProModal}
        onClose={() => setShowProModal(false)}
        onUpgrade={handleUpgradeToPro}
      />
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
  stageName: {
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
  artType: {
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
  mediaSection: {
    marginBottom: theme.spacing.xl,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  mediaScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  mediaItemContainer: {
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  mediaImage: {
    width: 280,
    height: 360,
    borderRadius: theme.borderRadius.lg,
  },
  videoContainer: {
    position: 'relative',
    width: 280,
    height: 360,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  videoLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  videoPlaceholder: {
    width: 280,
    height: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  videoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  pressKitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  pressKitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  pressKitLink: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  locationsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  locationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  locationChip: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  locationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  availabilitySection: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    ...theme.shadows.gold,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  availabilityTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  calendarContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    overflow: 'hidden',
  },
  calendar: {
    borderRadius: theme.borderRadius.lg,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dayName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.white,
  },
  timeSlotsContainer: {
    gap: theme.spacing.sm,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  timeSlotText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  noAvailability: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  noAvailabilityText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textTertiary,
    textAlign: 'center',
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
  artistChatButton: {
    backgroundColor: 'rgba(184, 165, 227, 0.2)',
    borderColor: 'rgba(184, 165, 227, 0.5)',
    borderWidth: 2,
  },
  artistChatButtonText: {
    color: '#B8A5E3',
  },
  dateAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  availabilityDate: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
});
