import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      router.back();
      return;
    }
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (loading || !analytics) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primaryDark, theme.colors.primary]}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
      >
        {/* User Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={28} color={theme.colors.secondary} />
              </View>
              <Text style={styles.statValue}>{analytics.users.total}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="brush" size={28} color={theme.colors.secondary} />
              </View>
              <Text style={styles.statValue}>{analytics.users.artists}</Text>
              <Text style={styles.statLabel}>Artists</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="briefcase" size={28} color={theme.colors.secondary} />
              </View>
              <Text style={styles.statValue}>{analytics.users.partners}</Text>
              <Text style={styles.statLabel}>Partners</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="location" size={28} color={theme.colors.secondary} />
              </View>
              <Text style={styles.statValue}>{analytics.users.venues}</Text>
              <Text style={styles.statLabel}>Venues</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="trending-up" size={20} color={theme.colors.success} />
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>{analytics.users.active_7_days}</Text>
                <Text style={styles.infoLabel}>Active (7 days)</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="person-add" size={20} color={theme.colors.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>{analytics.users.new_30_days}</Text>
                <Text style={styles.infoLabel}>New (30 days)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chat Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Activity</Text>
          
          <View style={styles.chatStats}>
            <View style={styles.chatStatItem}>
              <Ionicons name="chatbubbles" size={24} color={theme.colors.secondary} />
              <View style={styles.chatStatContent}>
                <Text style={styles.chatStatValue}>{analytics.chats.total_rooms}</Text>
                <Text style={styles.chatStatLabel}>Total Chat Rooms</Text>
              </View>
            </View>

            <View style={styles.chatStatItem}>
              <Ionicons name="chatbubble-ellipses" size={24} color={theme.colors.success} />
              <View style={styles.chatStatContent}>
                <Text style={styles.chatStatValue}>{analytics.chats.active_rooms}</Text>
                <Text style={styles.chatStatLabel}>Active Chats</Text>
              </View>
            </View>

            <View style={styles.chatStatItem}>
              <Ionicons name="mail" size={24} color={theme.colors.secondary} />
              <View style={styles.chatStatContent}>
                <Text style={styles.chatStatValue}>{analytics.chats.total_messages}</Text>
                <Text style={styles.chatStatLabel}>Total Messages</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Ratings</Text>
          
          <View style={styles.ratingsContainer}>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>{analytics.ratings.avg_artist_rating.toFixed(1)}</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= analytics.ratings.avg_artist_rating ? 'star' : 'star-outline'}
                    size={16}
                    color={theme.colors.secondary}
                  />
                ))}
              </View>
              <Text style={styles.ratingLabel}>Artist Rating</Text>
            </View>

            <View style={styles.ratingCard}>
              <Text style={styles.ratingValue}>{analytics.ratings.avg_partner_rating.toFixed(1)}</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= analytics.ratings.avg_partner_rating ? 'star' : 'star-outline'}
                    size={16}
                    color={theme.colors.secondary}
                  />
                ))}
              </View>
              <Text style={styles.ratingLabel}>Partner Rating</Text>
            </View>
          </View>

          <View style={styles.totalReviews}>
            <Text style={styles.totalReviewsText}>{analytics.ratings.total_reviews} Total Reviews</Text>
          </View>
        </View>

        {/* Featured Listings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Listings</Text>
          
          <View style={styles.featuredContainer}>
            <LinearGradient
              colors={[theme.colors.secondary, theme.colors.secondaryDark]}
              style={styles.revenueCard}
            >
              <Ionicons name="trending-up" size={32} color={theme.colors.primaryDark} />
              <Text style={styles.revenueValue}>₹{analytics.featured.total_revenue}</Text>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
            </LinearGradient>

            <View style={styles.featuredStats}>
              <View style={styles.featuredStatItem}>
                <Ionicons name="star" size={20} color={theme.colors.secondary} />
                <Text style={styles.featuredStatValue}>{analytics.featured.artists}</Text>
                <Text style={styles.featuredStatLabel}>Featured Artists</Text>
              </View>

              <View style={styles.featuredStatItem}>
                <Ionicons name="star" size={20} color={theme.colors.secondary} />
                <Text style={styles.featuredStatValue}>{analytics.featured.partners}</Text>
                <Text style={styles.featuredStatLabel}>Featured Partners</Text>
              </View>
            </View>
          </View>
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
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    width: (width - theme.spacing.lg * 3) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  infoContent: {
    flex: 1,
  },
  infoValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  chatStats: {
    gap: theme.spacing.md,
  },
  chatStatItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  chatStatContent: {
    flex: 1,
  },
  chatStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  chatStatLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  ratingsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  ratingCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  ratingValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: theme.spacing.sm,
  },
  ratingLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  totalReviews: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  totalReviewsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '600',
  },
  featuredContainer: {
    gap: theme.spacing.md,
  },
  revenueCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.gold,
  },
  revenueValue: {
    fontSize: 42,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginVertical: theme.spacing.sm,
  },
  revenueLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  featuredStats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  featuredStatItem: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  featuredStatValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.white,
    marginVertical: theme.spacing.xs,
  },
  featuredStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
