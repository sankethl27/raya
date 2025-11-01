import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState<'artist' | 'partner' | 'venue' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const userTypeDescriptions = {
    artist: "You're an Artist if you love performing, creating, or showcasing your talent — and want to connect with hosts, brands, or communities for gigs and collaborations.",
    partner: "You're a Partner if you run a venue, brand, or creative space — like a café, restaurant, clothing label, or beverage brand — and want to collaborate with artists or other brands to host unique events and experiences.",
    venue: "You're a Host if you're planning a private, corporate, or community event and want to hire artists to make it unforgettable.",
  };

  const handleSendOTP = async () => {
    if (!email || !password || !confirmPassword || !userType) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Send OTP first
      const response = await axios.post(`${BACKEND_URL}/api/auth/send-otp`, {
        email: email.toLowerCase().trim(),
        purpose: 'signup',
      });

      Alert.alert(
        'Verify Email',
        `OTP sent! Code: ${response.data.otp}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to OTP verify with signup data
              router.push({
                pathname: '/auth/otp-verify-signup',
                params: {
                  email: email.toLowerCase().trim(),
                  password,
                  userType,
                  otp: response.data.otp,
                },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.colors.primaryDark, theme.colors.primary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Raya today</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Select Account Type</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeCard,
                  userType === 'artist' && styles.userTypeCardSelected,
                ]}
                onPress={() => setUserType('artist')}
              >
                <Ionicons
                  name="brush"
                  size={32}
                  color={userType === 'artist' ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.userTypeText,
                    userType === 'artist' && styles.userTypeTextSelected,
                  ]}
                >
                  Artist
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeCard,
                  userType === 'partner' && styles.userTypeCardSelected,
                ]}
                onPress={() => setUserType('partner')}
              >
                <Ionicons
                  name="briefcase"
                  size={32}
                  color={userType === 'partner' ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.userTypeText,
                    userType === 'partner' && styles.userTypeTextSelected,
                  ]}
                >
                  Partner
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.userTypeCard,
                  userType === 'venue' && styles.userTypeCardSelected,
                ]}
                onPress={() => setUserType('venue')}
              >
                <Ionicons
                  name="location"
                  size={32}
                  color={userType === 'venue' ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.userTypeText,
                    userType === 'venue' && styles.userTypeTextSelected,
                  ]}
                >
                  Venue
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={theme.colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.primaryDark} />
              ) : (
                <Text style={styles.buttonText}>Continue with OTP Verification</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login')}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  form: {
    flex: 1,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  userTypeCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  userTypeCardSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  userTypeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  userTypeTextSelected: {
    color: theme.colors.secondary,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    paddingVertical: theme.spacing.md,
  },
  eyeIcon: {
    padding: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  linkText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
});
