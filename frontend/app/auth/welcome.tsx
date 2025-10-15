import React, { useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function WelcomeScreen() {
  const router = useRouter();

  // Logo animation
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  // Tagline animation
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);

  // Button animations
  const button1Scale = useSharedValue(0.9);
  const button1Opacity = useSharedValue(0);
  const button2Scale = useSharedValue(0.9);
  const button2Opacity = useSharedValue(0);

  // Features animation
  const feature1Opacity = useSharedValue(0);
  const feature1TranslateX = useSharedValue(-30);
  const feature2Opacity = useSharedValue(0);
  const feature2TranslateX = useSharedValue(-30);
  const feature3Opacity = useSharedValue(0);
  const feature3TranslateX = useSharedValue(-30);

  // Sparkle animations
  const sparkle1Rotate = useSharedValue(0);
  const sparkle2Rotate = useSharedValue(0);
  const sparkle1Scale = useSharedValue(1);
  const sparkle2Scale = useSharedValue(1);

  useEffect(() => {
    // Logo entrance
    logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Tagline entrance
    setTimeout(() => {
      taglineOpacity.value = withTiming(1, { duration: 500 });
      taglineTranslateY.value = withSpring(0, { damping: 10 });
    }, 300);

    // Buttons entrance
    setTimeout(() => {
      button1Scale.value = withSpring(1, { damping: 8 });
      button1Opacity.value = withTiming(1, { duration: 400 });
    }, 600);

    setTimeout(() => {
      button2Scale.value = withSpring(1, { damping: 8 });
      button2Opacity.value = withTiming(1, { duration: 400 });
    }, 750);

    // Features staggered entrance
    setTimeout(() => {
      feature1Opacity.value = withTiming(1, { duration: 400 });
      feature1TranslateX.value = withSpring(0, { damping: 10 });
    }, 900);

    setTimeout(() => {
      feature2Opacity.value = withTiming(1, { duration: 400 });
      feature2TranslateX.value = withSpring(0, { damping: 10 });
    }, 1050);

    setTimeout(() => {
      feature3Opacity.value = withTiming(1, { duration: 400 });
      feature3TranslateX.value = withSpring(0, { damping: 10 });
    }, 1200);

    // Sparkle animations
    sparkle1Rotate.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1
    );
    sparkle2Rotate.value = withRepeat(
      withTiming(-360, { duration: 4000, easing: Easing.linear }),
      -1
    );
    sparkle1Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1
    );
    sparkle2Scale.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const button1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: button1Scale.value }],
    opacity: button1Opacity.value,
  }));

  const button2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: button2Scale.value }],
    opacity: button2Opacity.value,
  }));

  const feature1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: feature1Opacity.value,
    transform: [{ translateX: feature1TranslateX.value }],
  }));

  const feature2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: feature2Opacity.value,
    transform: [{ translateX: feature2TranslateX.value }],
  }));

  const feature3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: feature3Opacity.value,
    transform: [{ translateX: feature3TranslateX.value }],
  }));

  const sparkle1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sparkle1Rotate.value}deg` },
      { scale: sparkle1Scale.value },
    ],
  }));

  const sparkle2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sparkle2Rotate.value}deg` },
      { scale: sparkle2Scale.value },
    ],
  }));

  const handleButtonPress = (scale: Animated.SharedValue<number>, action: () => void) => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
    setTimeout(action, 150);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.primaryLight]}
        style={styles.gradient}
      >
        {/* Floating sparkles */}
        <Animated.View style={[styles.sparkle1, sparkle1AnimatedStyle]}>
          <Ionicons name="sparkles" size={32} color={theme.colors.secondary} />
        </Animated.View>
        <Animated.View style={[styles.sparkle2, sparkle2AnimatedStyle]}>
          <Ionicons name="sparkles" size={24} color={theme.colors.secondaryLight} />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Animated.View style={logoAnimatedStyle}>
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_artist-hub-37/artifacts/qrt5xp0r_ChatGPT%20Image%20Oct%2016%2C%202025%2C%2001_42_14%20AM.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
              One platform. Endless connections.
            </Animated.Text>
          </View>

          <View style={styles.buttonContainer}>
            <AnimatedTouchableOpacity
              style={[styles.button, styles.primaryButton, button1AnimatedStyle]}
              onPress={() => handleButtonPress(button1Scale, () => router.push('/auth/login'))}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.colors.secondaryLight, theme.colors.secondary]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.button, styles.secondaryButton, button2AnimatedStyle]}
              onPress={() => handleButtonPress(button2Scale, () => router.push('/auth/register'))}
              activeOpacity={0.9}
            >
              <View style={styles.sparkleButtonBorder}>
                <LinearGradient
                  colors={[theme.colors.secondaryLight, theme.colors.secondary, theme.colors.secondaryDark]}
                  style={styles.borderGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.innerButton}>
                    <Text style={styles.secondaryButtonText}>Create Account</Text>
                    <Ionicons name="sparkles" size={16} color={theme.colors.secondary} />
                  </View>
                </LinearGradient>
              </View>
            </AnimatedTouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <Animated.View style={[styles.feature, feature1AnimatedStyle]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="people" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.featureText}>Connect with Artists</Text>
            </Animated.View>
            <Animated.View style={[styles.feature, feature2AnimatedStyle]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="business" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.featureText}>Partner with Brands</Text>
            </Animated.View>
            <Animated.View style={[styles.feature, feature3AnimatedStyle]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="location" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.featureText}>Discover Venues</Text>
            </Animated.View>
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
  sparkle1: {
    position: 'absolute',
    top: 80,
    right: 40,
    opacity: 0.6,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 180,
    left: 30,
    opacity: 0.5,
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
    width: 280,
    height: 200,
    marginBottom: theme.spacing.lg,
  },
  tagline: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.white,
    textAlign: 'center',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
  button: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  buttonGradient: {
    paddingVertical: theme.spacing.md + 4,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // No need for backgroundColor, using gradient
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  sparkleButtonBorder: {
    borderRadius: theme.borderRadius.xl,
  },
  borderGradient: {
    padding: 3, // Border width
    borderRadius: theme.borderRadius.xl,
  },
  innerButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl - 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  featuresContainer: {
    gap: theme.spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
});
