import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/ui';

const { width } = Dimensions.get('window');

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (email: string) => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ visible, onClose, onConfirm }) => {
  const [email, setEmail] = useState('');

  const handleConfirm = () => {
    onConfirm(email);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.iconContainer, { backgroundColor: COLORS.PRIMARY + '20' }]}>
            <Ionicons 
              name="key-outline"
              size={32} 
              color={COLORS.PRIMARY} 
            />
          </View>

          <Text style={styles.title}>Şifreni mi unuttun?</Text>
          <Text style={styles.message}>
            Hesabına kayıtlı e-posta adresini gir. Sana şifre sıfırlama talimatlarını göndereceğiz.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="E-posta adresin"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>İptal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleConfirm}
              disabled={!email}
            >
              <Text style={styles.primaryButtonText}>Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    width: width - (SPACING.lg * 2),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: 'white',
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
});

export default ForgotPasswordModal; 