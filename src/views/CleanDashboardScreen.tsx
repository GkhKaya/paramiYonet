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
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';

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
import { Account } from '../models/Account';
import { TransactionType } from '../models/Transaction';

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
      balance: account.balance,
      isActive: account.isActive,
      color: account.color,
    }));
  };

  // Navigation Handlers - Sayfalar arası geçiş fonksiyonları

  /**
   * İşlem ekleme sayfasına yönlendirir
   */
  const navigateToAddTransaction = useCallback((type: TransactionType) => {
    navigation.navigate('AddTransaction', { defaultType: type });
  }, [navigation]);

  /**
   * Hesap ekleme sayfasına yönlendirir
   */
  const navigateToAddAccount = useCallback(() => {
    navigation.navigate('AddAccount');
  }, [navigation]);

  /**
   * Raporlar sayfasına yönlendirir
   */
  const navigateToReports = useCallback(() => {
    navigation.navigate('Reports');
  }, [navigation]);

  /**
   * İşlemler sayfasına yönlendirir
   */
  const navigateToTransactions = useCallback(() => {
    navigation.navigate('Transactions');
  }, [navigation]);

  /**
   * Analizler sayfasına yönlendirir
   */
  const navigateToAnalytics = useCallback(() => {
    navigation.navigate('Analytics');
  }, [navigation]);

  /**
   * Hesap düzenleme sayfasına yönlendirir
   */
  const handleEditAccount = useCallback((account: AccountItem) => {
    navigation.navigate('AddAccount', { editAccount: account });
  }, [navigation]);

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

  // Quick Actions Configuration - Hızlı eylem butonları konfigürasyonu
  const quickActions = createCommonQuickActions(
    () => navigateToAddTransaction(TransactionType.INCOME),
    () => navigateToAddTransaction(TransactionType.EXPENSE),
    navigateToAddAccount,
    navigateToReports,
    navigateToTransactions,
    undefined,
    navigateToAnalytics
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
        loading={!transactionViewModel}
      />

      {/* Hesaplar Listesi */}
      <AccountsList
        accounts={getAccountsForUI()}
        onEditAccount={handleEditAccount}
        onDeleteAccount={handleDeleteAccount}
        onAddAccount={navigateToAddAccount}
        loading={!accountViewModel}
      />
    </>
  );

  // Web Layout
  if (isWeb) {
    return (
      <WebLayout title="Dashboard" activeRoute="dashboard" navigation={navigation}>
        <View style={styles.webContainer}>
          {renderContent()}
        </View>
      </WebLayout>
    );
  }

  // Mobile Layout
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
});

/**
 * Stil Tanımları
 * 
 * Clean code prensiplerine uygun olarak minimal stil tanımları.
 * Büyük kısmı alt bileşenlerde tanımlanır.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    padding: 20,
  },
});

export default CleanDashboardScreen; 