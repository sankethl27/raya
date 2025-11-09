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
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 32,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.heading,
    color: theme.colors.gold,
    marginBottom: 24,
    textAlign: 'center',
  },
  benefitsContainer: {
    marginBottom: 32,
    width: '100%',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  benefit: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    paddingLeft: 8,
  },
  upgradeButton: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontFamily: theme.fonts.bodyBold,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
});
