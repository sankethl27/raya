import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.primaryLight]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_artist-hub-37/artifacts/nm0jan68_ChatGPT%20Image%20Oct%2015%2C%202025%2C%2010_51_19%20PM.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>One platform. Endless connections.</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Ionicons name="people" size={24} color={theme.colors.secondary} />
              <Text style={styles.featureText}>Connect with Artists</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="business" size={24} color={theme.colors.secondary} />
              <Text style={styles.featureText}>Partner with Brands</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="location" size={24} color={theme.colors.secondary} />
              <Text style={styles.featureText}>Discover Venues</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl * 2,
    paddingBottom: theme.spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  logoImage: {
    width: 250,
    height: 180,
    marginBottom: theme.spacing.lg,
  },
  tagline: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  primaryButtonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  featuresContainer: {
    gap: theme.spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
  },
});
