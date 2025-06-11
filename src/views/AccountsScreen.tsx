import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { AccountCard } from '../components/common/AccountCard';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { Account } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { isWeb } from '../utils/platform';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AccountsScreenProps {
  navigation: any;
}

const AccountsScreen: React.FC<AccountsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [viewModel, setViewModel] = useState<AccountViewModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';

  useEffect(() => {
    if (user?.id) {
      const vm = new AccountViewModel(user.id);
      setViewModel(vm);
    } else {
      setViewModel(null);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    if (!viewModel) return;
    setRefreshing(true);
    await viewModel.loadAccounts();
    setRefreshing(false);
  };

  const handleAccountPress = (account: Account) => {
    Alert.alert(
      account.name,
      'Bu hesap için ne yapmak istiyorsunuz?',
      [
        {
          text: 'Düzenle',
                        onPress: () => {}
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => handleDeleteAccount(account)
        },
        {
          text: 'İptal',
          style: 'cancel'
        }
      ]
    );
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Hesap Sil',
      `${account.name} hesabını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (viewModel) {
              const success = await viewModel.deleteAccount(account.id);
              if (success) {
                Alert.alert('Başarılı', 'Hesap başarıyla silindi');
              } else {
                Alert.alert('Hata', viewModel.error || 'Hesap silinirken hata oluştu');
              }
            }
          }
        }
      ]
    );
  };

  const AccountSummaryCard = () => {
    if (!viewModel) return null;

    const summary = viewModel.accountSummary;

    return (
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Hesap Özeti</Text>
        
        <View style={styles.totalBalanceContainer}>
          <Text style={styles.totalBalanceLabel}>Toplam Bakiye</Text>
          <Text style={styles.totalBalanceAmount}>
            {currencySymbol}{summary.totalBalance.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          {summary.cashBalance > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.SUCCESS }]}>
                <Ionicons name="cash-outline" size={16} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Nakit</Text>
              <Text style={styles.summaryAmount}>
                {currencySymbol}{summary.cashBalance.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}
          
          {summary.debitCardBalance > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.PRIMARY }]}>
                <Ionicons name="card-outline" size={16} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Banka Kartı</Text>
              <Text style={styles.summaryAmount}>
                {currencySymbol}{summary.debitCardBalance.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}
          
          {summary.creditCardBalance > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.ERROR }]}>
                <Ionicons name="card-outline" size={16} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Kredi Kartı</Text>
              <Text style={styles.summaryAmount}>
                {currencySymbol}{summary.creditCardBalance.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}
          
          {summary.savingsBalance > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.WARNING }]}>
                <Ionicons name="wallet-outline" size={16} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Tasarruf</Text>
              <Text style={styles.summaryAmount}>
                {currencySymbol}{summary.savingsBalance.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}
          
          {summary.investmentBalance > 0 && (
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: COLORS.SECONDARY }]}>
                <Ionicons name="trending-up-outline" size={16} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Yatırım</Text>
              <Text style={styles.summaryAmount}>
                {currencySymbol}{summary.investmentBalance.toLocaleString('tr-TR')}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderContent = () => {
    if (!user) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateTitle}>Giriş yapmanız gerekiyor</Text>
        </View>
      );
    }

    if (!viewModel) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Hesaplar yükleniyor...</Text>
        </View>
      );
    }

    if (viewModel.isLoading && viewModel.accounts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Hesaplar yükleniyor...</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Account Summary */}
        <AccountSummaryCard />

        {/* Accounts List */}
        {viewModel.accounts.length > 0 ? (
          <View style={styles.accountsList}>
            <Text style={styles.accountsListTitle}>Hesaplarım ({viewModel.accounts.length})</Text>
            {viewModel.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => handleAccountPress(account)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.emptyStateTitle}>Henüz hesap yok</Text>
              <Text style={styles.emptyStateText}>
                Hemen ilk hesabınızı oluşturun ve para takibine başlayın
              </Text>
              <TouchableOpacity
                style={styles.addAccountButton}
                onPress={() => navigation.navigate('AddAccount')}
              >
                <Text style={styles.addAccountButtonText}>Hesap Ekle</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {viewModel.error && (
          <Card style={styles.errorCard}>
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
              <Text style={styles.errorText}>{viewModel.error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </ScrollView>
    );
  };

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Hesaplarım" activeRoute="accounts" navigation={navigation}>
        <View style={[styles.webContent, styles.webContainer]}>
          <View style={styles.webHeader}>
            <Text style={styles.webHeaderTitle}>Hesaplarım</Text>
            <TouchableOpacity
              style={styles.webAddButton}
              onPress={() => navigation.navigate('AddAccount')}
            >
              <Ionicons name="add" size={20} color={COLORS.WHITE} />
              <Text style={styles.webAddButtonText}>Yeni Hesap</Text>
            </TouchableOpacity>
          </View>
          {renderContent()}
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesaplarım</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAccount')}
        >
          <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  summaryCard: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  totalBalanceContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  totalBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  totalBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
    flex: 1,
  },
  summaryAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'right',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.sm,
  },
  accountsList: {
    gap: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  createFirstAccountButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  createFirstAccountButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    marginBottom: SPACING.md,
  },
  errorCard: {
    marginBottom: SPACING.md,
  },
  errorState: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  webContent: {
    flex: 1,
  },
  webContainer: {
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  webHeaderTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  webAddButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.sm,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  webAddButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: SPACING.sm,
  },
  accountsListTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  addAccountButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addAccountButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});

export default AccountsScreen; 