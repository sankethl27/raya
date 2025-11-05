import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EditProfileScreen() {
  const { user, profile, token, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Common fields
  const [description, setDescription] = useState('');

  // Artist fields
  const [stageName, setStageName] = useState('');
  const [artType, setArtType] = useState('');
  const [experienceGigs, setExperienceGigs] = useState('');
  const [availability, setAvailability] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [pressKit, setPressKit] = useState('');

  // Partner fields
  const [brandName, setBrandName] = useState('');
  const [serviceType, setServiceType] = useState('');

  // Venue fields
  const [venueName, setVenueName] = useState('');

  // Media gallery
  const [mediaGallery, setMediaGallery] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setDescription(profile.description || '');

      if (user?.user_type === 'artist') {
        setStageName(profile.stage_name || '');
        setArtType(profile.art_type || '');
        setExperienceGigs(profile.experience_gigs?.toString() || '0');
        setAvailability(profile.availability || []);
        setLocations(profile.locations || []);
        setPressKit(profile.press_kit || '');
        setMediaGallery(profile.media_gallery || []);
      } else if (user?.user_type === 'partner') {
        setBrandName(profile.brand_name || '');
        setServiceType(profile.service_type || '');
        setMediaGallery(profile.media_gallery || []);
      } else if (user?.user_type === 'venue') {
        setVenueName(profile.venue_name || '');
      }
    }
  }, [profile, user]);

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        quality: 0.5,
        videoMaxDuration: 60, // Max 60 seconds for videos
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';
        
        if (isVideo) {
          // For videos, use URI directly (no base64 due to size)
          const videoUri = `data:video/mp4;uri,${asset.uri}`;
          setMediaGallery([...mediaGallery, videoUri]);
          Alert.alert('Success', 'Video added! (Videos are stored as references)');
        } else {
          // For images, convert to base64
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setMediaGallery([...mediaGallery, base64]);
          };
          
          reader.readAsDataURL(blob);
        }
      }
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const removeMedia = (index: number) => {
    setMediaGallery(mediaGallery.filter((_, i) => i !== index));
  };

  const addAvailabilityDay = () => {
    setAvailability([...availability, { day: 'Monday', time_slots: ['9:00 AM - 12:00 PM'] }]);
  };

  const removeAvailabilityDay = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const updateAvailabilityDay = (index: number, day: string) => {
    const updated = [...availability];
    updated[index].day = day;
    setAvailability(updated);
  };

  const addTimeSlot = (dayIndex: number) => {
    const updated = [...availability];
    updated[dayIndex].time_slots.push('12:00 PM - 3:00 PM');
    setAvailability(updated);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const updated = [...availability];
    updated[dayIndex].time_slots = updated[dayIndex].time_slots.filter((_: any, i: number) => i !== slotIndex);
    setAvailability(updated);
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, value: string) => {
    const updated = [...availability];
    updated[dayIndex].time_slots[slotIndex] = value;
    setAvailability(updated);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let updates: any = { description };
      let method: 'put' | 'post' = 'put';

      // Check if creating new profile or updating
      const isNewProfile = !profile || !profile.id;

      if (user?.user_type === 'artist') {
        if (isNewProfile) {
          // Create new artist profile
          endpoint = `/api/artists`;
          method = 'post';
          updates = {
            user_id: user.id,
            stage_name: stageName || 'Artist',
            art_type: artType || 'General',
            description,
            experience_gigs: parseInt(experienceGigs) || 0,
            availability,
            locations,
            press_kit: pressKit,
            media_gallery: mediaGallery,
            rating: 0,
            review_count: 0,
          };
        } else {
          // Update existing profile
          endpoint = `/api/artists/${profile.id}`;
          updates = {
            ...updates,
            stage_name: stageName,
            art_type: artType,
            experience_gigs: parseInt(experienceGigs) || 0,
            availability,
            locations,
            press_kit: pressKit,
            media_gallery: mediaGallery,
          };
        }
      } else if (user?.user_type === 'partner') {
        if (isNewProfile) {
          // Create new partner profile
          endpoint = `/api/partners`;
          method = 'post';
          updates = {
            user_id: user.id,
            brand_name: brandName || 'Brand',
            service_type: serviceType || 'General',
            description,
            media_gallery: mediaGallery,
            rating: 0,
            review_count: 0,
          };
        } else {
          // Update existing profile
          endpoint = `/api/partners/${profile.id}`;
          updates = {
            ...updates,
            brand_name: brandName,
            service_type: serviceType,
            media_gallery: mediaGallery,
          };
        }
      } else if (user?.user_type === 'venue') {
        if (isNewProfile) {
          endpoint = `/api/venues`;
          method = 'post';
          updates = {
            user_id: user.id,
            venue_name: venueName || 'Venue',
            description,
          };
        } else {
          endpoint = `/api/venues/${profile.id}`;
          updates = {
            ...updates,
            venue_name: venueName,
          };
        }
      }

      // Use appropriate HTTP method
      if (method === 'post') {
        await axios.post(`${BACKEND_URL}${endpoint}`, updates, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${BACKEND_URL}${endpoint}`, updates, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      await refreshProfile();
      Alert.alert('Success', isNewProfile ? 'Profile created successfully!' : 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.title}>Edit Profile</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {user?.user_type === 'artist' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Stage Name</Text>
                <TextInput
                  style={styles.input}
                  value={stageName}
                  onChangeText={setStageName}
                  placeholder="Your stage name"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Art Type</Text>
                <TextInput
                  style={styles.input}
                  value={artType}
                  onChangeText={setArtType}
                  placeholder="E.g., Music - Jazz, Pottery, Calligraphy"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Experience (Number of Gigs)</Text>
                <TextInput
                  style={styles.input}
                  value={experienceGigs}
                  onChangeText={setExperienceGigs}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell venues about yourself..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              {/* AVAILABILITY SECTION */}
              <View style={styles.availabilitySection}>
                <View style={styles.availabilityHeader}>
                  <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
                  <Text style={styles.availabilityTitle}>Availability Schedule</Text>
                </View>

                {availability.map((slot, dayIndex) => (
                  <View key={dayIndex} style={styles.availabilityCard}>
                    <View style={styles.dayRow}>
                      <View style={styles.daySelectContainer}>
                        <TouchableOpacity
                          style={styles.dayButton}
                          onPress={() => {
                            const currentIndex = DAYS_OF_WEEK.indexOf(slot.day);
                            const nextIndex = (currentIndex + 1) % DAYS_OF_WEEK.length;
                            updateAvailabilityDay(dayIndex, DAYS_OF_WEEK[nextIndex]);
                          }}
                        >
                          <Text style={styles.dayButtonText}>{slot.day}</Text>
                          <Ionicons name="chevron-down" size={16} color={theme.colors.secondary} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeAvailabilityDay(dayIndex)}
                      >
                        <Ionicons name="trash" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timeSlotsContainer}>
                      {slot.time_slots.map((timeSlot: string, slotIndex: number) => (
                        <View key={slotIndex} style={styles.timeSlotRow}>
                          <TextInput
                            style={styles.timeSlotInput}
                            value={timeSlot}
                            onChangeText={(value) => updateTimeSlot(dayIndex, slotIndex, value)}
                            placeholder="E.g., 9:00 AM - 12:00 PM"
                            placeholderTextColor={theme.colors.textSecondary}
                            editable={!loading}
                          />
                          <TouchableOpacity
                            style={styles.removeSlotButton}
                            onPress={() => removeTimeSlot(dayIndex, slotIndex)}
                          >
                            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={styles.addSlotButton}
                        onPress={() => addTimeSlot(dayIndex)}
                      >
                        <Ionicons name="add-circle" size={20} color={theme.colors.secondary} />
                        <Text style={styles.addSlotText}>Add Time Slot</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addDayButton}
                  onPress={addAvailabilityDay}
                >
                  <Ionicons name="add-circle" size={24} color={theme.colors.secondary} />
                  <Text style={styles.addDayText}>Add Available Day</Text>
                </TouchableOpacity>
              </View>
              
              {/* LOCATIONS SECTION */}
              <View style={styles.locationsSection}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={24} color={theme.colors.secondary} />
                  <Text style={styles.sectionTitle}>Performance Locations</Text>
                </View>
                <Text style={styles.locationSubtitle}>Select areas where you can perform</Text>
                
                <View style={styles.locationsGrid}>
                  {['Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'HSR Layout', 'BTM Layout', 'Marathahalli', 'Jayanagar', 'Malleshwaram', 'Rajajinagar', 'JP Nagar', 'Banashankari', 'Yelahanka', 'Hebbal', 'MG Road', 'Brigade Road', 'Bellandur', 'Sarjapur Road'].map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.locationChip,
                        locations.includes(location) && styles.locationChipActive
                      ]}
                      onPress={() => {
                        if (locations.includes(location)) {
                          setLocations(locations.filter(l => l !== location));
                        } else {
                          setLocations([...locations, location]);
                        }
                      }}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.locationChipText,
                        locations.includes(location) && styles.locationChipTextActive
                      ]}>{location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* PRESS KIT SECTION */}
              <View style={styles.inputGroup}>
                <View style={styles.pressKitHeader}>
                  <Ionicons name="document-text" size={24} color={theme.colors.secondary} />
                  <Text style={styles.label}>Press Kit URL (Optional)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={pressKit}
                  onChangeText={setPressKit}
                  placeholder="https://yourwebsite.com/press-kit"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <Text style={styles.helperText}>Link to your press kit, portfolio, or EPK</Text>
              </View>
              
              {/* MEDIA GALLERY SECTION */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaHeader}>
                  <Ionicons name="images" size={24} color={theme.colors.secondary} />
                  <Text style={styles.label}>Photos & Videos</Text>
                </View>
                <Text style={styles.helperText}>Upload images and videos (max 10)</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaGallery}>
                  {mediaGallery.map((media, index) => {
                    const isVideo = media.includes('data:video') || media.includes('.mp4') || media.includes('.mov') || media.includes(';uri,');
                    
                    return (
                      <View key={index} style={styles.mediaItem}>
                        {isVideo ? (
                          <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={48} color={theme.colors.secondary} />
                            <Text style={styles.videoLabel}>Video {index + 1}</Text>
                            <Text style={styles.videoSubLabel}>Tap to play</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: media }} style={styles.mediaImage} />
                        )}
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => removeMedia(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  
                  {mediaGallery.length < 10 && (
                    <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia} disabled={loading}>
                      <Ionicons name="add-circle" size={48} color={theme.colors.secondary} />
                      <Text style={styles.addMediaText}>Add Photo/Video</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </>
          )}

          {user?.user_type === 'partner' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand Name</Text>
                <TextInput
                  style={styles.input}
                  value={brandName}
                  onChangeText={setBrandName}
                  placeholder="Your brand name"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Type</Text>
                <TextInput
                  style={styles.input}
                  value={serviceType}
                  onChangeText={setServiceType}
                  placeholder="E.g., Premium Beverages, Book Launch"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your services..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              {/* MEDIA GALLERY SECTION */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaHeader}>
                  <Ionicons name="images" size={24} color={theme.colors.secondary} />
                  <Text style={styles.label}>Photos & Videos</Text>
                </View>
                <Text style={styles.helperText}>Upload images and videos (max 10)</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaGallery}>
                  {mediaGallery.map((media, index) => {
                    const isVideo = media.includes('data:video') || media.includes('.mp4') || media.includes('.mov') || media.includes(';uri,');
                    
                    return (
                      <View key={index} style={styles.mediaItem}>
                        {isVideo ? (
                          <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={48} color={theme.colors.secondary} />
                            <Text style={styles.videoLabel}>Video {index + 1}</Text>
                            <Text style={styles.videoSubLabel}>Tap to play</Text>
                          </View>
                        ) : (
                          <Image source={{ uri: media }} style={styles.mediaImage} />
                        )}
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => removeMedia(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  
                  {mediaGallery.length < 10 && (
                    <TouchableOpacity style={styles.addMediaButton} onPress={pickMedia} disabled={loading}>
                      <Ionicons name="add-circle" size={48} color={theme.colors.secondary} />
                      <Text style={styles.addMediaText}>Add Photo/Video</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </>
          )}

          {user?.user_type === 'venue' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Venue Name</Text>
                <TextInput
                  style={styles.input}
                  value={venueName}
                  onChangeText={setVenueName}
                  placeholder="Your venue name"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your venue..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
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
  title: {
    flex: 1,
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  textArea: {
    height: 100,
    paddingTop: theme.spacing.md,
  },
  availabilitySection: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.xxl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  availabilityTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.secondary,
  },
  availabilityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  daySelectContainer: {
    flex: 1,
  },
  dayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  dayButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  removeButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  timeSlotsContainer: {
    gap: theme.spacing.sm,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeSlotInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  removeSlotButton: {
    padding: theme.spacing.xs,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  addSlotText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderStyle: 'dashed',
  },
  addDayText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  locationsSection: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  locationSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  locationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  locationChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locationChipActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  locationChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    fontWeight: '600',
  },
  locationChipTextActive: {
    color: theme.colors.primaryDark,
  },
  pressKitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  helperText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  videoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderStyle: 'dashed',
  },
  videoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  saveButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.gold,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  mediaSection: {
    marginBottom: theme.spacing.lg,
  },
  mediaGallery: {
    flexDirection: 'row',
  },
  mediaItem: {
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceLight,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  addMediaButton: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  addMediaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  videoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  videoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.white,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  videoSubLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '400',
    marginTop: theme.spacing.xs / 2,
  },
});
