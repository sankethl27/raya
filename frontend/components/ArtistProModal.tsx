import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { theme } from '../utils/theme';

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
          <Text style={styles.title}>Go Pro ✨</Text>
          
          <View style={styles.benefitsContainer}>
            <Text style={styles.subtitle}>Unlock unlimited profile views and chats.</Text>
            <Text style={styles.benefit}>• Collaborate freely with other artists</Text>
            <Text style={styles.benefit}>• Boost your visibility in search</Text>
            <Text style={styles.benefit}>• Grow faster on Raaya</Text>
          </View>

          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>Go Pro → ₹499/month</Text>
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
