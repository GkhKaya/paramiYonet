import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { SecurityService } from '../services/FirebaseService';
import { isWeb } from '../utils/platform';

interface SecurityScreenProps {
  navigation: any;
}

const SecurityScreen: React.FC<SecurityScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  
  // Şifre değiştirme state'leri
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // E-posta değiştirme state'leri
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  
  // Form görünürlük state'leri
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsChangingPassword(true);
    try {
      await SecurityService.changePassword(currentPassword, newPassword);
      
      // Form'u temizle ve kapat
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Şifre değiştirilemedi');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newEmail === user?.email) {
      Alert.alert('Hata', 'Yeni e-posta adresi mevcut adresle aynı');
      return;
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin');
      return;
    }

    setIsChangingEmail(true);
    try {
      await SecurityService.changeEmail(newEmail, emailPassword);
      
      // Form'u temizle ve kapat
      setNewEmail('');
      setEmailPassword('');
      setShowEmailForm(false);
      
      Alert.alert('Başarılı', 'E-posta adresiniz başarıyla değiştirildi');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'E-posta adresi değiştirilemedi');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      Alert.alert('Hata', 'E-posta adresi bulunamadı');
      return;
    }

    try {
      await SecurityService.sendPasswordResetEmail(user.email);
      Alert.alert(
        'E-posta Gönderildi', 
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi'
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'E-posta gönderilemedi');
    }
  };

  const SecurityCard = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    children 
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress?: () => void;
    children?: React.ReactNode;
  }) => (
    <Card style={styles.securityCard}>
      <TouchableOpacity 
        style={styles.securityHeader} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.securityIcon}>
          <Ionicons name={icon as any} size={24} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        </View>
        {onPress && (
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={COLORS.TEXT_SECONDARY} 
          />
        )}
      </TouchableOpacity>
      {children}
    </Card>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Güvenlik Ayarları</Text>
        <Text style={styles.pageSubtitle}>
          Hesap güvenliğinizi yönetin ve şifrelerinizi güncelleyin
        </Text>

        {/* Şifre Değiştirme */}
        <SecurityCard
          icon="lock-closed"
          title="Şifre Değiştir"
          subtitle="Hesabınızın şifresini güncelleyin"
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        >
          {showPasswordForm && (
            <View style={styles.formContainer}>
              <Input
                label="Mevcut Şifre"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Mevcut şifrenizi girin"
                autoCapitalize="none"
              />
              <Input
                label="Yeni Şifre"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi girin"
                autoCapitalize="none"
              />
              <Input
                label="Yeni Şifre (Tekrar)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi tekrar girin"
                autoCapitalize="none"
              />
              <View style={styles.buttonContainer}>
                <Button
                  title="İptal"
                  onPress={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title={isChangingPassword ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                  style={styles.actionButton}
                />
              </View>
            </View>
          )}
        </SecurityCard>

        {/* E-posta Değiştirme */}
        <SecurityCard
          icon="mail"
          title="E-posta Adresi Değiştir"
          subtitle={`Mevcut: ${user?.email || 'Bilinmiyor'}`}
          onPress={() => setShowEmailForm(!showEmailForm)}
        >
          {showEmailForm && (
            <View style={styles.formContainer}>
              <Input
                label="Yeni E-posta Adresi"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Yeni e-posta adresinizi girin"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Şifre Onayı"
                value={emailPassword}
                onChangeText={setEmailPassword}
                secureTextEntry
                placeholder="Mevcut şifrenizi girin"
                autoCapitalize="none"
              />
              <View style={styles.buttonContainer}>
                <Button
                  title="İptal"
                  onPress={() => {
                    setShowEmailForm(false);
                    setNewEmail('');
                    setEmailPassword('');
                  }}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title={isChangingEmail ? "Değiştiriliyor..." : "E-posta Değiştir"}
                  onPress={handleChangeEmail}
                  disabled={isChangingEmail}
                  style={styles.actionButton}
                />
              </View>
            </View>
          )}
        </SecurityCard>

        {/* Şifre Sıfırlama */}
        <SecurityCard
          icon="refresh"
          title="Şifre Sıfırlama Linki Gönder"
          subtitle="E-posta ile şifre sıfırlama bağlantısı alın"
        >
          <View style={styles.formContainer}>
            <Text style={styles.resetDescription}>
              E-posta adresinize şifre sıfırlama bağlantısı gönderilecek.
            </Text>
            <Button
              title="Sıfırlama Linki Gönder"
              onPress={handleSendPasswordReset}
              variant="outline"
              style={styles.resetButton}
            />
          </View>
        </SecurityCard>
      </View>
    </ScrollView>
  );

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Güvenlik" activeRoute="settings" navigation={navigation}>
        {renderContent()}
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Güvenlik</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  pageSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.lg,
  },
  securityCard: {
    marginBottom: SPACING.md,
    padding: 0,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  securitySubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  formContainer: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  actionButton: {
    flex: 2,
  },
  resetButton: {
    marginTop: SPACING.sm,
  },
  resetDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});

export default SecurityScreen; 