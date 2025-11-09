import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { theme } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ArtistProModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export const ArtistProModal: React.FC<ArtistProModalProps> = ({
  visible,
  onClose,
  onUpgrade,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <LinearGradient
            colors={[theme.colors.secondary, '#C9A865', theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Ionicons name="star" size={48} color={theme.colors.primaryDark} />
            <Text style={styles.title}>Upgrade to Pro ✨</Text>
            <Text style={styles.subtitle}>Unlock unlimited opportunities</Text>
          </LinearGradient>

          <ScrollView style={styles.benefitsContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.benefitsTitle}>What You Get:</Text>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="star-outline" size={24} color={theme.colors.secondary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Featured Visibility</Text>
                <Text style={styles.benefitDescription}>
                  Stand out with priority placement in search results
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="eye-outline" size={24} color={theme.colors.secondary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Unlimited Profile Views</Text>
                <Text style={styles.benefitDescription}>
                  View as many profiles as you want without restrictions
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.secondary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Unlimited Chat Options</Text>
                <Text style={styles.benefitDescription}>
                  Connect with unlimited artists, partners, and venues
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name="trending-up-outline" size={24} color={theme.colors.secondary} />
              </View>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Increased Visibility</Text>
                <Text style={styles.benefitDescription}>
                  Get discovered faster across the entire platform
                </Text>
              </View>
            </View>

            <View style={styles.pricingCard}>
              <Text style={styles.pricingAmount}>₹499</Text>
              <Text style={styles.pricingPeriod}>per month</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <LinearGradient
              colors={[theme.colors.secondary, '#C9A865']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButtonGradient}
            >
              <Ionicons name="flash" size={24} color={theme.colors.primaryDark} />
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 14, 39, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    width: width * 0.9,
    maxWidth: 420,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  headerGradient: {
    padding: 32,
    alignItems: 'center',
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.heading,
    color: theme.colors.primaryDark,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.primaryDark,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  benefitsContainer: {
    padding: 24,
  },
  benefitsTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.heading,
    color: theme.colors.text,
    marginBottom: 20,
    fontWeight: '600',
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  benefitIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: '600',
  },
  benefitDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  pricingCard: {
    backgroundColor: theme.colors.background,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  pricingAmount: {
    fontSize: 48,
    fontFamily: theme.fonts.heading,
    color: theme.colors.secondary,
    fontWeight: '700',
  },
  pricingPeriod: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  upgradeButton: {
    margin: 24,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  upgradeButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 20,
    fontFamily: theme.fonts.bodyBold,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
});
