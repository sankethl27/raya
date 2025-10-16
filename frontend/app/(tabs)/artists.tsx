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
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme, BANGALORE_LOCATIONS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ArtistsScreen() {
  const [artists, setArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedArtType, setSelectedArtType] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, artists, minRating, selectedLocation, selectedArtType, availableOnly]);

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
    
    // Availability filter
    if (availableOnly) {
      filtered = filtered.filter((artist: any) => 
        artist.availability && artist.availability.length > 0
      );
    }
    
    setFilteredArtists(filtered);
  };

  const clearFilters = () => {
    setMinRating(null);
    setSelectedLocation(null);
    setSelectedArtType(null);
    setAvailableOnly(false);
    setSearchQuery('');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchArtists();
    setRefreshing(false);
  };

  const renderArtist = ({ item }: any) => (
    <TouchableOpacity
      style={styles.artistCard}
      onPress={() => router.push(`/artist/${item.id}`)}
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
        
        <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

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
              
              {/* Availability Filter */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAvailableOnly(!availableOnly)}
              >
                <View style={[styles.checkbox, availableOnly && styles.checkboxActive]}>
                  {availableOnly && <Ionicons name="checkmark" size={18} color={theme.colors.primaryDark} />}
                </View>
                <Text style={styles.checkboxLabel}>Show only available artists</Text>
              </TouchableOpacity>
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
});
