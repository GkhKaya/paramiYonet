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
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/common/Card';
import { AccountCard } from '../components/common/AccountCard';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { ProgressCircle } from '../components/charts/ProgressCircle';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { Account, AccountType } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { isWeb, getResponsiveColumns } from '../utils/platform';
import { useCurrency, useCategory, useDate } from '../hooks';
import { RecurringPaymentService } from '../services/RecurringPaymentService';

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

  // Custom hooks
  const { formatCurrency, currencySymbol } = useCurrency();
  const { getDetails } = useCategory();
  const { formatShort } = useDate();
  
  // Initialize ViewModels with user ID when available
  useEffect(() => {
    if (user?.id) {
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
      
      // Load initial data
      transactionVm.loadTransactions();
      accountVm.loadAccounts();
    } else {
      setTransactionViewModel(null);
      setAccountViewModel(null);
    }
  }, [user?.id]);

  // Refresh data when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (transactionViewModel && accountViewModel) {
        transactionViewModel.loadTransactions();
        accountViewModel.loadAccounts();
      }
    }, [transactionViewModel, accountViewModel])
  );

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
  
  const formatAccountBalance = (balance: number) => {
    return formatCurrency(balance);
  };

  const formatTransactionDate = (date: Date) => {
    return formatShort(date);
  };

  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    return getDetails(categoryName, type);
  };

  const navigateToAddTransaction = (type: TransactionType) => {
    navigation.navigate('AddTransaction', { defaultType: type });
  };

  // Calculate financial summaries
  const getFinancialSummary = () => {
    if (!transactionViewModel?.transactions) {
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0 };
    }

    const totalIncome = transactionViewModel.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactionViewModel.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netProfit };
  };

  const getAccountsSummary = () => {
    if (!accountViewModel?.accounts) {
      return [];
    }

    // Return individual accounts sorted by balance (positive first, then negative)
    const result = accountViewModel.accounts
      .filter(account => account.isActive) // Only show active accounts
      .sort((a, b) => {
        if (a.balance >= 0 && b.balance >= 0) {
          return b.balance - a.balance; // Positive: highest first
        }
        if (a.balance < 0 && b.balance < 0) {
          return b.balance - a.balance; // Negative: closest to zero first
        }
        if (a.balance >= 0 && b.balance < 0) {
          return -1; // Positive comes before negative
        }
        return 1; // Negative comes after positive
      });
    
    return result;
  };

  const handleRefresh = async () => {
    await onRefresh();
  };

  // Debug function to recalculate balances
  const handleRecalculateBalances = async () => {
    if (!accountViewModel) return;
    
    setRefreshing(true);
    const success = await accountViewModel.recalculateBalancesFromTransactions();
    if (success) {
      Alert.alert('Başarılı', 'Hesap bakiyeleri yeniden hesaplandı');
    } else {
      Alert.alert('Hata', 'Bakiye hesaplama sırasında hata oluştu');
    }
    setRefreshing(false);
  };

  // Handle account editing
  const handleEditAccount = (account: Account) => {
    navigation.navigate('AddAccount', { editAccount: account });
  };

  // Handle account deletion
  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Hesabı Sil',
      `"${account.name}" hesabını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (accountViewModel) {
              const success = await accountViewModel.deleteAccount(account.id);
              if (success) {
                Alert.alert('Başarılı', 'Hesap başarıyla silindi');
              } else {
                Alert.alert('Hata', 'Hesap silinirken hata oluştu');
              }
            }
          }
        }
      ]
    );
  };

  // Test function for recurring payments
  const handleProcessRecurringPayments = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await RecurringPaymentService.processRecurringPayments(user.id);
      Alert.alert('Başarılı', 'Düzenli ödemeler işlendi');
      // Refresh data to show new transactions
      await onRefresh();
    } catch (error) {
      console.error('Error processing recurring payments:', error);
      Alert.alert('Hata', 'Düzenli ödemeler işlenirken hata oluştu');
    } finally {
      setRefreshing(false);
    }
  };

  // Web-specific responsive grid layout
  const ResponsiveGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const columns = getResponsiveColumns();
    const childrenArray = React.Children.toArray(children);
    
    if (!isWeb || columns === 1) {
      return <>{children}</>;
    }

    const rows = [];
    for (let i = 0; i < childrenArray.length; i += columns) {
      rows.push(childrenArray.slice(i, i + columns));
    }

    return (
      <View>
        {rows.map((row, index) => (
          <View key={index} style={styles.webGridRow}>
            {row.map((child, childIndex) => (
              <View key={childIndex} style={styles.webGridItem}>
                {child}
              </View>
            ))}
            {/* Fill empty columns */}
            {row.length < columns && 
              Array.from({ length: columns - row.length }).map((_, emptyIndex) => (
                <View key={`empty-${emptyIndex}`} style={styles.webGridItem} />
              ))
            }
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (!user) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
        </View>
      );
    }

    if (!accountViewModel || !transactionViewModel) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Dashboard yükleniyor...</Text>
        </View>
      );
    }

    return (
      <View style={styles.dashboardContainer}>
        {/* Main Section - Quick Actions & Recent Transactions */}
        <View style={styles.mainSection}>
          <ResponsiveGrid>
            {/* Recent Transactions Card */}
            <Card style={styles.recentTransactionsCard}>
              {/* Header */}
              <View style={styles.recentTransactionsHeader}>
                <View style={styles.recentTransactionsTitle}>
                  <Ionicons name="time-outline" size={24} color={COLORS.PRIMARY} />
                  <Text style={styles.recentTransactionsText}>Son İşlemler</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Transactions')}
                >
                  <Text style={styles.viewAllButtonText}>Tümünü Gör</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              {transactionViewModel.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                  <Text style={styles.loadingText}>İşlemler yükleniyor...</Text>
                </View>
              ) : transactionViewModel.transactions.length > 0 ? (
                <View style={styles.recentTransactionsList}>
                  {transactionViewModel.transactions.slice(0, 3).map((transaction: any, index: number) => (
                    <TouchableOpacity 
                      key={transaction.id} 
                      style={[
                        styles.recentTransactionItem,
                        index === transactionViewModel.transactions.slice(0, 3).length - 1 && styles.lastTransactionItem
                      ]}
                      onPress={() => navigation.navigate('Transactions')}
                    >
                      <View style={styles.transactionIconWrapper}>
                        <CategoryIcon
                          iconName={transaction.categoryIcon || 'receipt'}
                          color={getCategoryDetails(transaction.category, transaction.type).color}
                          size="small"
                        />
                      </View>
                      
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionTitle}>{transaction.description}</Text>
                        <View style={styles.transactionSubInfo}>
                          <Text style={styles.transactionCat}>{transaction.category}</Text>
                          <Text style={styles.transactionDot}>•</Text>
                          <Text style={styles.transactionTime}>{formatTransactionDate(transaction.date)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.transactionAmountWrapper}>
                        <Text style={[
                          styles.recentTransactionAmount,
                          { color: transaction.type === 'income' ? COLORS.SUCCESS : COLORS.ERROR }
                        ]}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </Text>
                        <View style={[
                          styles.transactionTypeIndicator,
                          { backgroundColor: transaction.type === 'income' ? COLORS.SUCCESS : COLORS.ERROR }
                        ]}>
                          <Ionicons 
                            name={transaction.type === 'income' ? 'trending-up' : 'trending-down'} 
                            size={12} 
                            color={COLORS.WHITE} 
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRecentTransactions}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="receipt-outline" size={32} color={COLORS.TEXT_TERTIARY} />
                  </View>
                  <Text style={styles.emptyTitle}>Henüz işlem yok</Text>
                  <Text style={styles.emptyDescription}>İlk işleminizi ekleyin ve burada görün</Text>
                  <TouchableOpacity 
                    style={styles.addFirstTransactionButton}
                    onPress={() => navigation.navigate('AddTransaction')}
                  >
                    <Ionicons name="add" size={20} color={COLORS.WHITE} />
                    <Text style={styles.addFirstTransactionText}>İşlem Ekle</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </ResponsiveGrid>
        </View>

        {/* Financial Summary */}
        <View style={styles.bottomSection}>
          <Card style={styles.financialSummaryCard}>
            <Text style={styles.cardTitle}>Finansal Özet</Text>
            
            {/* Profit/Loss Section */}
            <View style={styles.profitLossSection}>
              {(() => {
                const { totalIncome, totalExpenses, netProfit } = getFinancialSummary();
                const isProfit = netProfit >= 0;
                const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
                
                return (
                  <>
                    {/* Top row with profit/loss and progress circle */}
                    <View style={styles.profitLossTopRow}>
                      <View style={styles.profitLossLeft}>
                        <View style={styles.profitLossHeader}>
                          <View style={[styles.profitLossIcon, { backgroundColor: isProfit ? COLORS.SUCCESS : COLORS.ERROR }]}>
                            <Ionicons 
                              name={isProfit ? 'trending-up' : 'trending-down'} 
                              size={20} 
                              color={COLORS.WHITE} 
                            />
                          </View>
                          <View style={styles.profitLossInfo}>
                            <Text style={styles.profitLossLabel}>
                              {isProfit ? 'Net Kar' : 'Net Zarar'}
                            </Text>
                            <Text style={[
                              styles.profitLossAmount,
                              { color: isProfit ? COLORS.SUCCESS : COLORS.ERROR }
                            ]}>
                              {isProfit ? '+' : ''}{formatCurrency(Math.abs(netProfit))}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Progress Circle */}
                      <View style={styles.progressCircleContainer}>
                        <ProgressCircle
                          percentage={Math.min(expenseRatio, 100)}
                          size="small"
                          centerSubText="Gider Oranı"
                          progressColor={expenseRatio > 80 ? COLORS.ERROR : expenseRatio > 60 ? COLORS.WARNING : COLORS.SUCCESS}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.incomeExpenseRow}>
                      <View style={styles.incomeExpenseItem}>
                        <Text style={styles.incomeExpenseLabel}>Toplam Gelir</Text>
                        <Text style={[styles.incomeExpenseAmount, { color: COLORS.SUCCESS }]}>
                          +{formatCurrency(totalIncome)}
                        </Text>
                      </View>
                      <View style={styles.incomeExpenseItem}>
                        <Text style={styles.incomeExpenseLabel}>Toplam Gider</Text>
                        <Text style={[styles.incomeExpenseAmount, { color: COLORS.ERROR }]}>
                          -{formatCurrency(totalExpenses)}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>

            {/* Account Types Section */}
            {getAccountsSummary().length > 0 && (
              <>
                <View style={styles.sectionDivider} />
                <View style={styles.accountTypesSection}>
                  <Text style={styles.sectionSubtitle}>En Yüksek Bakiyeli Hesaplar</Text>
                  <View style={styles.accountTypesList}>
                    {getAccountsSummary().slice(0, 3).map((account, index) => {
                      const typeInfo = getAccountTypeInfo(account.type);
                      return (
                        <View key={account.id} style={styles.accountTypeItem}>
                          <View style={styles.accountTypeLeft}>
                            <View style={[styles.accountTypeIcon, { backgroundColor: typeInfo.color }]}>
                              <Ionicons name={typeInfo.icon as any} size={14} color={COLORS.WHITE} />
                            </View>
                            <View style={styles.accountTypeInfo}>
                              <Text style={styles.accountTypeName}>{account.name}</Text>
                              <Text style={styles.accountTypeCount}>{typeInfo.name}</Text>
                            </View>
                          </View>
                          <Text style={[
                            styles.accountTypeBalance,
                            { color: account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY }
                          ]}>
                            {formatAccountBalance(account.balance)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </Card>
        </View>
      </View>
    );
  };

  // Helper function for account type info
  const getAccountTypeInfo = (type: string) => {
    const typeMap: { [key: string]: { name: string; icon: string; color: string } } = {
      cash: { name: 'Nakit', icon: 'cash', color: COLORS.SUCCESS },
      debit_card: { name: 'Banka Kartı', icon: 'card', color: COLORS.PRIMARY },
      credit_card: { name: 'Kredi Kartı', icon: 'card-outline', color: COLORS.ERROR },
      savings: { name: 'Tasarruf', icon: 'wallet', color: COLORS.WARNING },
      investment: { name: 'Yatırım', icon: 'trending-up', color: COLORS.SECONDARY },
    };
    return typeMap[type] || { name: type, icon: 'help', color: COLORS.TEXT_SECONDARY };
  };

  // Render accounts management section
  const renderAccountsSection = () => {
    if (!accountViewModel?.accounts || accountViewModel.accounts.length === 0) {
      return (
        <View style={styles.accountsSection}>
          <Card style={styles.accountsCard}>
            <Text style={styles.cardTitle}>Hesaplarım</Text>
            <View style={styles.emptyAccountsState}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.emptyStateText}>Henüz hesap yok</Text>
              <Text style={styles.emptySubtext}>İlk hesabınızı oluşturun</Text>
              <TouchableOpacity
                style={styles.addAccountButton}
                onPress={() => navigation.navigate('AddAccount')}
              >
                <Text style={styles.addAccountButtonText}>Hesap Oluştur</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.accountsSection}>
        <Card style={styles.accountsCard}>
          <View style={styles.accountsHeader}>
            <Text style={styles.cardTitle}>Hesaplarım</Text>
            <TouchableOpacity
              style={styles.addAccountIconButton}
              onPress={() => navigation.navigate('AddAccount')}
            >
              <Ionicons name="add" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.accountsList}>
            {accountViewModel.accounts.map((account, index) => {
              const typeInfo = getAccountTypeInfo(account.type);
              return (
                <View key={account.id} style={[
                  styles.accountListItem,
                  index === accountViewModel.accounts.length - 1 && styles.lastAccountItem
                ]}>
                  <View style={styles.accountItemLeft}>
                    <View style={[styles.accountItemIcon, { backgroundColor: account.color }]}>
                      <Ionicons 
                        name={account.icon as any} 
                        size={20} 
                        color={COLORS.WHITE} 
                      />
                    </View>
                    <View style={styles.accountItemInfo}>
                      <Text style={styles.accountItemName}>{account.name}</Text>
                      <Text style={styles.accountItemType}>{typeInfo.name}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.accountItemRight}>
                    <Text style={[
                      styles.accountItemBalance,
                      { color: account.type === AccountType.CREDIT_CARD ? 
                          COLORS.ERROR : 
                          (account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY) 
                      }
                    ]}>
                      {account.type === AccountType.CREDIT_CARD ? 
                        `- ${formatAccountBalance(account.currentDebt || 0)}` : 
                        formatAccountBalance(account.balance)
                      }
                    </Text>
                    <View style={styles.accountItemActions}>
                      <TouchableOpacity
                        style={styles.accountActionButton}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.PRIMARY} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.accountActionButton}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      </View>
    );
  };

  // Mobile layout
  if (!isWeb) {
    return (
      <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : ['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={handleProcessRecurringPayments}>
              <Ionicons 
                name="repeat-outline" 
                size={20} 
                color={COLORS.SUCCESS} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Ionicons 
                name={refreshing ? "refresh" : "refresh-outline"} 
                size={24} 
                color={COLORS.PRIMARY} 
              />
            </TouchableOpacity>
          </View>
        </View>

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
          {renderAccountsSection()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Web layout
  return (
    <WebLayout title="Dashboard" activeRoute="dashboard" navigation={navigation}>
      <View style={styles.webContainer}>
        {renderContent()}
        {renderAccountsSection()}
      </View>
    </WebLayout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
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
    ...(Platform.OS === 'ios' && { paddingTop: 50 }),
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.md : TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: SPACING.xs,
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
  section: {
    marginBottom: SPACING.xl,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
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
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
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
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryAmount: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xxl : TYPOGRAPHY.sizes.xxxl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryIcon: {
    padding: SPACING.xs,
  },
  summaryDetails: {
    padding: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  actionsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  actionButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  actionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  transactionsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  transactionsList: {
    paddingVertical: SPACING.sm,
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  accountTypesCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  accountTypesList: {
    paddingVertical: SPACING.xs,
  },
  accountTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  accountTypeName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  accountTypeBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webGridRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
    width: '100%',
  },
  webGridItem: {
    flex: 1,
    minWidth: 0, // Allow items to shrink
  },
  dashboardContainer: {
    flex: 1,
  },
  mainSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  bottomSection: {
    paddingHorizontal: SPACING.md,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  transactionCategory: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  recentTransactionsCard: {
    marginBottom: SPACING.lg,
  },
  recentTransactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  recentTransactionsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTransactionsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  recentTransactionsList: {
    paddingVertical: SPACING.sm,
  },
  recentTransactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  lastTransactionItem: {
    borderBottomWidth: 0,
  },
  transactionIconWrapper: {
    marginRight: SPACING.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  transactionSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionCat: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionDot: {
    marginHorizontal: SPACING.xs,
  },
  transactionTime: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  transactionAmountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTransactionAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  transactionTypeIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
  emptyRecentTransactions: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  emptyDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  addFirstTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  addFirstTransactionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: SPACING.xs,
  },
  financialSummaryCard: {
    marginBottom: SPACING.lg,
  },
  profitLossSection: {
    padding: SPACING.md,
  },
  profitLossTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  profitLossLeft: {
    flex: 1,
  },
  profitLossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  profitLossIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  profitLossInfo: {
    flex: 1,
  },
  profitLossLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  profitLossAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  progressCircleContainer: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeExpenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  incomeExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeExpenseLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.xs,
  },
  incomeExpenseAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.sm,
  },
  accountTypesSection: {
    padding: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  accountTypeInfo: {
    flex: 1,
  },
  accountTypeCount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  accountsSection: {
    marginBottom: SPACING.xl,
  },
  accountsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  addAccountIconButton: {
    padding: SPACING.xs,
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  accountItemInfo: {
    flex: 1,
  },
  accountItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountItemName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  accountItemType: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  accountItemBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  accountItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountActionButton: {
    padding: SPACING.xs,
  },
  accountListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  lastAccountItem: {
    borderBottomWidth: 0,
  },
  accountTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
});

export default DashboardScreen; 