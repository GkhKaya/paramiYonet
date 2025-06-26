/**
 * Clean Dashboard Screen - Yeniden Düzenlenmiş Ana Sayfa
 * 
 * Bu dosya clean code prensiplerine uygun olarak yeniden tasarlanmıştır.
 * Büyük monolitik bileşen yerine küçük, tekrar kullanılabilir bileşenler kullanır.
 * 
 * Özellikler:
 * - Modüler bileşen yapısı
 * - Türkçe açıklamalar
 * - TypeScript tip güvenliği
 * - Performans optimizasyonları
 * - Consistent state management
 * - Minimal dark theme design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Custom Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { QuickActions, createCommonQuickActions } from '../components/dashboard/QuickActions';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { AccountsList, AccountItem } from '../components/dashboard/AccountsList';
import { WebLayout } from '../components/layout/WebLayout';

// Utils and Constants
import { COLORS } from '../constants/ui';
import { isWeb } from '../utils/platform';

// Context and ViewModels
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { Account, AccountType } from '../models/Account';
import { TransactionType } from '../models/Transaction';
import { MainStackParamList } from '../types';

interface CleanDashboardScreenProps {
  navigation: any;
}

/**
 * Ana Dashboard Bileşeni
 * 
 * Bu bileşen kullanıcının finansal durumunu özet halinde gösterir ve
 * hızlı işlemler yapmasını sağlar.
 */
const CleanDashboardScreen: React.FC<CleanDashboardScreenProps> = observer(({ navigation }) => {
  const parentNavigation = useNavigation<any>();
  const { user } = useAuth();
  const { transactionViewModel, accountViewModel, isLoading: viewModelsLoading } = useViewModels();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  /**
   * Sayfa odaklandığında veriyi yeniler
   * 
   * Kullanıcı başka sayfalarda işlem yaptıktan sonra
   * ana sayfaya döndüğünde verilerin güncel olmasını sağlar.
   */
  useFocusEffect(
    useCallback(() => {
      if (transactionViewModel && accountViewModel) {
        refreshData();
      }
    }, [transactionViewModel, accountViewModel])
  );

  /**
   * Tüm veriyi yeniler (pull-to-refresh için)
   */
  const refreshData = async () => {
    if (!transactionViewModel || !accountViewModel) return;
    
    try {
      await Promise.all([
        transactionViewModel.loadTransactions(),
        accountViewModel.loadAccounts()
      ]);
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
    }
  };

  /**
   * Pull-to-refresh handler
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  /**
   * Bakiye görünürlüğünü değiştirir
   */
  const handleToggleBalanceVisibility = useCallback(() => {
    setBalanceVisible(prev => !prev);
  }, []);

  /**
   * Toplam bakiyeyi hesaplar
   */
  const calculateTotalBalance = (): number => {
    return accountViewModel?.totalBalance || 0;
  };

  /**
   * Hesapları UI formatına dönüştürür
   */
  const getAccountsForUI = (): AccountItem[] => {
    if (!accountViewModel?.accountsWithRealTimeBalances) return [];
    
    return accountViewModel.accountsWithRealTimeBalances.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.type === AccountType.CREDIT_CARD ? 
        -(account.currentDebt || 0) : 
        account.balance,
      isActive: account.isActive,
      color: account.color,
      currentDebt: account.currentDebt, // Kredi kartı borcu bilgisini de ekleyelim
    }));
  };

  // Navigation Handlers - Sayfalar arası geçiş fonksiyonları

  /**
   * İşlem ekleme sayfasına yönlendirir
   */
  const navigateToAddTransaction = useCallback((type: TransactionType) => {
    const paramType = type === TransactionType.INCOME ? 'income' : 'expense';
    
    // Root navigator'ı bul
    let rootNav = parentNavigation;
    while (rootNav.getParent()) {
      rootNav = rootNav.getParent();
    }
    
    rootNav.navigate('AddTransaction', { defaultType: paramType });
  }, [parentNavigation]);

  /**
   * Hesap ekleme sayfasına yönlendirir
   */
  const navigateToAddAccount = useCallback(() => {
    parentNavigation.navigate('AddAccount');
  }, [parentNavigation]);

  /**
   * Raporlar sayfasına yönlendirir (tab navigation)
   */
  const navigateToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  /**
   * İşlemler sayfasına yönlendirir (tab navigation)
   */
  const navigateToTransactions = useCallback(() => {
    navigation.navigate('Transactions');
  }, [navigation]);

  /**
   * Analizler sayfasına yönlendirir
   */
  const navigateToAnalytics = useCallback(() => {
    parentNavigation.navigate('Analytics');
  }, [parentNavigation]);

  /**
   * Kredi kartı harcama sayfasına yönlendirir
   */
  const navigateToCreditCardTransaction = useCallback(() => {
    parentNavigation.navigate('CreditCardTransaction');
  }, [parentNavigation]);

  /**
   * Kredi kartı ödeme sayfasına yönlendirir
   */
  const navigateToCreditCardPayment = useCallback(() => {
    // İlk kredi kartını bul ve ona yönlendir
    const creditCards = accountViewModel?.accounts.filter(acc => 
      acc.type === AccountType.CREDIT_CARD && acc.isActive
    );
    
    if (creditCards && creditCards.length > 0) {
      parentNavigation.navigate('CreditCardPayment', { creditCard: creditCards[0] });
    } else {
      Alert.alert('Bilgi', 'Önce bir kredi kartı hesabı oluşturmanız gerekiyor', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Hesap Ekle', onPress: navigateToAddAccount }
      ]);
    }
  }, [parentNavigation, accountViewModel?.accounts, navigateToAddAccount]);

  /**
   * Hesap düzenleme sayfasına yönlendirir
   */
  const handleEditAccount = useCallback((account: AccountItem) => {
    // Gerçek Account objesini AccountViewModel'den bul
    const realAccount = accountViewModel?.accounts.find(acc => acc.id === account.id);
    if (realAccount) {
      parentNavigation.navigate('AddAccount', { editAccount: realAccount });
    } else {
      Alert.alert('Hata', 'Hesap bilgileri bulunamadı');
    }
  }, [parentNavigation, accountViewModel?.accounts]);

  /**
   * Hesap silme işlemini gerçekleştirir
   */
  const handleDeleteAccount = useCallback(async (account: AccountItem) => {
    if (!accountViewModel) return;
    
    try {
      await accountViewModel.deleteAccount(account.id);
      Alert.alert('Başarılı', 'Hesap silindi');
    } catch (error) {
      console.error('Hesap silme hatası:', error);
      Alert.alert('Hata', 'Hesap silinirken bir hata oluştu');
    }
  }, [accountViewModel]);

  /**
   * Debug: Bakiye yeniden hesaplama (geliştirme amaçlı)
   */
  const handleRecalculateBalances = useCallback(async () => {
    if (!accountViewModel) return;
    
    setRefreshing(true);
    try {
      const success = await accountViewModel.recalculateBalancesFromTransactions();
      if (success) {
        Alert.alert('Başarılı', 'Hesap bakiyeleri yeniden hesaplandı');
      } else {
        Alert.alert('Hata', 'Bakiye hesaplanırken bir hata oluştu');
      }
    } catch (error) {
      console.error('Bakiye hesaplama hatası:', error);
      Alert.alert('Hata', 'Bakiye hesaplanırken bir hata oluştu');
    } finally {
      setRefreshing(false);
    }
  }, [accountViewModel]);



  /**
   * İşlem detayına yönlendirir
   */
  const navigateToTransactionDetail = useCallback((transactionId: string) => {
    parentNavigation.navigate('TransactionDetail', { transactionId });
  }, [parentNavigation]);

  /**
   * Borçlar sayfasına yönlendirir
   */
  const navigateToDebts = useCallback(() => {
    parentNavigation.navigate('Debts');
  }, [parentNavigation]);

  // Quick Actions Configuration - Hızlı eylem butonları konfigürasyonu
  const quickActions = createCommonQuickActions(
    () => navigateToAddTransaction(TransactionType.INCOME),   // onAddIncome
    () => navigateToAddTransaction(TransactionType.EXPENSE),  // onAddExpense
    navigateToAddAccount,
    navigateToReports,
    navigateToTransactions,
    undefined,
    navigateToAnalytics,
    navigateToCreditCardTransaction,  // Kredi kartı harcama
    navigateToCreditCardPayment,      // Kredi kartı ödeme
    undefined,                        // Borç ekleme kaldırıldı
    navigateToDebts                   // Borçlar listesi
  );

  // Content component for both web and mobile
  const renderContent = () => (
    <>
      {/* Dashboard Başlığı ve Bakiye */}
      <DashboardHeader
        userName={user?.displayName}
        totalBalance={calculateTotalBalance()}
        balanceVisible={balanceVisible}
        onToggleBalanceVisibility={handleToggleBalanceVisibility}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      {/* Hızlı İşlemler */}
      <QuickActions
        actions={quickActions}
        columns={2}
      />

      {/* Son İşlemler */}
      <RecentTransactions
        transactions={transactionViewModel?.recentTransactions || []}
        onViewAll={navigateToTransactions}
        onTransactionPress={navigateToTransactionDetail}
        loading={!transactionViewModel}
      />

      {/* Hesaplar Listesi */}
      <AccountsList
        accounts={getAccountsForUI()}
        onEditAccount={handleEditAccount}
        onDeleteAccount={handleDeleteAccount}
        onAddAccount={navigateToAddAccount}
        onCreditCardPayment={(account) => {
          // Gerçek Account objesini AccountViewModel'den bul
          const realAccount = accountViewModel?.accounts.find(acc => acc.id === account.id);
          if (realAccount) {
            parentNavigation.navigate('CreditCardPayment', { creditCard: realAccount });
          } else {
            Alert.alert('Hata', 'Kredi kartı bilgileri bulunamadı');
          }
        }}
        onCreditCardTransaction={(account) => {
          // Gerçek Account objesini AccountViewModel'den bul
          const realAccount = accountViewModel?.accounts.find(acc => acc.id === account.id);
          if (realAccount) {
            parentNavigation.navigate('CreditCardTransaction', { selectedCreditCard: realAccount });
          } else {
            Alert.alert('Hata', 'Kredi kartı bilgileri bulunamadı');
          }
        }}
        loading={!accountViewModel}
      />
    </>
  );

  // Web Layout - Professional Dashboard
  if (isWeb) {
    return (
      <WebLayout title="Dashboard" activeRoute="dashboard" navigation={navigation}>
        <View style={styles.webContentContainer}>
          {renderContent()}
        </View>
      </WebLayout>
    );
  }

  // Mobile Layout
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FFFFFF']}
              tintColor="#FFFFFF"
            />
          }
        >
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </>
  );
});

/**
 * Stil Tanımları - Minimal Dark Theme
 * 
 * Login/Register ekranlarıyla tutarlı minimal dark theme tasarım
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background like login screens
  },
  scrollView: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000000',
  },
  webContentContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Let WebLayout handle the background
  },
});

export default CleanDashboardScreen; 