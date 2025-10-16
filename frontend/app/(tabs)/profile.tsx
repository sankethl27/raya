import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ProfileScreen() {
  const { user, profile, logout, token } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getProfileName = () => {
    if (!profile) return user?.email || 'User';
    if (user?.user_type === 'artist') return profile.stage_name;
    if (user?.user_type === 'partner') return profile.brand_name;
    if (user?.user_type === 'venue') return profile.venue_name;
    return user?.email || 'User';
  };

  const getUserTypeIcon = () => {
    switch (user?.user_type) {
      case 'artist': return 'brush';
      case 'partner': return 'briefcase';
      case 'venue': return 'location';
      default: return 'person';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary]}
        style={styles.header}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name={getUserTypeIcon()} size={48} color={theme.colors.secondary} />
          </View>
          
          <Text style={styles.name}>{getProfileName()}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.user_type?.toUpperCase()}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {(user?.user_type === 'artist' || user?.user_type === 'partner') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            
            {!profile ? (
              <View style={styles.noProfileContainer}>
                <Ionicons name="add-circle-outline" size={64} color={theme.colors.secondary} />
                <Text style={styles.noProfileText}>Complete your profile to get discovered!</Text>
                <Text style={styles.noProfileSubtext}>
                  Add your details, photos, and availability to start connecting with venues.
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Ionicons name="add-circle" size={20} color={theme.colors.primaryDark} />
                  <Text style={styles.createButtonText}>Create Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {user?.user_type === 'artist' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Stage Name</Text>
                      <Text style={styles.infoValue}>{profile.stage_name || 'Not set'}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Art Type</Text>
                      <Text style={styles.infoValue}>{profile.art_type || 'Not set'}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Experience</Text>
                      <Text style={styles.infoValue}>{profile.experience_gigs || 0} gigs</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Media Gallery</Text>
                      <Text style={styles.infoValue}>{profile.media_gallery?.length || 0} items</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Rating</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color={theme.colors.secondary} />
                        <Text style={styles.infoValue}>{profile.rating?.toFixed(1) || '0.0'} ({profile.review_count || 0} reviews)</Text>
                      </View>
                    </View>
                  </>
                )}
                
                {user?.user_type === 'partner' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Brand Name</Text>
                      <Text style={styles.infoValue}>{profile.brand_name || 'Not set'}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Service Type</Text>
                      <Text style={styles.infoValue}>{profile.service_type || 'Not set'}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Media Gallery</Text>
                      <Text style={styles.infoValue}>{profile.media_gallery?.length || 0} items</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Rating</Text>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color={theme.colors.secondary} />
                        <Text style={styles.infoValue}>{profile.rating?.toFixed(1) || '0.0'} ({profile.review_count || 0} reviews)</Text>
                      </View>
                    </View>
                  </>
                )}
                
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Ionicons name="create" size={20} color={theme.colors.primaryDark} />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {user?.user_type === 'venue' && profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Venue Name</Text>
              <Text style={styles.infoValue}>{profile.venue_name || 'Not set'}</Text>
            </View>
            
            {profile.description && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{profile.description}</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/edit-profile')}
            >
              <Ionicons name="create" size={20} color={theme.colors.primaryDark} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADMIN DASHBOARD LINK - Only visible to admin */}
        {user?.user_type === 'admin' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/admin-dashboard')}
            >
              <LinearGradient
                colors={[theme.colors.secondary, theme.colors.secondaryDark]}
                style={styles.adminGradient}
              >
                <Ionicons name="analytics" size={24} color={theme.colors.primaryDark} />
                <Text style={styles.adminButtonText}>Admin Dashboard</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primaryDark} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {(user?.user_type === 'artist' || user?.user_type === 'partner') && (
          <>
            {/* PROFILE MANAGEMENT */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Management</Text>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  Alert.alert(
                    'Pause Profile',
                    'Your profile will be hidden from venues but you can still chat. Data will be saved.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Pause',
                        onPress: async () => {
                          try {
                            await axios.post(`${BACKEND_URL}/api/profile/pause`, {}, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert('Success', 'Profile paused');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to pause profile');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="pause-circle" size={24} color={theme.colors.secondary} />
                <Text style={styles.menuText}>Pause Profile</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  Alert.alert(
                    'Delete Profile',
                    'This will permanently delete your account and all data. This cannot be undone!',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await axios.delete(`${BACKEND_URL}/api/profile/delete`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            await logout();
                            Alert.alert('Deleted', 'Profile permanently deleted');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to delete profile');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={24} color={theme.colors.error} />
                <Text style={[styles.menuText, { color: theme.colors.error }]}>Delete Profile</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* GET FEATURED SECTION */}
            <View style={styles.featuredSection}>
              <LinearGradient
                colors={[theme.colors.secondary, theme.colors.secondaryDark]}
                style={styles.featuredGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.featuredContent}>
                  <View style={styles.sparkleIcon}>
                    <Ionicons name="sparkles" size={32} color={theme.colors.primaryDark} />
                  </View>
                  <Text style={styles.featuredTitle}>Get Featured</Text>
                  <Text style={styles.featuredSubtitle}>
                    Boost your visibility, reach more venues, and get booked faster.
                  </Text>
                  
                  <View style={styles.pricingCards}>
                    {user?.user_type === 'artist' && (
                      <View style={styles.pricingCard}>
                        <Text style={styles.pricingAmount}>₹199</Text>
                        <Text style={styles.pricingPeriod}>/ week</Text>
                      </View>
                    )}
                    {user?.user_type === 'partner' && (
                      <View style={styles.pricingCard}>
                        <Text style={styles.pricingAmount}>₹999</Text>
                        <Text style={styles.pricingPeriod}>/ month</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.featuredButton}
                    onPress={() => {
                      Alert.alert(
                        'Get Featured',
                        'To activate featured placement, please add your Razorpay API keys to the backend .env file.\n\nSee /app/RAZORPAY_SETUP.md for instructions.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Ionicons name="rocket" size={20} color={theme.colors.secondary} />
                    <Text style={styles.featuredButtonText}>Get Featured Now</Text>
                  </TouchableOpacity>

                  <View style={styles.featuredBenefits}>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.benefitText}>Top of search results</Text>
                    </View>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.benefitText}>Gold badge display</Text>
                    </View>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.benefitText}>3x more visibility</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Activity</Text>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/my-chats')}
              >
                <Ionicons name="chatbubbles" size={24} color={theme.colors.secondary} />
                <Text style={styles.menuText}>My Chats</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/my-reviews')}
              >
                <Ionicons name="star" size={24} color={theme.colors.secondary} />
                <Text style={styles.menuText}>My Reviews</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {user?.user_type === 'venue' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/my-chats')}
            >
              <Ionicons name="chatbubbles" size={24} color={theme.colors.secondary} />
              <Text style={styles.menuText}>My Chats</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/about')}>
            <Ionicons name="information-circle" size={24} color={theme.colors.secondary} />
            <Text style={styles.menuText}>About Us</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/contact')}>
            <Ionicons name="mail" size={24} color={theme.colors.secondary} />
            <Text style={styles.menuText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color={theme.colors.error} />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
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
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  name: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  email: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  badge: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    marginTop: theme.spacing.sm,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
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
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  editButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: theme.colors.error,
  },
  featuredSection: {
    padding: theme.spacing.lg,
  },
  featuredGradient: {
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    ...theme.shadows.gold,
  },
  featuredContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  sparkleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  featuredTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  featuredSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primaryDark,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    opacity: 0.9,
  },
  pricingCards: {
    marginBottom: theme.spacing.lg,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  pricingAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  pricingPeriod: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.xs,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  featuredButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  featuredBenefits: {
    gap: theme.spacing.sm,
    alignSelf: 'stretch',
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  benefitText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  adminButton: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.gold,
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  adminButtonText: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  noProfileContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  noProfileText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
  },
  noProfileSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    ...theme.shadows.gold,
  },
  createButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
