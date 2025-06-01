import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { AccountCard } from '../components/common/AccountCard';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { Account, AccountType } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [transactionViewModel, setTransactionViewModel] = useState<TransactionViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  
  // Initialize ViewModels with user ID when available
  useEffect(() => {
    if (user?.id) {
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
    } else {
      setTransactionViewModel(null);
      setAccountViewModel(null);
    }
  }, [user?.id]);

  const onRefresh = async () => {
    if (!transactionViewModel || !accountViewModel) return;
    setRefreshing(true);
    await Promise.all([
      transactionViewModel.loadTransactions(),
      accountViewModel.loadAccounts()
    ]);
    setRefreshing(false);
  };

  const totalBalance = accountViewModel?.totalBalance || 0;
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    const categories = type === TransactionType.INCOME 
      ? DEFAULT_INCOME_CATEGORIES 
      : DEFAULT_EXPENSE_CATEGORIES;
    
    const category = categories.find(cat => cat.name === categoryName) || categories[0];
    return category;
  };

  const navigateToAddTransaction = (type: TransactionType) => {
    navigation.navigate('AddTransaction', { defaultType: type });
  };

  const QuickActionButton = ({ 
    icon, 
    title, 
    onPress, 
    color = COLORS.PRIMARY 
  }: {
    icon: string;
    title: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={isSmallDevice ? 20 : 24} color="white" />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const RecentTransactionItem = ({ transaction }: { transaction: Transaction }) => {
    const category = getCategoryDetails(transaction.category, transaction.type);
    const isIncome = transaction.type === TransactionType.INCOME;

    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => navigation.navigate('Transactions')}
      >
        <View style={styles.transactionLeft}>
          <CategoryIcon
            iconName={transaction.categoryIcon}
            color={category.color}
            size="small"
          />
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDescription}>{transaction.description}</Text>
            <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
          </View>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: isIncome ? COLORS.SUCCESS : COLORS.ERROR }
        ]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hoş geldiniz</Text>
            <Text style={styles.userName}>{user?.displayName || 'Kullanıcı'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="person-circle-outline" size={32} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Toplam Bakiye</Text>
          <Text style={styles.balanceAmount}>
            {balanceVisible ? formatCurrency(totalBalance) : '••••••'}
          </Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.balanceActionButton}
              onPress={() => setBalanceVisible(!balanceVisible)}
            >
              <Ionicons 
                name={balanceVisible ? "eye-outline" : "eye-off-outline"} 
                size={16} 
                color={COLORS.TEXT_SECONDARY} 
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Monthly Stats */}
        {transactionViewModel && !transactionViewModel.isLoading && (
          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>Bu Ay</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <Ionicons name="trending-up" size={16} color={COLORS.SUCCESS} />
                  <Text style={styles.statLabel}>Gelir</Text>
                </View>
                <Text style={[styles.statAmount, { color: COLORS.SUCCESS }]}>
                  +{formatCurrency(transactionViewModel.monthlyStats.totalIncome || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <Ionicons name="trending-down" size={16} color={COLORS.ERROR} />
                  <Text style={styles.statLabel}>Gider</Text>
                </View>
                <Text style={[styles.statAmount, { color: COLORS.ERROR }]}>
                  -{formatCurrency(transactionViewModel.monthlyStats.totalExpense || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statHeader}>
                  <Ionicons name="analytics" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.statLabel}>Net</Text>
                </View>
                <Text style={[
                  styles.statAmount, 
                  { color: (transactionViewModel.monthlyStats.netAmount || 0) >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
                ]}>
                  {(transactionViewModel.monthlyStats.netAmount || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(transactionViewModel.monthlyStats.netAmount || 0))}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="add-circle-outline"
              title="Gelir Ekle"
              color={COLORS.SUCCESS}
              onPress={() => navigateToAddTransaction(TransactionType.INCOME)}
            />
            <QuickActionButton
              icon="remove-circle-outline"
              title="Gider Ekle"
              color={COLORS.ERROR}
              onPress={() => navigateToAddTransaction(TransactionType.EXPENSE)}
            />
            <QuickActionButton
              icon="swap-horizontal-outline"
              title="Transfer"
              color={COLORS.WARNING}
              onPress={() => console.log('Transfer')}
            />
            <QuickActionButton
              icon="bar-chart-outline"
              title="Raporlar"
              color={COLORS.SECONDARY}
              onPress={() => navigation.navigate('Reports')}
            />
          </View>
        </View>

        {/* Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hesaplarım</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
              <Text style={styles.seeAllButton}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {accountViewModel?.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          ) : (
            <View style={styles.accountsList}>
              {(accountViewModel?.accounts?.length || 0) > 0 ? (
                (accountViewModel?.accounts?.slice(0, 3) || []).map((account) => (
                  <AccountCard 
                    key={account.id}
                    account={account}
                    onPress={() => navigation.navigate('Accounts')}
                  />
                ))
              ) : (
                <Card style={styles.emptyAccountsState}>
                  <Ionicons name="wallet-outline" size={32} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.emptyStateText}>Henüz hesap yok</Text>
                  <TouchableOpacity
                    style={styles.addAccountButton}
                    onPress={() => navigation.navigate('AddAccount')}
                  >
                    <Text style={styles.addAccountButtonText}>Hesap Ekle</Text>
                  </TouchableOpacity>
                </Card>
              )}
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son İşlemler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAllButton}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          <Card>
            {transactionViewModel?.isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Yükleniyor...</Text>
              </View>
            ) : (
              <View>
                {(transactionViewModel?.transactions?.slice(0, 5)?.length || 0) > 0 ? (
                  (transactionViewModel?.transactions?.slice(0, 5) || []).map((transaction, index) => (
                    <RecentTransactionItem 
                      key={transaction.id} 
                      transaction={transaction}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={48} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.emptyStateText}>Henüz işlem yok</Text>
                    <Text style={styles.emptyStateSubtext}>İlk işleminizi ekleyin</Text>
                  </View>
                )}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  greeting: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  userName: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 2,
  },
  profileButton: {
    padding: SPACING.xs,
  },
  balanceCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xxl : TYPOGRAPHY.sizes.xxxl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  balanceActions: {
    flexDirection: 'row',
  },
  balanceActionButton: {
    padding: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.md : TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  seeAllButton: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  quickActionButton: {
    alignItems: 'center',
    width: (width - SPACING.md * 2 - SPACING.sm * 3) / 4,
    marginBottom: SPACING.md,
  },
  quickActionIcon: {
    width: isSmallDevice ? 48 : 56,
    height: isSmallDevice ? 48 : 56,
    borderRadius: isSmallDevice ? 24 : 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionText: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xs : TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  accountsList: {
    paddingHorizontal: SPACING.md,
  },
  emptyAccountsState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.md,
  },
  addAccountButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  addAccountButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionInfo: {
    marginLeft: SPACING.md,
  },
  transactionDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
  },
  statsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
  },
  statAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.xs,
  },
});

export default DashboardScreen; 