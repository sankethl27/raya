import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function OTPVerifySignupScreen() {
  const router = useRouter();
  const { email, password, userType, otp: receivedOtp } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleVerifyAndRegister = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify OTP
      await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, {
        email,
        otp,
      });

      // Step 2: Create account after OTP verification
      await register(
        String(email).toLowerCase().trim(),
        String(password),
        userType as 'artist' | 'partner' | 'venue',
        {}
      );

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ]);
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert('Error', 'Invalid or expired OTP');
      } else {
        Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/send-otp`, {
        email,
        purpose: 'signup',
      });
      Alert.alert('OTP Resent', `New OTP: ${response.data.otp}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary]}
        style={styles.gradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.white} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color={theme.colors.secondary} />
          </View>

          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
          <Text style={styles.email}>{email}</Text>

          {receivedOtp && (
            <View style={styles.testOtpContainer}>
              <Text style={styles.testOtpLabel}>Test OTP:</Text>
              <Text style={styles.testOtp}>{receivedOtp}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="000000"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyAndRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryDark} />
            ) : (
              <Text style={styles.buttonText}>Verify & Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text style={styles.resendText}>Didn't receive code? Resend</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: theme.spacing.xl,
  },
  testOtpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  testOtpLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
  },
  testOtp: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.secondary,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    fontSize: theme.fontSize.xxxl,
    color: theme.colors.white,
    textAlign: 'center',
    letterSpacing: 12,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  button: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  resendButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  resendText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    textDecorationLine: 'underline',
  },
});
