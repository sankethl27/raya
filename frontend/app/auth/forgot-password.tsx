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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/send-otp`, {
        email: email.trim(),
        purpose: 'forgot_password',
      });

      Alert.alert(
        'OTP Sent',
        `Verification code: ${response.data.otp}`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/auth/otp-verify',
                params: {
                  email: email.trim(),
                  purpose: 'forgot_password',
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
            <Ionicons name="lock-open" size={64} color={theme.colors.secondary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a verification code to reset your password
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={theme.colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
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
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
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
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
  button: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
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
  backToLoginButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  backToLoginText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.secondary,
    textDecorationLine: 'underline',
  },
});