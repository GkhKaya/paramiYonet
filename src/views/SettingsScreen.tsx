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
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../constants';
import { useAuth } from '../contexts/AuthContext';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

const SettingsScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

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
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <SettingSection title="Profil">
          <SettingItem
            icon="person-outline"
            title={user?.displayName || 'Kullanıcı'}
            subtitle={user?.email || 'email@example.com'}
            onPress={handleProfileEdit}
          />
        </SettingSection>

        {/* App Settings */}
        <SettingSection title="Uygulama Ayarları">
          <SettingItem
            icon="globe-outline"
            title="Para Birimi"
            subtitle="Türk Lirası (₺)"
            onPress={handleCurrencyChange}
          />
          <SettingItem
            icon="notifications-outline"
            title="Bildirimler"
            subtitle="Günlük hatırlatmalar ve önemli bilgiler"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '50' }}
                thumbColor={notificationsEnabled ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
              />
            }
          />
          <SettingItem
            icon="moon-outline"
            title="Karanlık Tema"
            subtitle="Göz dostu karanlık görünüm"
            showArrow={false}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '50' }}
                thumbColor={darkModeEnabled ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
              />
            }
          />
        </SettingSection>

        {/* Security */}
        <SettingSection title="Güvenlik">
          <SettingItem
            icon="finger-print-outline"
            title="Biyometrik Kilit"
            subtitle="Parmak izi veya yüz tanıma ile güvenlik"
            showArrow={false}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '50' }}
                thumbColor={biometricEnabled ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
              />
            }
          />
          <SettingItem
            icon="key-outline"
            title="Şifreyi Değiştir"
            onPress={() => Alert.alert('Şifre Değiştir', 'Şifre değiştirme özelliği yakında gelecek')}
          />
        </SettingSection>

        {/* Data Management */}
        <SettingSection title="Veri Yönetimi">
          <SettingItem
            icon="cloud-upload-outline"
            title="Yedekleme"
            subtitle="Verilerinizi buluta yedekleyin"
            onPress={handleBackup}
          />
          <SettingItem
            icon="download-outline"
            title="Veri Dışa Aktarma"
            subtitle="Excel veya CSV formatında indir"
            onPress={handleExportData}
          />
        </SettingSection>

        {/* Support */}
        <SettingSection title="Destek & Bilgi">
          <SettingItem
            icon="help-circle-outline"
            title="Yardım Merkezi"
            onPress={() => Alert.alert('Yardım', 'Yardım sayfası yakında gelecek')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Gizlilik Politikası"
            onPress={() => Alert.alert('Gizlilik', 'Gizlilik politikası yakında gelecek')}
          />
          <SettingItem
            icon="information-circle-outline"
            title="Uygulama Hakkında"
            subtitle={`Sürüm ${APP_CONFIG.VERSION}`}
            onPress={() => Alert.alert('Hakkında', `${APP_CONFIG.NAME}\nSürüm: ${APP_CONFIG.VERSION}\n\nPara yönetimi uygulaması`)}
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection title="Tehlikeli Bölge">
          <SettingItem
            icon="trash-outline"
            title="Hesabı Sil"
            subtitle="Tüm verilerinizi kalıcı olarak siler"
            onPress={handleDeleteAccount}
            showArrow={false}
            rightElement={
              <Ionicons name="warning" size={20} color={COLORS.ERROR} />
            }
          />
        </SettingSection>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Çıkış Yap"
            onPress={handleLogout}
            variant="outline"
            size="large"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {APP_CONFIG.NAME} ile paranızı daha iyi yönetin
          </Text>
          <Text style={styles.footerVersion}>
            Sürüm {APP_CONFIG.VERSION}
          </Text>
        </View>
      </ScrollView>
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