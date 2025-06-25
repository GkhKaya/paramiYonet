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
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, APP_CONFIG } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { isWeb } from '../utils/platform';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { Transaction } from '../models/Transaction';
import CustomAlert, { AlertType } from '../components/common/CustomAlert';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [exportingData, setExportingData] = useState(false);

  // Custom Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    action?: () => void
  ) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setConfirmAction(action ? () => action : null);
    setAlertVisible(true);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement,
    color,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={20} color={color || COLORS.PRIMARY} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: color || COLORS.TEXT_PRIMARY }]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color="#666666" />
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
      <View style={styles.sectionCard}>
        {children}
      </View>
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
                  { text: 'Tamam', onPress: () => {} }
    ]);
  };

  const handleExportData = async () => {
    if (!user) {
      showAlert('error', 'Hata', 'Bu özellik yalnızca giriş yapmış kullanıcılar için geçerlidir.');
      return;
    }
    if (isWeb) {
      setExportingData(true);
      try {
        const viewModel = new TransactionViewModel(user.id);
        await viewModel.loadTransactions();

        if (viewModel.transactions.length === 0) {
          showAlert('info', 'Bilgi', 'Dışa aktarılacak herhangi bir işlem bulunamadı.');
          setExportingData(false);
          return;
        }

        const jsonData = {
          userInfo: {
            userId: user.id,
            email: user.email,
          },
          exportDate: new Date().toISOString(),
          transactions: viewModel.transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            description: t.description,
            category: t.category,
            categoryIcon: t.categoryIcon,
            accountId: t.accountId,
            date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
            createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
            updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
          })),
        };

        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parami_yonet_veriler_${user.id}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('success', 'Başarılı', 'Verileriniz başarıyla JSON dosyası olarak indirildi.');

      } catch (error) {
        console.error('Error exporting data:', error);
        showAlert('error', 'Hata', 'Veriler dışa aktarılırken bir hata oluştu.');
      } finally {
        setExportingData(false);
      }
    } else {
      showAlert('info', 'Bilgi', 'Bu özellik şimdilik yalnızca web platformunda mevcuttur.');
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'warning',
      'Hesabı Sil',
      'Bu özellik yakında gelecek. Tüm verileriniz silinecek ve bu işlem geri alınamayacak.',
      () => console.log('Hesap silme işlemi (gelecekte).')
    );
  };

  const handleLogout = () => {
    showAlert(
      'confirm',
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      performLogout
    );
  };

  const performLogout = async () => {
    try {
      await signOut();
      // App navigasyonu Auth yığınına yönlendirir
    } catch (error) {
      console.error('Sign out error:', error);
      showAlert('error', 'Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  const UserProfileSection = () => (
    <View style={styles.profileSection}>
      <View style={styles.profileAvatar}>
        <Ionicons name="person-circle-outline" size={60} color={COLORS.PRIMARY} />
      </View>
      <Text style={styles.profileName}>{user?.displayName || 'Kullanıcı'}</Text>
      <Text style={styles.profileEmail}>{user?.email}</Text>
      <TouchableOpacity 
        style={styles.editProfileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.editProfileButtonText}>Profili Düzenle</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => (
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <UserProfileSection />

      {/* Hesap Ayarları */}
      <SettingSection title="Hesap Yönetimi">
        <SettingItem
          icon="wallet-outline"
          title="Hesaplar"
          subtitle="Hesaplarınızı yönetin"
          onPress={() => navigation.navigate('Reports', { initialTab: 'accounts' })}
        />
        <SettingItem
          icon="bookmark-outline"
          title="Kategoriler"
          subtitle="Harcama kategorilerini yönetin"
          onPress={() => navigation.navigate('ManageCategories')}
        />
        <SettingItem
          icon="people-outline"
          title="Borç Yönetimi"
          subtitle="Verilen ve alınan borçları takip et"
          onPress={() => navigation.navigate('Debts')}
        />
        <SettingItem
          icon="key-outline"
          title="Güvenlik"
          subtitle="Şifre ve güvenlik ayarları"
          onPress={() => navigation.navigate('Security')}
        />
      </SettingSection>

      {/* Veri ve Yedekleme */}
      <SettingSection title="Veri ve Yedekleme">
        <SettingItem
          icon="download-outline"
          title="Verileri İndir"
          subtitle="Tüm verilerinizi JSON formatında indirin"
          onPress={handleExportData}
          showArrow={!exportingData}
          rightElement={
            exportingData ? <ActivityIndicator size="small" color={COLORS.PRIMARY} /> : null
          }
        />
        <SettingItem
          icon="trash-outline"
          title="Tüm Verileri Sil"
          subtitle="Hesabınızı kalıcı olarak silin"
          onPress={handleDeleteAccount}
          color={COLORS.DANGER}
        />
      </SettingSection>

      {/* Uygulama */}
      <SettingSection title="Uygulama">
        <SettingItem
          icon="information-circle-outline"
          title="Uygulama Sürümü"
          subtitle={`v${APP_CONFIG.VERSION}`}
          showArrow={false}
        />
        <SettingItem
          icon="help-buoy-outline"
          title="Yardım ve Destek"
          subtitle="SSS ve destek"
          onPress={() => navigation.navigate('HelpAndSupport')}
        />
        <SettingItem
          icon="document-text-outline"
          title="Gizlilik Politikası"
          subtitle="Veri kullanımı ve gizlilik"
          onPress={() => showAlert('info', 'Gizlilik Politikası', 'Bu özellik yakında eklenecektir.')}
        />
      </SettingSection>

      {/* Logout */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.DANGER} />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made by Devosuit © 2025</Text>
      </View>
    </ScrollView>
  );

  // Web Layout
  if (isWeb) {
    return (
      <WebLayout title="Ayarlar" activeRoute="settings" navigation={navigation}>
        <View style={styles.webContainer}>
          {renderContent()}
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ayarlar</Text>
        </View>
        
        {renderContent()}

        <CustomAlert
          visible={alertVisible}
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
          onPrimaryPress={() => {
            if (confirmAction) {
              confirmAction();
            }
            setAlertVisible(false);
          }}
          onSecondaryPress={() => setAlertVisible(false)}
          primaryButtonText={alertType === 'confirm' ? 'Evet' : 'Tamam'}
          secondaryButtonText={alertType === 'confirm' ? 'İptal' : undefined}
        />
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 50,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666', // Gray text
    marginBottom: 12,
    marginLeft: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginHorizontal: 24,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
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
    backgroundColor: '#1a1a1a', // Dark surface
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#444444', // Darker gray text
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
  },
  editProfileButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
  },
  editProfileButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default SettingsScreen; 