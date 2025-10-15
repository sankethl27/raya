import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  // Logo animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Tagline animations
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;

  // Button animations
  const button1Scale = useRef(new Animated.Value(0.9)).current;
  const button1Opacity = useRef(new Animated.Value(0)).current;
  const button2Scale = useRef(new Animated.Value(0.9)).current;
  const button2Opacity = useRef(new Animated.Value(0)).current;

  // Features animations
  const feature1Opacity = useRef(new Animated.Value(0)).current;
  const feature1TranslateX = useRef(new Animated.Value(-30)).current;
  const feature2Opacity = useRef(new Animated.Value(0)).current;
  const feature2TranslateX = useRef(new Animated.Value(-30)).current;
  const feature3Opacity = useRef(new Animated.Value(0)).current;
  const feature3TranslateX = useRef(new Animated.Value(-30)).current;

  // Sparkle animations
  const sparkle1Rotate = useRef(new Animated.Value(0)).current;
  const sparkle2Rotate = useRef(new Animated.Value(0)).current;
  const sparkle1Scale = useRef(new Animated.Value(1)).current;
  const sparkle2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(taglineTranslateY, {
          toValue: 0,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Buttons entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(button1Scale, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(button1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(button2Scale, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(button2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 750);

    // Features staggered entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(feature1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(feature1TranslateX, {
          toValue: 0,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(feature2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(feature2TranslateX, {
          toValue: 0,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1050);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(feature3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(feature3TranslateX, {
          toValue: 0,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);

    // Sparkle animations
    Animated.loop(
      Animated.timing(sparkle1Rotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(sparkle2Rotate, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle1Scale, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle1Scale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle2Scale, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle2Scale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const sparkle1Spin = sparkle1Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkle2Spin = sparkle2Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const handleButtonPress = (buttonScale: Animated.Value, action: () => void) => {
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.92,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(action, 150);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.primaryLight]}
        style={styles.gradient}
      >
        {/* Floating sparkles */}
        <Animated.View style={[styles.sparkle1, {
          transform: [
            { rotate: sparkle1Spin },
            { scale: sparkle1Scale },
          ],
        }]}>
          <Ionicons name="sparkles" size={32} color={theme.colors.secondary} />
        </Animated.View>
        <Animated.View style={[styles.sparkle2, {
          transform: [
            { rotate: sparkle2Spin },
            { scale: sparkle2Scale },
          ],
        }]}>
          <Ionicons name="sparkles" size={24} color={theme.colors.secondaryLight} />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Animated.View style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}>
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_artist-hub-37/artifacts/qrt5xp0r_ChatGPT%20Image%20Oct%2016%2C%202025%2C%2001_42_14%20AM.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text style={[styles.tagline, {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            }]}>
              One platform. Endless connections.
            </Animated.Text>
          </View>

          <View style={styles.buttonContainer}>
            <Animated.View style={{
              transform: [{ scale: button1Scale }],
              opacity: button1Opacity,
            }}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
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
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{
              transform: [{ scale: button2Scale }],
              opacity: button2Opacity,
            }}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
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
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.featuresContainer}>
            <Animated.View style={[styles.feature, {
              opacity: feature1Opacity,
              transform: [{ translateX: feature1TranslateX }],
            }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="people" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.featureText}>Connect with Artists</Text>
            </Animated.View>
            <Animated.View style={[styles.feature, {
              opacity: feature2Opacity,
              transform: [{ translateX: feature2TranslateX }],
            }]}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="business" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.featureText}>Partner with Brands</Text>
            </Animated.View>
            <Animated.View style={[styles.feature, {
              opacity: feature3Opacity,
              transform: [{ translateX: feature3TranslateX }],
            }]}>
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
