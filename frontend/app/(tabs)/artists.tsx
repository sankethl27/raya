import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme, BANGALORE_LOCATIONS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { ArtistProModal } from '../../components/ArtistProModal';
import { Calendar } from 'react-native-calendars';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ArtistsScreen() {
  const { user, token } = useAuth();
  const [artists, setArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  
  // Filter states
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedArtType, setSelectedArtType] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<string | null>(null);
  
  const router = useRouter();
  const isArtist = user?.user_type === 'artist';
  const isPartner = user?.user_type === 'partner';

  useEffect(() => {
    fetchArtists();
    if (isArtist) {
      fetchArtistSubscription();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, artists, minRating, selectedLocation, selectedArtType, availableOnly]);

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

  const handleChatPress = async (artistId: string) => {
    if (!token) {
      Alert.alert('Login Required', 'Please login to chat with artists');
      return;
    }

    try {
      // Determine the chat type based on current user
      let chatData = {};
      
      if (isArtist) {
        // Artist chatting with artist
        chatData = { other_artist_id: artistId };
      } else if (isPartner) {
        // Partner chatting with artist (cross-type)
        chatData = { provider_user_id: artistId, provider_type: 'artist' };
      }
      
      const response = await axios.post(
        `${BACKEND_URL}/api/chat/room`,
        chatData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      router.push(`/chat/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating chat:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start chat');
    }
  };

  const handleArtistPress = async (artistId: string) => {
    // If artist viewing another artist, track the view
    if (isArtist && token) {
      try {
        const response = await axios.post(
          `${BACKEND_URL}/api/artist/subscription/track-view`,
          { profile_id: artistId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!response.data.allowed) {
          // Show Go Pro modal
          setShowProModal(true);
          return;
        }
        
        // Update subscription state
        setSubscription((prev: any) => ({
          ...prev,
          profile_views_remaining: response.data.views_remaining,
        }));
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
    
    // Navigate to artist detail
    router.push(`/artist/${artistId}`);
  };

  const handleUpgradeToPro = async () => {
    // Navigate to payment screen or handle Razorpay
    setShowProModal(false);
    Alert.alert('Go Pro', 'Razorpay payment integration coming soon! ₹499/month for unlimited access.');
  };

  const fetchArtists = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/artists`);
      const sorted = response.data.sort((a: any, b: any) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return b.rating - a.rating;
      });
      setArtists(sorted);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...artists];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((artist: any) =>
        artist.stage_name.toLowerCase().includes(query) ||
        artist.art_type.toLowerCase().includes(query)
      );
    }
    
    // Rating filter
    if (minRating) {
      filtered = filtered.filter((artist: any) => artist.rating >= minRating);
    }
    
    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter((artist: any) => 
        artist.locations && artist.locations.includes(selectedLocation)
      );
    }
    
    // Art type filter
    if (selectedArtType) {
      filtered = filtered.filter((artist: any) => 
        artist.art_type.toLowerCase().includes(selectedArtType.toLowerCase())
      );
    }
    
    // Availability date filter
    if (selectedAvailabilityDate) {
      filtered = filtered.filter((artist: any) => 
        artist.availability && 
        artist.availability.some((av: any) => av.date === selectedAvailabilityDate && av.is_available)
      );
    }
    
    setFilteredArtists(filtered);
  };

  const clearFilters = () => {
    setMinRating(null);
    setSelectedLocation(null);
    setSelectedArtType(null);
    setAvailableOnly(false);
    setSelectedAvailabilityDate(null);
    setSearchQuery('');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArtists();
    setRefreshing(false);
  };

  const renderArtist = ({ item }: any) => {
    const isMyProfile = user?.id && item.user_id === user.id;
    
    return (
      <TouchableOpacity
        style={styles.artistCard}
        onPress={() => handleArtistPress(item.id)}
        disabled={isMyProfile}
      >
        {item.is_featured && (
          <LinearGradient
            colors={['#E8D4A8', '#C9A865']}
            style={styles.featuredBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="star" size={12} color={theme.colors.primaryDark} />
            <Text style={styles.featuredText}>Featured</Text>
          </LinearGradient>
        )}
        
        <View style={styles.cardContent}>
          <View style={styles.avatarContainer}>
            {item.media_gallery && item.media_gallery[0] ? (
              <Image
                source={{ uri: item.media_gallery[0] }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
          
          <View style={styles.artistInfo}>
            <Text style={styles.artistName}>{item.stage_name}</Text>
            <Text style={styles.artType}>{item.art_type}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="star" size={16} color={theme.colors.secondary} />
                <Text style={styles.statText}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>({item.review_count})</Text>
              </View>
              
              <View style={styles.stat}>
                <Ionicons name="mic" size={16} color={theme.colors.secondary} />
                <Text style={styles.statText}>{item.experience_gigs}</Text>
                <Text style={styles.statLabel}>gigs</Text>
              </View>
            </View>
            
            {item.locations && item.locations.length > 0 && (
              <View style={styles.locationChip}>
                <Ionicons name="location" size={12} color={theme.colors.secondary} />
                <Text style={styles.locationText}>{item.locations[0]}</Text>
                {item.locations.length > 1 && (
                  <Text style={styles.locationText}>+{item.locations.length - 1}</Text>
                )}
              </View>
            )}
            
            {item.availability && item.availability.length > 0 && (
              <View style={styles.availabilityChip}>
                <Ionicons name="calendar" size={12} color={theme.colors.success} />
                <Text style={styles.availabilityText}>Available</Text>
              </View>
            )}
          </View>
          
          {/* Show Chat button for artists viewing other artists AND partners viewing artists */}
          {(isArtist || isPartner) && !isMyProfile ? (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={(e) => {
                e.stopPropagation();
                handleChatPress(item.user_id);
              }}
            >
              <Ionicons name="chatbubbles" size={20} color="#B8A5E3" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const activeFiltersCount = [minRating, selectedLocation, selectedArtType, availableOnly].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.background]}
        style={styles.header}
      >
        <Text style={styles.title}>Artists</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or art type..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={20} color={theme.colors.white} />
          <Text style={styles.filterButtonText}>Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={filteredArtists}
        renderItem={renderArtist}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No artists found</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Artists</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filtersList}>
              {/* Rating Filter */}
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.ratingButtons}>
                {[3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      minRating === rating && styles.ratingButtonActive
                    ]}
                    onPress={() => setMinRating(minRating === rating ? null : rating)}
                  >
                    <Ionicons 
                      name="star" 
                      size={16} 
                      color={minRating === rating ? theme.colors.primaryDark : theme.colors.secondary} 
                    />
                    <Text style={[
                      styles.ratingButtonText,
                      minRating === rating && styles.ratingButtonTextActive
                    ]}>{rating}+</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Location Filter */}
              <Text style={styles.filterLabel}>Location</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationScroll}>
                {BANGALORE_LOCATIONS.map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.locationChipButton,
                      selectedLocation === location && styles.locationChipButtonActive
                    ]}
                    onPress={() => setSelectedLocation(selectedLocation === location ? null : location)}
                  >
                    <Text style={[
                      styles.locationChipButtonText,
                      selectedLocation === location && styles.locationChipButtonTextActive
                    ]}>{location}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Availability Date Filter */}
              <Text style={styles.filterLabel}>Filter by Availability Date</Text>
              <Text style={styles.filterSubLabel}>Select a date to see artists available on that day</Text>
              
              <Calendar
                markedDates={
                  selectedAvailabilityDate 
                    ? { 
                        [selectedAvailabilityDate]: { 
                          selected: true, 
                          selectedColor: theme.colors.success 
                        } 
                      }
                    : {}
                }
                onDayPress={(day) => {
                  if (selectedAvailabilityDate === day.dateString) {
                    setSelectedAvailabilityDate(null); // Deselect
                  } else {
                    setSelectedAvailabilityDate(day.dateString);
                  }
                }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: theme.colors.surface,
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.text,
                  selectedDayBackgroundColor: theme.colors.success,
                  selectedDayTextColor: theme.colors.white,
                  todayTextColor: theme.colors.secondary,
                  dayTextColor: theme.colors.text,
                  textDisabledColor: theme.colors.textSecondary,
                  monthTextColor: theme.colors.text,
                  arrowColor: theme.colors.secondary,
                }}
                style={styles.filterCalendar}
              />

              {selectedAvailabilityDate && (
                <View style={styles.selectedDateInfo}>
                  <Ionicons name="calendar" size={16} color={theme.colors.success} />
                  <Text style={styles.selectedDateText}>
                    Filtering by: {new Date(selectedAvailabilityDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Artist Pro Modal */}
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
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    paddingVertical: theme.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignSelf: 'flex-start',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  filterButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: theme.colors.secondary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  artistCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    flexDirection: 'row',
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatarContainer: {
    width: 70,
    height: 70,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInfo: {
    flex: 1,
    gap: 4,
  },
  artistName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  artType: {
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
    fontWeight: '600',
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201, 168, 101, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  locationText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  availabilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  availabilityText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  filtersList: {
    padding: theme.spacing.lg,
  },
  filterLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ratingButtonActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  ratingButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  ratingButtonTextActive: {
    color: theme.colors.primaryDark,
  },
  locationScroll: {
    marginBottom: theme.spacing.md,
  },
  locationChipButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationChipButtonActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  locationChipButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  locationChipButtonTextActive: {
    color: theme.colors.primaryDark,
  },
  filterSubLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  filterCalendar: {
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(0, 200, 100, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  selectedDateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  checkboxLabel: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  clearButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clearButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.secondary,
  },
  applyButtonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(184, 165, 227, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 165, 227, 0.3)',
  },
});
