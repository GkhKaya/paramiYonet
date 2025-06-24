import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { SecurityService } from '../services/FirebaseService';
import { isWeb } from '../utils/platform';

interface SecurityScreenProps {
  navigation: any;
}

const SecurityScreen: React.FC<SecurityScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { showError } = useError();
  
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
      showError('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Yeni şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      showError('Yeni şifre en az 6 karakter olmalıdır');
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
      
      showError('Şifreniz başarıyla değiştirildi', 'success');
    } catch (error: any) {
      showError(error.message || 'Şifre değiştirilemedi');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      showError('Lütfen tüm alanları doldurun');
      return;
    }

    if (newEmail === user?.email) {
      showError('Yeni e-posta adresi mevcut adresle aynı');
      return;
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showError('Geçerli bir e-posta adresi girin');
      return;
    }

    setIsChangingEmail(true);
    try {
      await SecurityService.changeEmail(newEmail, emailPassword);
      
      // Form'u temizle ve kapat
      setNewEmail('');
      setEmailPassword('');
      setShowEmailForm(false);
      
      showError('E-posta adresiniz başarıyla değiştirildi', 'success');
    } catch (error: any) {
      showError(error.message || 'E-posta adresi değiştirilemedi');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      showError('E-posta adresi bulunamadı');
      return;
    }

    try {
      await SecurityService.sendPasswordResetEmail(user.email);
      showError('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi', 'info');
    } catch (error: any) {
      showError(error.message || 'E-posta gönderilemedi');
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
    <View style={[styles.securityCard, Platform.OS === 'web' && styles.webSecurityCard]}>
      <TouchableOpacity 
        style={styles.securityHeader} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.securityIcon}>
          <Ionicons name={icon as any} size={24} color="#2196F3" />
        </View>
        <View style={styles.securityInfo}>
          <Text style={styles.securityTitle}>{title}</Text>
          <Text style={styles.securitySubtitle}>{subtitle}</Text>
        </View>
        {onPress && (
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color="#666666" 
          />
        )}
      </TouchableOpacity>
      {children}
    </View>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView}>
      <View style={[styles.contentContainer, Platform.OS === 'web' && styles.webContentContainer]}>
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
            <View style={[styles.formContainer, Platform.OS === 'web' && styles.webFormContainer]}>
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
            <View style={[styles.formContainer, Platform.OS === 'web' && styles.webFormContainer]}>
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
          <View style={[styles.formContainer, Platform.OS === 'web' && styles.webFormContainer]}>
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
        <View style={styles.webContainer}>
          {renderContent()}
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Güvenlik</Text>
        </View>
        {renderContent()}
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },
  contentContainer: {
    flex: 1,
  },
  webContentContainer: {
    backgroundColor: 'transparent', // Web'de transparent arka plan
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 4,
    marginTop: 16,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 24,
  },
  securityCard: {
    marginBottom: 16,
    padding: 0,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  webSecurityCard: {
    backgroundColor: '#2C2C2E', // Web'de gri kart arka planı
    borderColor: '#38383A',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F320',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  securitySubtitle: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  formContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  webFormContainer: {
    borderTopColor: '#38383A', // Web'de gri kenarlık
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  actionButton: {
    flex: 2,
  },
  resetButton: {
    marginTop: 12,
  },
  resetDescription: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 12,
    textAlign: 'center',
  },
});

export default SecurityScreen; 