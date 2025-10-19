import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SubscriptionPopupProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (type: 'monthly' | 'pay_per_view') => void;
}

export default function SubscriptionPopup({ visible, onClose, onSubscribe }: SubscriptionPopupProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryLight]}
            style={styles.gradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color={theme.colors.secondary} />
            </View>

            <Text style={styles.title}>Free Trial Ended</Text>
            <Text style={styles.subtitle}>You've used all 10 free profile views</Text>

            <View style={styles.optionsContainer}>
              {/* Monthly Subscription */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => onSubscribe('monthly')}
              >
                <LinearGradient
                  colors={[theme.colors.secondary, theme.colors.secondaryDark]}
                  style={styles.optionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>BEST VALUE</Text>
                  </View>
                  <Text style={styles.optionPrice}>₹499</Text>
                  <Text style={styles.optionPeriod}>per month</Text>
                  <Text style={styles.optionFeature}>Unlimited Access</Text>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.featureText}>View all profiles</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.featureText}>Unlimited chats</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryDark} />
                      <Text style={styles.featureText}>Priority support</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Pay Per View */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => onSubscribe('pay_per_view')}
              >
                <View style={styles.optionBorder}>
                  <Text style={styles.optionPrice2}>₹99</Text>
                  <Text style={styles.optionPeriod2}>one-time</Text>
                  <Text style={styles.optionFeature2}>10 More Views</Text>
                  <Text style={styles.optionDesc}>Perfect for occasional use</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: theme.borderRadius.xxl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  gradient: {
    padding: theme.spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
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
  },
  optionsContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  option: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  optionGradient: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.secondary,
    letterSpacing: 1,
  },
  optionPrice: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
    marginTop: theme.spacing.sm,
  },
  optionPeriod: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.md,
    opacity: 0.8,
  },
  optionFeature: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.sm,
  },
  featuresList: {
    gap: theme.spacing.xs,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primaryDark,
  },
  optionBorder: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  optionPrice2: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  optionPeriod2: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  optionFeature2: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
  },
  optionDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
