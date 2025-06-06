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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { AccountCard } from '../components/common/AccountCard';
import { CategoryChart } from '../components/charts/CategoryChart';
import { WebLayout } from '../components/layout/WebLayout';
import { BudgetCard } from '../components/budget/BudgetCard';
import { BudgetSummary } from '../components/budget/BudgetSummary';
import { CreateBudgetModal } from '../components/budget/CreateBudgetModal';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { TransactionType } from '../models/Transaction';
import { Account, AccountType } from '../models/Account';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { ReportsViewModel } from '../viewmodels/ReportsViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ReportsScreenProps {
  navigation: any;
}

const ReportsScreen: React.FC<ReportsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const { transactionViewModel, accountViewModel: globalAccountViewModel } = useViewModels();
  const [reportsViewModel, setReportsViewModel] = useState<ReportsViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'analytics' | 'trends' | 'accounts' | 'budgets'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  
  // Analytics states
  const [goalAmount, setGoalAmount] = useState<string>('');
  const [analytics, setAnalytics] = useState({
    savingsScore: 0,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    previousMonthExpense: 0,
    futureBalance: 0,
    categoryTrends: [] as Array<{
      name: string;
      current: number;
      previous: number;
      trend: { percentage: number; isIncrease: boolean; severity: 'normal' | 'warning' | 'danger' };
    }>,
    alerts: [] as Array<{ type: 'warning' | 'danger'; message: string; category?: string }>,
  });

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';

  // Analytics calculation functions
  const calculateSavingsScore = (income: number, expense: number): number => {
    if (income === 0) return 0;
    const savingsRate = ((income - expense) / income) * 100;
    return Math.max(0, Math.min(100, savingsRate));
  };

  const calculateCategoryTrend = (currentAmount: number, previousAmount: number): { 
    percentage: number, 
    isIncrease: boolean, 
    severity: 'normal' | 'warning' | 'danger' 
  } => {
    if (previousAmount === 0) {
      return { percentage: currentAmount > 0 ? 100 : 0, isIncrease: currentAmount > 0, severity: 'normal' };
    }
    
    const percentage = ((currentAmount - previousAmount) / previousAmount) * 100;
    const isIncrease = percentage > 0;
    
    let severity: 'normal' | 'warning' | 'danger' = 'normal';
    if (isIncrease && percentage > 50) severity = 'danger';
    else if (isIncrease && percentage > 20) severity = 'warning';
    
    return { percentage: Math.abs(percentage), isIncrease, severity };
  };

  const calculateFutureBalance = (currentBalance: number, monthlyIncome: number, monthlyExpense: number): number => {
    const monthlyNet = monthlyIncome - monthlyExpense;
    return currentBalance + monthlyNet;
  };

  const calculateTimeToGoal = (currentBalance: number, goalAmount: number, monthlyIncome: number, monthlyExpense: number): { 
    months: number, 
    years: number, 
    isPossible: boolean 
  } => {
    const monthlyNet = monthlyIncome - monthlyExpense;
    
    if (monthlyNet <= 0) {
      return { months: 0, years: 0, isPossible: false };
    }
    
    const remainingAmount = goalAmount - currentBalance;
    if (remainingAmount <= 0) {
      return { months: 0, years: 0, isPossible: true };
    }
    
    const months = Math.ceil(remainingAmount / monthlyNet);
    const years = Math.floor(months / 12);
    
    return { months: months % 12, years, isPossible: true };
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatGoalAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setGoalAmount(cleaned);
  };

  // Analytics calculation function
  const calculateAnalytics = () => {
    if (!transactionViewModel || !globalAccountViewModel) return;

    const currentBalance = globalAccountViewModel.totalBalance;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Bu ayın işlemleri
    const currentMonthTransactions = transactionViewModel.transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });
    
    // Geçen ayın işlemleri
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthTransactions = transactionViewModel.transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === lastMonth && transactionDate.getFullYear() === lastMonthYear;
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousMonthExpense = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Kategori trendleri hesapla
    const categoryTrends = DEFAULT_EXPENSE_CATEGORIES.map(category => {
      const currentCategoryAmount = currentMonthTransactions
        .filter(t => t.type === 'expense' && t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const previousCategoryAmount = lastMonthTransactions
        .filter(t => t.type === 'expense' && t.category === category.name)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        name: category.name,
        current: currentCategoryAmount,
        previous: previousCategoryAmount,
        trend: calculateCategoryTrend(currentCategoryAmount, previousCategoryAmount),
      };
    }).filter(category => category.current > 0 || category.previous > 0);

    // Uyarılar oluştur
    const alerts: Array<{ type: 'warning' | 'danger'; message: string; category?: string }> = [];
    
    categoryTrends.forEach(category => {
      if (category.trend.severity === 'danger') {
        alerts.push({
          type: 'danger',
          message: `Dikkat! ${category.name} kategorisinde %${category.trend.percentage.toFixed(0)} artış var`,
          category: category.name,
        });
      } else if (category.trend.severity === 'warning') {
        alerts.push({
          type: 'warning',
          message: `${category.name} kategorisinde %${category.trend.percentage.toFixed(0)} artış`,
          category: category.name,
        });
      }
    });

    const savingsScore = calculateSavingsScore(monthlyIncome, monthlyExpense);
    const futureBalance = calculateFutureBalance(currentBalance, monthlyIncome, monthlyExpense);

    setAnalytics({
      savingsScore,
      currentBalance,
      monthlyIncome,
      monthlyExpense,
      previousMonthExpense,
      futureBalance,
      categoryTrends,
      alerts,
    });
  };

  // Initialize ReportsViewModel when user is available
  useEffect(() => {
    if (user?.id) {
      const reportsVm = new ReportsViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setReportsViewModel(reportsVm);
      setAccountViewModel(accountVm);
      // Load initial data
      accountVm.loadAccounts();
    } else {
      setReportsViewModel(null);
      setAccountViewModel(null);
    }
  }, [user?.id]);

  // Calculate analytics when data is available
  useEffect(() => {
    if (transactionViewModel && globalAccountViewModel && selectedTab === 'analytics') {
      calculateAnalytics();
    }
  }, [transactionViewModel, globalAccountViewModel, selectedTab]);

  const handleRefresh = async () => {
    if (reportsViewModel && accountViewModel) {
      setRefreshing(true);
      reportsViewModel.refreshData();
      await accountViewModel.loadAccounts();
      setTimeout(() => setRefreshing(false), 1000); // Give time for refresh
    }
  };

  // Get current data based on selected period
  const getCurrentData = () => {
    if (!reportsViewModel) return { income: 0, expense: 0, netAmount: 0, savingsRate: 0 };
    
    const summary = selectedPeriod === 'month' 
      ? reportsViewModel.monthlySummary 
      : reportsViewModel.weeklySummary;
    
    return {
      income: summary.totalIncome,
      expense: summary.totalExpense,
      netAmount: summary.netAmount,
      savingsRate: summary.savingsRate
    };
  };

  const getCurrentCategories = () => {
    if (!reportsViewModel) return { expense: [], income: [] };
    
    return selectedPeriod === 'month' 
      ? { 
          expense: reportsViewModel.monthlyExpenseCategories,
          income: reportsViewModel.monthlyIncomeCategories
        }
      : { 
          expense: reportsViewModel.weeklyExpenseCategories,
          income: reportsViewModel.weeklyIncomeCategories
        };
  };

  const currentData = getCurrentData();
  const currentCategories = getCurrentCategories();

  const handleEditAccount = (account: Account) => {
    navigation.navigate('AddAccount', { editAccount: account });
  };

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

  // Account type translation function
  const getAccountTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      cash: 'Nakit',
      debit_card: 'Banka Kartı',
      credit_card: 'Kredi Kartı',
      savings: 'Tasarruf Hesabı',
      investment: 'Yatırım Hesabı',
      gold: 'Altın Hesabı',
    };
    return typeMap[type] || type;
  };

  const handleGoldAccountDetail = (account: Account) => {
    navigation.navigate('GoldAccountDetail', { account });
  };

  // Loading state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reportsViewModel) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Raporlar hazırlanıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      <TouchableOpacity
        style={[
          styles.periodButton,
          selectedPeriod === 'week' && styles.periodButtonActive
        ]}
        onPress={() => setSelectedPeriod('week')}
      >
        <Text style={[
          styles.periodButtonText,
          selectedPeriod === 'week' && styles.periodButtonTextActive
        ]}>
          Bu Hafta
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.periodButton,
          selectedPeriod === 'month' && styles.periodButtonActive
        ]}
        onPress={() => setSelectedPeriod('month')}
      >
        <Text style={[
          styles.periodButtonText,
          selectedPeriod === 'month' && styles.periodButtonTextActive
        ]}>
          Bu Ay
        </Text>
      </TouchableOpacity>
    </View>
  );

  const TabSelector = () => (
    <View style={styles.tabSelector}>
      <View style={styles.tabScrollContainer}>
        {/* Sol Scroll Indicator */}
        <View style={styles.tabScrollIndicatorLeft}>
          <Ionicons name="chevron-back" size={14} color={COLORS.TEXT_TERTIARY} />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabScrollViewContent}
        >
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
              Özet
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'analytics' && styles.tabActive]}
            onPress={() => setSelectedTab('analytics')}
          >
            <Text style={[styles.tabText, selectedTab === 'analytics' && styles.tabTextActive]}>
              Analizler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'trends' && styles.tabActive]}
            onPress={() => setSelectedTab('trends')}
          >
            <Text style={[styles.tabText, selectedTab === 'trends' && styles.tabTextActive]}>
              Eğilimler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'accounts' && styles.tabActive]}
            onPress={() => setSelectedTab('accounts')}
          >
            <Text style={[styles.tabText, selectedTab === 'accounts' && styles.tabTextActive]}>
              Hesaplar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'budgets' && styles.tabActive]}
            onPress={() => setSelectedTab('budgets')}
          >
            <Text style={[styles.tabText, selectedTab === 'budgets' && styles.tabTextActive]}>
              Bütçeler
            </Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Sağ Scroll Indicator */}
        <View style={styles.tabScrollIndicatorRight}>
          <Ionicons name="chevron-forward" size={14} color={COLORS.TEXT_TERTIARY} />
        </View>
      </View>
    </View>
  );

  const OverviewTab = () => {
    const summary = selectedPeriod === 'month' ? reportsViewModel!.monthlySummary : reportsViewModel!.weeklySummary;
    
    return (
      <View>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: COLORS.SUCCESS + '15' }])}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up" size={24} color={COLORS.SUCCESS} />
              <Text style={styles.summaryLabel}>Gelir</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: COLORS.SUCCESS }]}>
              {formatCurrency(currentData.income)}
            </Text>
          </Card>

          <Card style={StyleSheet.flatten([styles.summaryCard, { backgroundColor: COLORS.ERROR + '15' }])}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-down" size={24} color={COLORS.ERROR} />
              <Text style={styles.summaryLabel}>Gider</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: COLORS.ERROR }]}>
              {formatCurrency(currentData.expense)}
            </Text>
          </Card>
        </View>

        {/* Net Amount Card */}
        <Card style={styles.netCard}>
          <View style={styles.netHeader}>
            <Text style={styles.netLabel}>Net Tutar</Text>
            <View style={[
              styles.netBadge,
              { backgroundColor: currentData.netAmount >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
            ]}>
              <Text style={styles.netBadgeText}>
                {currentData.netAmount >= 0 ? 'Kazanç' : 'Zarar'}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.netAmount,
            { color: currentData.netAmount >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
          ]}>
            {formatCurrency(Math.abs(currentData.netAmount))}
          </Text>
          <Text style={styles.savingsRate}>
            Tasarruf Oranı: %{currentData.savingsRate.toFixed(1)}
          </Text>
        </Card>

        {/* Comparison with Previous Period */}
        <Card style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonTitle}>
              {selectedPeriod === 'month' ? 'Önceki Ay ile Karşılaştırma' : 'Önceki Hafta ile Karşılaştırma'}
            </Text>
            <Ionicons name="analytics" size={20} color={COLORS.PRIMARY} />
          </View>
          
          {(() => {
            const previousSummary = selectedPeriod === 'month' 
              ? reportsViewModel!.previousMonthlySummary 
              : reportsViewModel!.previousWeeklySummary;
            
            const incomeChange = currentData.income - previousSummary.totalIncome;
            const expenseChange = currentData.expense - previousSummary.totalExpense;
            const incomeChangePercent = previousSummary.totalIncome > 0 
              ? ((incomeChange / previousSummary.totalIncome) * 100) 
              : 0;
            const expenseChangePercent = previousSummary.totalExpense > 0 
              ? ((expenseChange / previousSummary.totalExpense) * 100) 
              : 0;

            return (
              <View style={styles.comparisonContent}>
                {/* Income Comparison */}
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonLeft}>
                    <View style={styles.comparisonIcon}>
                      <Ionicons name="trending-up" size={16} color={COLORS.SUCCESS} />
                    </View>
                    <Text style={styles.comparisonLabel}>Gelir</Text>
                  </View>
                  <View style={styles.comparisonRight}>
                    <Text style={styles.comparisonCurrent}>
                      {formatCurrency(currentData.income)}
                    </Text>
                    <View style={styles.comparisonChange}>
                      <Ionicons 
                        name={incomeChange >= 0 ? "arrow-up" : "arrow-down"} 
                        size={12} 
                        color={incomeChange >= 0 ? COLORS.SUCCESS : COLORS.ERROR} 
                      />
                      <Text style={[
                        styles.comparisonChangeText,
                        { color: incomeChange >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
                      ]}>
                        {formatCurrency(Math.abs(incomeChange))} ({Math.abs(incomeChangePercent).toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Expense Comparison */}
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonLeft}>
                    <View style={styles.comparisonIcon}>
                      <Ionicons name="trending-down" size={16} color={COLORS.ERROR} />
                    </View>
                    <Text style={styles.comparisonLabel}>Gider</Text>
                  </View>
                  <View style={styles.comparisonRight}>
                    <Text style={styles.comparisonCurrent}>
                      {formatCurrency(currentData.expense)}
                    </Text>
                    <View style={styles.comparisonChange}>
                      <Ionicons 
                        name={expenseChange >= 0 ? "arrow-up" : "arrow-down"} 
                        size={12} 
                        color={expenseChange >= 0 ? COLORS.ERROR : COLORS.SUCCESS} 
                      />
                      <Text style={[
                        styles.comparisonChangeText,
                        { color: expenseChange >= 0 ? COLORS.ERROR : COLORS.SUCCESS }
                      ]}>
                        {formatCurrency(Math.abs(expenseChange))} ({Math.abs(expenseChangePercent).toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Previous Period Summary */}
                <View style={styles.previousPeriodSummary}>
                  <Text style={styles.previousPeriodTitle}>
                    {selectedPeriod === 'month' ? 'Önceki Ay' : 'Önceki Hafta'}:
                  </Text>
                  <Text style={styles.previousPeriodText}>
                    Gelir: {formatCurrency(previousSummary.totalIncome)} • 
                    Gider: {formatCurrency(previousSummary.totalExpense)}
                  </Text>
                </View>
              </View>
            );
          })()}
        </Card>

        {/* Quick Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>Hızlı İstatistikler</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Günlük Ortalama Gider</Text>
              <Text style={styles.statValue}>
                {formatCurrency(summary.averageDailyExpense)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>En Çok Harcanan Kategori</Text>
              <Text style={styles.statValue}>{summary.topExpenseCategory}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>İşlem Sayısı</Text>
              <Text style={styles.statValue}>{summary.transactionCount}</Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const AnalyticsTab = () => {
    // Goal calculation helpers
    const calculateGoalTime = () => {
      const goal = parseFloat(goalAmount.replace(',', '.'));
      if (!goal || goal <= 0) return null;

      return calculateTimeToGoal(
        analytics.currentBalance,
        goal,
        analytics.monthlyIncome,
        analytics.monthlyExpense
      );
    };

    const goalTime = calculateGoalTime();

    // Tasarruf skoru rengi
    const getSavingsScoreColor = (score: number) => {
      if (score >= 70) return COLORS.SUCCESS;
      if (score >= 40) return COLORS.WARNING;
      return COLORS.ERROR;
    };

    // Kategori verilerini al
    const getAnalyticsCategories = () => {
      if (!reportsViewModel) return { expense: [], income: [] };
      
      return { 
        expense: reportsViewModel.monthlyExpenseCategories,
        income: reportsViewModel.monthlyIncomeCategories
      };
    };

    const analyticsCategories = getAnalyticsCategories();

    return (
      <View>
        {/* Tasarruf Skoru */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={24} color={COLORS.WARNING} />
            <Text style={styles.sectionTitle}>Aylık Tasarruf Skoru</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreText, { color: getSavingsScoreColor(analytics.savingsScore) }]}>
                {analytics.savingsScore.toFixed(0)}
              </Text>
              <Text style={styles.scoreSubtext}>/ 100</Text>
            </View>
            
            <View style={styles.scoreDetails}>
              <Text style={styles.scoreDescription}>
                {analytics.savingsScore >= 70 ? 'Mükemmel! Harika tasarruf yapıyorsunuz.' :
                 analytics.savingsScore >= 40 ? 'İyi gidiyorsunuz, biraz daha tasarruf edebilirsiniz.' :
                 'Tasarruf oranınızı artırmaya odaklanın.'}
              </Text>
              
              <View style={styles.scoreBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gelir:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.SUCCESS }]}>
                    {formatCurrency(analytics.monthlyIncome)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gider:</Text>
                  <Text style={[styles.breakdownValue, { color: COLORS.ERROR }]}>
                    {formatCurrency(analytics.monthlyExpense)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Net:</Text>
                  <Text style={[styles.breakdownValue, { 
                    color: analytics.monthlyIncome - analytics.monthlyExpense >= 0 ? COLORS.SUCCESS : COLORS.ERROR 
                  }]}>
                    {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Uyarılar */}
        {analytics.alerts.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={24} color={COLORS.ERROR} />
              <Text style={styles.sectionTitle}>Akıllı Uyarılar</Text>
            </View>
            
            {analytics.alerts.map((alert, index) => (
              <View key={index} style={[styles.alertItem, { 
                backgroundColor: alert.type === 'danger' ? COLORS.ERROR + '10' : COLORS.WARNING + '10' 
              }]}>
                <Ionicons 
                  name={alert.type === 'danger' ? 'alert-circle' : 'warning'} 
                  size={20} 
                  color={alert.type === 'danger' ? COLORS.ERROR : COLORS.WARNING} 
                />
                <Text style={[styles.alertText, {
                  color: alert.type === 'danger' ? COLORS.ERROR : COLORS.WARNING
                }]}>
                  {alert.message}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Kategori Trendleri */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Kategorilerdeki Harcama Trendi</Text>
          </View>
          
          {analytics.categoryTrends.length > 0 ? (
            analytics.categoryTrends.map((category, index) => (
              <View key={index} style={styles.categoryTrendItem}>
                <View style={styles.trendLeft}>
                  <Text style={styles.trendCategoryName}>{category.name}</Text>
                  <Text style={styles.trendAmountText}>
                    {formatCurrency(category.current)}
                  </Text>
                </View>
                
                <View style={styles.trendRight}>
                  <View style={[styles.trendIndicator, {
                    backgroundColor: category.trend.isIncrease 
                      ? (category.trend.severity === 'danger' ? COLORS.ERROR : 
                         category.trend.severity === 'warning' ? COLORS.WARNING : COLORS.ERROR)
                      : COLORS.SUCCESS
                  }]}>
                    <Ionicons 
                      name={category.trend.isIncrease ? 'arrow-up' : 'arrow-down'} 
                      size={10} 
                      color={COLORS.WHITE} 
                    />
                    <Text style={styles.trendPercentage}>
                      {category.trend.percentage > 99 ? '99+' : category.trend.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Bu ay henüz yeterli veri yok</Text>
          )}
        </Card>

        {/* Gelecek Ay Tahmini */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.sectionTitle}>Gelecek Ay Tahmini Bakiye</Text>
          </View>
          
          <View style={styles.predictionContainer}>
            <Text style={styles.currentBalanceLabel}>Mevcut Bakiye</Text>
            <Text style={styles.currentBalanceAmount}>
              {formatCurrency(analytics.currentBalance)}
            </Text>
            
            <Ionicons name="arrow-down" size={24} color={COLORS.TEXT_SECONDARY} style={styles.arrowIcon} />
            
            <Text style={styles.futureBalanceLabel}>Tahmini Gelecek Ay Bakiyesi</Text>
            <Text style={[styles.futureBalanceAmount, {
              color: analytics.futureBalance >= analytics.currentBalance ? COLORS.SUCCESS : COLORS.ERROR
            }]}>
              {formatCurrency(analytics.futureBalance)}
            </Text>
            
            <Text style={styles.predictionNote}>
              *Mevcut aylık gelir-gider ortalamasına göre hesaplanmıştır
            </Text>
          </View>
        </Card>

        {/* Hedef Hesaplayıcısı */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag" size={24} color={COLORS.SUCCESS} />
            <Text style={styles.sectionTitle}>Hedef Hesaplayıcısı</Text>
          </View>
          
          <Text style={styles.goalDescription}>
            Ulaşmak istediğiniz tutarı girin, ne kadar süreceğini hesaplayalım:
          </Text>
          
          <View style={styles.goalInputContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <TextInput
              style={styles.goalInput}
              value={goalAmount}
              onChangeText={formatGoalAmount}
              placeholder="Hedef tutarınız"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="numeric"
            />
          </View>
          
          {goalTime && (
            <View style={styles.goalResult}>
              {goalTime.isPossible ? (
                <>
                  <Text style={styles.goalResultText}>
                    Bu hedefe ulaşmanız için:
                  </Text>
                  <Text style={styles.goalTimeText}>
                    {goalTime.years > 0 && `${goalTime.years} yıl `}
                    {goalTime.months > 0 && `${goalTime.months} ay`}
                    {goalTime.years === 0 && goalTime.months === 0 && 'Hedefinize zaten ulaşmışsınız! 🎉'}
                  </Text>
                  <Text style={styles.goalMonthlyText}>
                    Aylık net artış: {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
                  </Text>
                </>
              ) : (
                <View style={styles.goalImpossible}>
                  <Ionicons name="warning" size={20} color={COLORS.ERROR} />
                  <Text style={styles.goalImpossibleText}>
                    Mevcut harcama alışkanlıklarınızla bu hedefe ulaşmanız mümkün değil. 
                    Önce tasarruf oranınızı artırmanız gerekiyor.
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Kategori Grafikleri */}
        {analyticsCategories.expense.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={24} color={COLORS.ERROR} />
              <Text style={styles.sectionTitle}>Gider Kategorileri Dağılımı</Text>
            </View>
            <CategoryChart
              data={analyticsCategories.expense.map(cat => ({
                name: cat.name,
                value: cat.amount,
                color: cat.color,
                percentage: cat.percentage
              }))}
              title=""
              showValues={true}
            />
          </Card>
        )}

        {analyticsCategories.income.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={24} color={COLORS.SUCCESS} />
              <Text style={styles.sectionTitle}>Gelir Kategorileri Dağılımı</Text>
            </View>
            <CategoryChart
              data={analyticsCategories.income.map(cat => ({
                name: cat.name,
                value: cat.amount,
                color: cat.color,
                percentage: cat.percentage
              }))}
              title=""
              showValues={true}
            />
          </Card>
        )}

        {/* Kategori verisi yoksa */}
        {analyticsCategories.expense.length === 0 && analyticsCategories.income.length === 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart-outline" size={24} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.sectionTitle}>Kategori Analizi</Text>
            </View>
            <View style={styles.emptyChartContainer}>
              <Ionicons name="pie-chart-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyChartText}>Bu ay henüz kategori verisi yok</Text>
              <Text style={styles.emptyChartSubtext}>
                İşlem eklediğinizde kategori dağılımları burada görünecek
              </Text>
            </View>
          </Card>
        )}
      </View>
    );
  };

  const TrendsTab = () => (
    <View>
      <Card style={styles.trendsCard}>
        <Text style={styles.trendsTitle}>Son 4 Ay Trendi</Text>
        {reportsViewModel!.lastMonthsTrends.length > 0 ? (
          reportsViewModel!.lastMonthsTrends.map((month, index) => (
            <View key={index} style={styles.trendItem}>
              <View style={styles.trendLeft}>
                <Text style={styles.trendMonth}>{month.month}</Text>
                <Text style={styles.trendTransactionCount}>
                  {month.transactionCount} işlem
                </Text>
              </View>
              <View style={styles.trendRight}>
                <View style={styles.trendAmounts}>
                  <Text style={[styles.trendAmount, { color: COLORS.SUCCESS }]}>
                    +{formatCurrency(month.income)}
                  </Text>
                  <Text style={[styles.trendAmount, { color: COLORS.ERROR }]}>
                    -{formatCurrency(month.expense)}
                  </Text>
                  <Text style={[
                    styles.trendNet,
                    { color: (month.income - month.expense) >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
                  ]}>
                    {formatCurrency(Math.abs(month.income - month.expense))}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyTrends}>
            <Text style={styles.emptyTrendsText}>Henüz trend verisi yok</Text>
          </View>
        )}
      </Card>
    </View>
  );

  const AccountsTab = () => {
    if (!accountViewModel) return null;

    const allAccounts = accountViewModel.accountsWithRealTimeBalances;
    const includedAccounts = allAccounts.filter(acc => acc.includeInTotalBalance);
    const excludedAccounts = allAccounts.filter(acc => !acc.includeInTotalBalance);
    
    const goldAccounts = includedAccounts.filter(acc => acc.type === AccountType.GOLD);
    const otherAccounts = includedAccounts.filter(acc => acc.type !== AccountType.GOLD);

    return (
      <View>
        {/* Account Summary */}
        <Card style={styles.accountSummaryCard}>
          <View style={styles.accountSummaryHeader}>
            <Text style={styles.accountSummaryTitle}>Hesap Özeti</Text>
            <TouchableOpacity 
              style={styles.addAccountButton}
              onPress={() => navigation.navigate('AddAccount')}
            >
              <Ionicons name="add" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.addAccountText}>Hesap Ekle</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.totalBalanceContainer}>
            <Text style={styles.totalBalanceLabel}>Toplam Bakiye</Text>
            <Text style={styles.totalBalanceAmount}>
              {formatCurrency(accountViewModel.totalBalance)}
            </Text>
          </View>
          
          {excludedAccounts.length > 0 && (
            <View style={styles.excludedBalanceInfo}>
              <Text style={styles.excludedBalanceLabel}>
                Toplam bakiyeye dahil edilmeyen hesaplar: {excludedAccounts.length} adet
              </Text>
              <Text style={styles.excludedBalanceAmount}>
                {formatCurrency(excludedAccounts.reduce((total, acc) => total + acc.balance, 0))}
              </Text>
            </View>
          )}
        </Card>

        {/* Gold Accounts Section */}
        {goldAccounts.length > 0 && (
          <Card style={styles.goldAccountsCard}>
            <Text style={styles.goldAccountsTitle}>🏆 Altın Hesapları</Text>
            <View style={styles.accountsList}>
              {goldAccounts.map((account, index) => (
                <View key={account.id} style={[
                  styles.accountItem,
                  index === goldAccounts.length - 1 && styles.lastAccountItem
                ]}>
                  <View style={styles.accountLeft}>
                    <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                      <Ionicons 
                        name={account.icon as any} 
                        size={20} 
                        color={COLORS.WHITE} 
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.accountRight}>
                    <View>
                      <Text style={[
                        styles.accountBalance,
                        { color: account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY }
                      ]}>
                        {formatCurrency(account.balance)}
                      </Text>
                      <Text style={styles.goldGrams}>
                        {(account.goldGrams || 0).toLocaleString('tr-TR')} gram
                      </Text>
                    </View>
                    <View style={styles.accountActions}>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.goldDetailButton]}
                        onPress={() => handleGoldAccountDetail(account)}
                      >
                        <Ionicons name="analytics-outline" size={16} color={COLORS.BLACK} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Other Accounts List */}
        {otherAccounts.length > 0 && (
          <Card style={styles.accountsListCard}>
            <Text style={styles.accountsListTitle}>Diğer Hesaplar</Text>
            <View style={styles.accountsList}>
              {otherAccounts.map((account, index) => (
                <View key={account.id} style={[
                  styles.accountItem,
                  index === otherAccounts.length - 1 && styles.lastAccountItem
                ]}>
                  <View style={styles.accountLeft}>
                    <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                      <Ionicons 
                        name={account.icon as any} 
                        size={20} 
                        color={COLORS.WHITE} 
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.accountRight}>
                    <Text style={[
                      styles.accountBalance,
                      { color: account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY }
                    ]}>
                      {formatCurrency(account.balance)}
                    </Text>
                    <View style={styles.accountActions}>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Empty State */}
        {accountViewModel.accountsWithRealTimeBalances.length === 0 && (
          <Card style={styles.accountsListCard}>
            <View style={styles.emptyAccounts}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.emptyAccountsText}>Henüz hesap eklenmedi</Text>
              <TouchableOpacity 
                style={styles.addFirstAccountButton}
                onPress={() => navigation.navigate('AddAccount')}
              >
                <Text style={styles.addFirstAccountText}>İlk Hesabını Ekle</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Excluded Accounts Section */}
        {excludedAccounts.length > 0 && (
          <Card style={styles.excludedAccountsCard}>
            <Text style={styles.excludedAccountsTitle}>🚫 Toplam Bakiyeye Dahil Edilmeyen Hesaplar</Text>
            <View style={styles.accountsList}>
              {excludedAccounts.map((account, index) => (
                <View key={account.id} style={[
                  styles.accountItem,
                  index === excludedAccounts.length - 1 && styles.lastAccountItem
                ]}>
                  <View style={styles.accountLeft}>
                    <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                      <Ionicons 
                        name={account.icon as any} 
                        size={20} 
                        color={COLORS.WHITE} 
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.accountRight}>
                    {account.type === AccountType.GOLD && account.goldGrams ? (
                      <View>
                        <Text style={[
                          styles.accountBalance,
                          { color: account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY }
                        ]}>
                          {formatCurrency(account.balance)}
                        </Text>
                        <Text style={styles.goldGrams}>
                          {(account.goldGrams || 0).toLocaleString('tr-TR')} gram
                        </Text>
                      </View>
                    ) : (
                      <Text style={[
                        styles.accountBalance,
                        { color: account.balance < 0 ? COLORS.ERROR : COLORS.TEXT_PRIMARY }
                      ]}>
                        {formatCurrency(account.balance)}
                      </Text>
                    )}
                    <View style={styles.accountActions}>
                      {account.type === AccountType.GOLD && (
                        <TouchableOpacity
                          style={[styles.accountActionButton, styles.goldDetailButton]}
                          onPress={() => handleGoldAccountDetail(account)}
                        >
                          <Ionicons name="analytics-outline" size={16} color={COLORS.BLACK} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.WHITE} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}
      </View>
    );
  };

  const BudgetsTab = () => {
    const budgetSummary = reportsViewModel!.getBudgetSummary();
    
    return (
      <View>
        {/* Add Budget Button */}
        <Card style={styles.addBudgetCard}>
          <TouchableOpacity 
            style={styles.addBudgetButton}
            onPress={() => setShowCreateBudgetModal(true)}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.addBudgetText}>Yeni Bütçe Ekle</Text>
          </TouchableOpacity>
        </Card>

        {/* Budget Summary */}
        {reportsViewModel!.activeBudgets.length > 0 && (
          <View style={styles.budgetSummaryContainer}>
            <BudgetSummary
              totalBudgeted={budgetSummary.totalBudgeted}
              totalSpent={budgetSummary.totalSpent}
              activeBudgetCount={budgetSummary.activeBudgetCount}
              overBudgetCount={budgetSummary.overBudgetCount}
              status={budgetSummary.status}
            />
          </View>
        )}

        {/* Budget Cards */}
        <Card style={styles.budgetCardsCard}>
          <Text style={styles.budgetCardsTitle}>Aktif Bütçeler</Text>
          {reportsViewModel!.activeBudgets.length > 0 ? (
            reportsViewModel!.activeBudgets.map((budget) => (
              <BudgetCard 
                key={budget.id} 
                budget={budget}
                onEdit={() => {
                  // TODO: Edit budget modal
                  console.log('Edit budget:', budget.id);
                }}
                onDelete={() => {
                  Alert.alert(
                    'Bütçeyi Sil',
                    `"${budget.categoryName}" bütçesini silmek istediğinizden emin misiniz?`,
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Sil', 
                        style: 'destructive',
                        onPress: async () => {
                          const success = await reportsViewModel!.deleteBudget(budget.id);
                          if (success) {
                            Alert.alert('Başarılı', 'Bütçe silindi');
                          }
                        }
                      }
                    ]
                  );
                }}
              />
            ))
          ) : (
            <View style={styles.emptyBudgets}>
              <Ionicons name="pie-chart-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptyBudgetsText}>Henüz bütçe eklenmedi</Text>
              <Text style={styles.emptyBudgetsSubtext}>
                Harcamalarınızı kontrol etmek için bütçe ekleyin
              </Text>
            </View>
          )}
        </Card>
      </View>
    );
  };

  const renderContent = () => {
    if (reportsViewModel.isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      );
    }

    if (reportsViewModel.error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{reportsViewModel.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        {/* Period Selector */}
        <PeriodSelector />

        {/* Tab Selector */}
        <TabSelector />

        {/* Tab Content */}
        {(() => {
          switch (selectedTab) {
            case 'overview':
              return <OverviewTab />;
            case 'analytics':
              return <AnalyticsTab />;
            case 'trends':
              return <TrendsTab />;
            case 'accounts':
              return <AccountsTab />;
            case 'budgets':
              return <BudgetsTab />;
            default:
              return <OverviewTab />;
          }
        })()}
      </View>
    );
  };

  // Mobile layout
  if (!isWeb) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Raporlar</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleRefresh}>
            <Ionicons 
              name={refreshing ? "refresh" : "download-outline"} 
              size={24} 
              color={COLORS.PRIMARY} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
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
        
        {/* Create Budget Modal */}
        <CreateBudgetModal
          visible={showCreateBudgetModal}
          onClose={() => setShowCreateBudgetModal(false)}
          onSubmit={async (budgetData) => {
            if (reportsViewModel) {
              const success = await reportsViewModel.createBudget(budgetData);
              if (success) {
                Alert.alert('Başarılı', 'Bütçe oluşturuldu');
              }
              return success;
            }
            return false;
          }}
          isLoading={reportsViewModel?.isLoading || false}
        />
      </SafeAreaView>
    );
  }

  // Web layout
  return (
    <WebLayout title="Raporlar" activeRoute="reports" navigation={navigation}>
      <View style={styles.webContent}>
        {renderContent()}
      </View>
    </WebLayout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  periodButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  periodButtonTextActive: {
    color: COLORS.WHITE,
  },
  tabSelector: {
    paddingLeft: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tabScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabScrollIndicatorLeft: {
    padding: SPACING.sm,
  },
  tabScrollIndicatorRight: {
    padding: SPACING.sm,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollViewContent: {
    paddingRight: SPACING.md,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.WHITE,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    padding: SPACING.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
  },
  summaryAmount: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
  },
  comparisonCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  comparisonTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  comparisonContent: {
    padding: SPACING.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  comparisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  comparisonIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  comparisonLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  comparisonRight: {
    alignItems: 'flex-end',
  },
  comparisonCurrent: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  comparisonChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonChangeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
  },
  previousPeriodSummary: {
    marginTop: SPACING.md,
  },
  previousPeriodTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  previousPeriodText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  netCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  netHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  netLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  netBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  netBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.WHITE,
    fontWeight: '500',
  },
  netAmount: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xxl : TYPOGRAPHY.sizes.xxxl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  savingsRate: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  statsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  statsContainer: {
    gap: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  categoriesCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  categoriesTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryInfo: {
    marginLeft: SPACING.sm,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  categoryPercentage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  categoryRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  categoryAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  emptyCategory: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  trendsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  trendsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  trendLeft: {
    flex: 1,
  },
  trendMonth: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  trendTransactionCount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendAmounts: {
    alignItems: 'flex-end',
  },
  trendAmount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '500',
  },
  trendNet: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  emptyTrends: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyTrendsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  emptyChartCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  webContent: {
    flex: 1,
  },
  accountSummaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  accountSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  accountSummaryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  addAccountText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  totalBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  totalBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  accountsListCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  accountsListTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  accountsList: {
    gap: SPACING.md,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    marginLeft: SPACING.sm,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  accountType: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  accountRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  accountActionButton: {
    padding: SPACING.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  goldDetailButton: {
    backgroundColor: '#FFD700',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
  },
  emptyAccounts: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyAccountsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  addFirstAccountButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addFirstAccountText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
  },
  lastAccountItem: {
    borderBottomWidth: 0,
  },
  budgetSummaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  budgetSummaryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  budgetCardsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  budgetCardsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  emptyBudgets: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyBudgetsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptyBudgetsSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  addBudgetCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  addBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderStyle: 'dashed',
  },
  addBudgetText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    marginLeft: SPACING.xs,
  },
  goldGrams: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  goldAccountsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  goldAccountsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  excludedBalanceInfo: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
  },
  excludedBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  excludedBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  excludedAccountsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  excludedAccountsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  budgetSummaryContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  analyticsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    borderStyle: 'dashed',
  },
  analyticsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  analyticsInfo: {
    marginLeft: SPACING.sm,
  },
  analyticsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  analyticsSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  analyticsRight: {
    alignItems: 'flex-end',
  },
  section: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.PRIMARY,
  },
  scoreText: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '700',
  },
  scoreSubtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: -4,
  },
  scoreDetails: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  scoreDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  scoreBreakdown: {
    gap: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  alertText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginLeft: SPACING.sm,
    flex: 1,
    lineHeight: 18,
  },
  predictionContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  currentBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  currentBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  arrowIcon: {
    marginVertical: SPACING.sm,
  },
  futureBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  futureBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  predictionNote: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  goalInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.md,
  },
  goalResult: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  goalResultText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  goalTimeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  goalMonthlyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  goalImpossible: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  goalImpossibleText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  emptyChartContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptyChartSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  goalDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  trendCategoryName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    minWidth: 50,
    justifyContent: 'center',
  },
  trendPercentage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  categoryTrendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  trendAmountText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default ReportsScreen; 