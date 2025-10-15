import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [artists, setArtists] = useState([]);
  const [partners, setPartners] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [artistsRes, partnersRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/artists`),
        axios.get(`${BACKEND_URL}/api/partners`),
      ]);
      
      const featuredArtists = artistsRes.data.filter((a: any) => a.is_featured);
      const featuredPartners = partnersRes.data.filter((p: any) => p.is_featured);
      
      setArtists(featuredArtists.slice(0, 3));
      setPartners(featuredPartners.slice(0, 3));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.background]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_artist-hub-37/artifacts/nm0jan68_ChatGPT%20Image%20Oct%2015%2C%202025%2C%2010_51_19%20PM.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>One platform. Endless connections.</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
              router.replace('/auth/welcome');
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>Book. Collaborate. Get noticed.</Text>
          <Text style={styles.heroSubtitle}>
            Whether it's a live event, personal gig, or brand collab — we make it easy to connect, partner, and grow.
          </Text>
          <Text style={styles.heroDescription}>
            Hire or get hired, check availability, and grow your visibility effortlessly.
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/artists')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.actionGradient}
              >
                <Ionicons name="brush" size={32} color={theme.colors.secondary} />
                <Text style={styles.actionTitle}>Artists</Text>
                <Text style={styles.actionSubtitle}>Discover talent</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/partners')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.actionGradient}
              >
                <Ionicons name="briefcase" size={32} color={theme.colors.secondary} />
                <Text style={styles.actionTitle}>Partners</Text>
                <Text style={styles.actionSubtitle}>Find brands</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Artists</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/artists')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {artists.map((artist: any) => (
                <TouchableOpacity
                  key={artist.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/artist/${artist.id}`)}
                >
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={12} color={theme.colors.primaryDark} />
                    <Text style={styles.featuredText}>Featured</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{artist.stage_name}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{artist.art_type}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={theme.colors.secondary} />
                      <Text style={styles.ratingText}>{artist.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Partners */}
        {partners.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Partners</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/partners')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {partners.map((partner: any) => (
                <TouchableOpacity
                  key={partner.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/partner/${partner.id}`)}
                >
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={12} color={theme.colors.primaryDark} />
                    <Text style={styles.featuredText}>Featured</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{partner.brand_name}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{partner.service_type}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={theme.colors.secondary} />
                      <Text style={styles.ratingText}>{partner.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => router.push('/about')}
          >
            <Ionicons name="information-circle" size={24} color={theme.colors.secondary} />
            <Text style={styles.infoText}>About Us</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => router.push('/contact')}
          >
            <Ionicons name="mail" size={24} color={theme.colors.secondary} />
            <Text style={styles.infoText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  logoImage: {
    width: 150,
    height: 60,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  heroBanner: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    ...theme.shadows.gold,
  },
  heroTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    lineHeight: 26,
    marginBottom: theme.spacing.md,
  },
  heroDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    lineHeight: 22,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  seeAll: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  actionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  carousel: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  featuredCard: {
    width: 160,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
  },
  featuredBadge: {
    backgroundColor: theme.colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
  },
});
