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

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [exportingData, setExportingData] = useState(false);

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
          <Ionicons name={icon as any} size={20} color="#2196F3" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
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
      { text: 'Tamam', onPress: () => console.log('Backup started') }
    ]);
  };

  const handleExportData = async () => {
    if (!user || !isWeb) {
      Alert.alert('Hata', 'Bu özellik yalnızca web platformunda ve giriş yapmış kullanıcılar için geçerlidir.');
      return;
    }

    setExportingData(true);
    try {
      const viewModel = new TransactionViewModel(user.id);
      await viewModel.loadTransactions();

      if (viewModel.transactions.length === 0) {
        if (isWeb) {
          window.alert('Dışa aktarılacak herhangi bir işlem bulunamadı.');
        } else {
          Alert.alert('Bilgi', 'Dışa aktarılacak herhangi bir işlem bulunamadı.');
        }
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

      if (isWeb) {
        window.alert('Verileriniz başarıyla JSON dosyası olarak indirildi.');
      } else {
        Alert.alert('Başarılı', 'Verileriniz başarıyla JSON dosyası olarak indirildi.');
      }

    } catch (error) {
      console.error('Error exporting data:', error);
      if (isWeb) {
        window.alert('Veriler dışa aktarılırken bir hata oluştu.');
      } else {
        Alert.alert('Hata', 'Veriler dışa aktarılırken bir hata oluştu.');
      }
    } finally {
      setExportingData(false);
    }
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
        <View style={styles.sectionCard}>
          <SettingItem
            icon="person"
            title="Profil"
            subtitle={user?.email || 'Kullanıcı'}
            onPress={() => {
              // Navigate to profile screen
              if (Platform.OS === 'web') {
                navigation.navigate('Profile', undefined, {
                  animation: 'none'
                });
              } else {
                navigation.navigate('Profile');
              }
            }}
          />
          <SettingItem
            icon="shield-checkmark"
            title="Güvenlik"
            subtitle="Şifre ve güvenlik ayarları"
            onPress={() => {
              if (Platform.OS === 'web') {
                navigation.navigate('Security', undefined, {
                  animation: 'none'
                });
              } else {
                navigation.navigate('Security');
              }
            }}
          />
        </View>
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
        <View style={styles.sectionCard}>
          <SettingItem
            icon="download"
            title="Verileri İndir"
            subtitle="Tüm verilerinizi JSON formatında indirin"
            onPress={handleExportData}
            showArrow={!exportingData}
            rightElement={
              exportingData ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : null
            }
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
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <View style={styles.sectionCard}>
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
              if (Platform.OS === 'web') {
                navigation.navigate('HelpAndSupport', undefined, {
                  animation: 'none'
                });
              } else {
                navigation.navigate('HelpAndSupport');
              }
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
        </View>
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

  // Web Layout - Professional Settings
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ayarlar</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
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
});

export default SettingsScreen; 