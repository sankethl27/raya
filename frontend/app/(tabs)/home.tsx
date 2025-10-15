import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  Animated,
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

  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const bannerScale = useRef(new Animated.Value(0.95)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchData();

    // Entrance animations
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(bannerScale, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Continuous sparkle animation
    Animated.loop(
      Animated.timing(sparkleRotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleScale, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const sparkleSpin = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
            <Animated.View style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}>
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_artist-hub-37/artifacts/nm0jan68_ChatGPT%20Image%20Oct%2015%2C%202025%2C%2010_51_19%20PM.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text style={[styles.tagline, {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }]}>
              One platform. Endless connections.
            </Animated.Text>
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
        
        <Animated.View style={{
          transform: [{ scale: bannerScale }],
          opacity: bannerOpacity,
        }}>
          <LinearGradient
            colors={['#F9E28C', '#E1C05B', '#D4AF37']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            {/* Floating sparkles */}
            <Animated.View style={[styles.heroBannerSparkle1, {
              transform: [
                { rotate: sparkleSpin },
                { scale: sparkleScale },
              ],
            }]}>
              <Ionicons name="sparkles" size={20} color={theme.colors.primaryDark} />
            </Animated.View>
            <Animated.View style={[styles.heroBannerSparkle2, {
              transform: [
                { rotate: sparkleSpin },
                { scale: sparkleScale },
              ],
            }]}>
              <Ionicons name="sparkles" size={16} color={theme.colors.primaryDark} />
            </Animated.View>

            <View style={styles.heroContent}>
              <View style={styles.heroIconRow}>
                <View style={styles.heroIconBubble}>
                  <Ionicons name="calendar" size={20} color={theme.colors.primaryDark} />
                </View>
                <View style={styles.heroIconBubble}>
                  <Ionicons name="people" size={20} color={theme.colors.primaryDark} />
                </View>
                <View style={styles.heroIconBubble}>
                  <Ionicons name="sparkles" size={20} color={theme.colors.primaryDark} />
                </View>
              </View>
              <Text style={styles.heroTitle}>Book. Collaborate.{'\n'}Get Noticed.</Text>
              <Text style={styles.heroSubtitle}>
                Whether it's a live event, personal gig, or brand collab — we make it easy to connect, partner, and grow.
              </Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroDescription}>
                Hire or get hired, check availability, and grow your visibility effortlessly.
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
        scrollEventThrottle={16}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.quickActions}>
            <AnimatedTouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/artists')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.actionGradient}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="brush" size={32} color={theme.colors.secondary} />
                </View>
                <Text style={styles.actionTitle}>Artists</Text>
                <Text style={styles.actionSubtitle}>Discover talent</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/partners')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primaryLight]}
                style={styles.actionGradient}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="briefcase" size={32} color={theme.colors.secondary} />
                </View>
                <Text style={styles.actionTitle}>Partners</Text>
                <Text style={styles.actionSubtitle}>Find brands</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </View>
        </View>

        {/* Featured Artists */}
        {artists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Artists</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/artists')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {artists.map((artist: any) => (
                <TouchableOpacity
                  key={artist.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/artist/${artist.id}`)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#F9E28C', '#E1C05B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.featuredBadge}
                  >
                    <Ionicons name="star" size={12} color={theme.colors.primaryDark} />
                    <Text style={styles.featuredText}>Featured</Text>
                  </LinearGradient>
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
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {partners.map((partner: any) => (
                <TouchableOpacity
                  key={partner.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/partner/${partner.id}`)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#F9E28C', '#E1C05B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.featuredBadge}
                  >
                    <Ionicons name="star" size={12} color={theme.colors.primaryDark} />
                    <Text style={styles.featuredText}>Featured</Text>
                  </LinearGradient>
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
            activeOpacity={0.8}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color={theme.colors.secondary} />
            </View>
            <Text style={styles.infoText}>About Us</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => router.push('/contact')}
            activeOpacity={0.8}
          >
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail" size={24} color={theme.colors.secondary} />
            </View>
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
    width: 220,
    height: 90,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.5,
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
    borderRadius: theme.borderRadius.xxl,
    marginTop: theme.spacing.md,
    overflow: 'visible',
    position: 'relative',
    ...theme.shadows.gold,
  },
  heroBannerSparkle1: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    opacity: 0.7,
  },
  heroBannerSparkle2: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    zIndex: 10,
    opacity: 0.6,
  },
  heroContent: {
    padding: theme.spacing.xl,
  },
  heroIconRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    justifyContent: 'center',
  },
  heroIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 14, 39, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.md,
    lineHeight: 42,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primaryDark,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    opacity: 0.9,
  },
  heroDivider: {
    height: 2,
    backgroundColor: theme.colors.primaryDark,
    width: 60,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
    opacity: 0.3,
  },
  heroDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.85,
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
    letterSpacing: 0.3,
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
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  actionGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    letterSpacing: 0.3,
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
    width: 180,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
    letterSpacing: 0.2,
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
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.sm,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '500',
  },
});
