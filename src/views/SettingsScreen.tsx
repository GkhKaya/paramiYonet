import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuth();

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
        )}
      </View>
    </TouchableOpacity>
  );

  const SettingSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );

  const handleProfileEdit = () => {
    Alert.alert('Profil Düzenle', 'Profil düzenleme özelliği yakında gelecek');
  };

  const handleCurrencyChange = () => {
    Alert.alert('Para Birimi', 'Para birimi değiştirme özelliği yakında gelecek');
  };

  const handleBackup = () => {
    Alert.alert('Yedekleme', 'Verileriniz yedekleniyor...', [
      { text: 'Tamam', onPress: () => console.log('Backup started') }
    ]);
  };

  const handleExportData = () => {
    Alert.alert('Veri Dışa Aktarma', 'Verileriniz dışa aktarılıyor...', [
      { text: 'Tamam', onPress: () => console.log('Export started') }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verileriniz silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => console.log('Delete account')
        }
      ]
    );
  };

  const handleLogout = () => {
    console.log('Logout button pressed'); // Debug log
    
    // Web'de Alert.alert problemli olabileceği için platform kontrolü yapalım
    if (isWeb) {
      // Web'de browser'ın native confirm'ini kullan
      const confirmLogout = window.confirm('Çıkış yapmak istediğinizden emin misiniz?');
      if (confirmLogout) {
        performLogout();
      }
    } else {
      // Mobile'da Alert.alert kullan
      Alert.alert(
        'Çıkış Yap',
        'Çıkış yapmak istediğinizden emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Çıkış Yap', 
            onPress: performLogout
          }
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      console.log('Attempting to sign out...'); // Debug log
      await signOut();
      console.log('Sign out successful'); // Debug log
    } catch (error) {
      console.error('Sign out error:', error); // Debug log
      if (isWeb) {
        window.alert('Çıkış yapılırken bir hata oluştu.');
      } else {
        Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
      }
    }
  };

  const renderContent = () => (
    <ScrollView style={styles.scrollView}>
      {/* User Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kullanıcı</Text>
        <Card style={styles.sectionCard}>
          <SettingItem
            icon="person"
            title="Profil"
            subtitle={user?.email || 'Kullanıcı'}
            onPress={() => {
              // Navigate to profile screen
              Alert.alert('Profil', 'Profil ayarları yakında gelecek');
            }}
          />
          <SettingItem
            icon="shield-checkmark"
            title="Güvenlik"
            subtitle="Şifre ve güvenlik ayarları"
            onPress={() => {
              Alert.alert('Güvenlik', 'Güvenlik ayarları yakında gelecek');
            }}
          />
        </Card>
      </View>

      {/* App Settings - This whole section might be removed or simplified */}
      {/*
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        <Card style={styles.sectionCard}>
          <SettingItem // Removed Notifications
            icon="notifications"
            title="Bildirimler"
            subtitle="Push bildirimleri ve hatırlatıcılar"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled} // This state will be removed
                onValueChange={setNotificationsEnabled} // This state setter will be removed
                trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                thumbColor={notificationsEnabled ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
              />
            }
          />
          <SettingItem // Removed Biometric Entry
            icon="finger-print"
            title="Biyometrik Giriş"
            subtitle="Parmak izi veya yüz tanıma"
            showArrow={false}
            rightElement={
              <Switch
                value={biometricEnabled} // This state will be removed
                onValueChange={setBiometricEnabled} // This state setter will be removed
                trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                thumbColor={biometricEnabled ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
              />
            }
          />
          <SettingItem // Removed Dark Mode
            icon="moon"
            title="Karanlık Mod"
            subtitle="Koyu renk teması (yakında)"
            showArrow={false}
            rightElement={
              <Switch
                value={false} // Was darkModeEnabled, this state will be removed
                onValueChange={() => {}} // Was setDarkModeEnabled, this state setter will be removed
                disabled={true}
                trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                thumbColor={COLORS.TEXT_SECONDARY}
              />
            }
          />
        </Card>
      </View>
      */}

      {/* Data & Backup */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri ve Yedekleme</Text>
        <Card style={styles.sectionCard}>
          <SettingItem
            icon="download"
            title="Verileri İndir"
            subtitle="Tüm verilerinizi JSON formatında indirin"
            onPress={() => {
              Alert.alert(
                'Veri İndirme',
                'Bu özellik web versiyonunda kullanılabilir olacak',
                [{ text: 'Tamam' }]
              );
            }}
          />
          <SettingItem
            icon="trash"
            title="Tüm Verileri Sil"
            subtitle="Hesabınızı ve tüm verilerinizi kalıcı olarak silin"
            onPress={() => {
              Alert.alert(
                'Verileri Sil',
                'Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecek.',
                [
                  { text: 'İptal', style: 'cancel' },
                  { 
                    text: 'Sil', 
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Uyarı', 'Bu özellik henüz aktif değil');
                    }
                  }
                ]
              );
            }}
          />
        </Card>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Card style={styles.sectionCard}>
          <SettingItem
            icon="information-circle"
            title="Uygulama Sürümü"
            subtitle={`v${APP_CONFIG.VERSION}`}
            showArrow={false}
          />
          <SettingItem
            icon="help-circle"
            title="Yardım ve Destek"
            subtitle="SSS ve destek"
            onPress={() => {
              Alert.alert('Destek', 'Destek sayfası yakında gelecek');
            }}
          />
          <SettingItem
            icon="document-text"
            title="Gizlilik Politikası"
            subtitle="Veri kullanımı ve gizlilik"
            onPress={() => {
              Alert.alert('Gizlilik', 'Gizlilik politikası yakında gelecek');
            }}
          />
        </Card>
      </View>

      {/* Logout */}
      <View style={styles.logoutContainer}>
        <Button
          title="Çıkış Yap"
          onPress={handleLogout}
          variant="outline"
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made by Devosuit © 2025 All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Ayarlar" activeRoute="settings" navigation={navigation}>
        {renderContent()}
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
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
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginHorizontal: SPACING.md,
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  footerVersion: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
  },
});

export default SettingsScreen; 