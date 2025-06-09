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
  StatusBar,
  Platform,
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
import { useCurrency, useCategory, useDate } from '../hooks';

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

  // Custom hooks
  const { formatCurrency, currencySymbol, formatInput } = useCurrency();
  const { getDetails } = useCategory();
  const { formatShort, formatMonthYear } = useDate();

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

  // formatCurrency artık hook'tan geliyor

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
    if (Platform.OS === 'web') {
      navigation.navigate('AddAccount', { editAccount: account }, {
        animation: 'none'
      });
    } else {
      navigation.navigate('AddAccount', { editAccount: account });
    }
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
    if (Platform.OS === 'web') {
      navigation.navigate('GoldAccountDetail', { account }, {
        animation: 'none'
      });
    } else {
      navigation.navigate('GoldAccountDetail', { account });
    }
  };

  // Loading state
  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
        </View>
      </SafeAreaView>
      </>
    );
  }

  if (!reportsViewModel) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Raporlar hazırlanıyor...</Text>
        </View>
      </SafeAreaView>
      </>
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
          <Ionicons name="chevron-back" size={14} color="#666666" />
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
          <Ionicons name="chevron-forward" size={14} color="#666666" />
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
          <View style={[styles.summaryCard, { backgroundColor: '#4CAF5015' }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.summaryLabel}>Gelir</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
              {formatCurrency(currentData.income)}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#F4433615' }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-down" size={24} color="#F44336" />
              <Text style={styles.summaryLabel}>Gider</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: '#F44336' }]}>
              {formatCurrency(currentData.expense)}
            </Text>
          </View>
        </View>

        {/* Net Amount Card */}
        <View style={styles.netCard}>
          <View style={styles.netHeader}>
            <Text style={styles.netLabel}>Net Tutar</Text>
            <View style={[
              styles.netBadge,
              { backgroundColor: currentData.netAmount >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.netBadgeText}>
                {currentData.netAmount >= 0 ? 'Kazanç' : 'Zarar'}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.netAmount,
            { color: currentData.netAmount >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {currentData.netAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(currentData.netAmount))}
          </Text>
          <Text style={styles.savingsRate}>
            Tasarruf Oranı: %{currentData.savingsRate.toFixed(1)}
          </Text>
        </View>

        {/* Category Details */}
        {currentCategories.expense.length > 0 && (
          <View style={styles.categoryDetailsCard}>
            <Text style={styles.categoryDetailsTitle}>Kategori Detayları</Text>
            {currentCategories.expense.map((category, index) => (
              <View key={index} style={styles.categoryDetailItem}>
                <View style={styles.categoryDetailLeft}>
                  <CategoryIcon
                    iconName={DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === category.name)?.icon || 'help-circle-outline'}
                    color={category.color}
                    size="small"
                  />
                  <Text style={styles.categoryDetailName}>{category.name}</Text>
                </View>
                <View style={styles.categoryDetailRight}>
                  <Text style={styles.categoryDetailAmount}>
                    {formatCurrency(category.amount)}
            </Text>
                  <Text style={styles.categoryDetailPercentage}>
                    %{category.percentage.toFixed(1)}
                  </Text>
          </View>
              </View>
            ))}
          </View>
        )}
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
      if (score >= 70) return '#00E676'; // Bright Green
      if (score >= 40) return '#FF9800'; // Orange
      return '#FF1744'; // Bright Red
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
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsSectionHeader}>
            <Ionicons name="trophy" size={24} color="#FF9800" />
            <Text style={styles.analyticsSectionTitle}>Aylık Tasarruf Skoru</Text>
                    </View>
          
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCircle, { borderColor: getSavingsScoreColor(analytics.savingsScore) }]}>
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
                  <Text style={[styles.breakdownValue, { color: '#4CAF50' }]}>
                    {formatCurrency(analytics.monthlyIncome)}
                      </Text>
                    </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gider:</Text>
                  <Text style={[styles.breakdownValue, { color: '#F44336' }]}>
                    {formatCurrency(analytics.monthlyExpense)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Net:</Text>
                  <Text style={[styles.breakdownValue, { 
                    color: analytics.monthlyIncome - analytics.monthlyExpense >= 0 ? '#4CAF50' : '#F44336' 
                  }]}>
                    {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
                  </Text>
                </View>
              </View>
            </View>
                  </View>
                </View>

        {/* Uyarılar */}
        {analytics.alerts.length > 0 && (
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Ionicons name="warning" size={24} color="#F44336" />
              <Text style={styles.analyticsSectionTitle}>Akıllı Uyarılar</Text>
                    </View>
            
            {analytics.alerts.map((alert, index) => (
              <View key={index} style={[styles.alertItem, { 
                backgroundColor: alert.type === 'danger' ? '#F4433610' : '#FF980010' 
              }]}>
                <Ionicons 
                  name={alert.type === 'danger' ? 'alert-circle' : 'warning'} 
                  size={20} 
                  color={alert.type === 'danger' ? '#F44336' : '#FF9800'} 
                />
                <Text style={[styles.alertText, {
                  color: alert.type === 'danger' ? '#F44336' : '#FF9800'
                }]}>
                  {alert.message}
                </Text>
                  </View>
            ))}
          </View>
        )}

        {/* Kategori Trendleri */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsSectionHeader}>
            <Ionicons name="trending-up" size={24} color="#2196F3" />
            <Text style={styles.analyticsSectionTitle}>Kategorilerdeki Harcama Trendi</Text>
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
                      ? (category.trend.severity === 'danger' ? '#F44336' : 
                         category.trend.severity === 'warning' ? '#FF9800' : '#F44336')
                      : '#4CAF50'
                  }]}>
                      <Ionicons 
                      name={category.trend.isIncrease ? 'arrow-up' : 'arrow-down'} 
                      size={10} 
                      color="#FFFFFF" 
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
                </View>

        {/* Gelecek Ay Tahmini */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsSectionHeader}>
            <Ionicons name="calendar" size={24} color="#2196F3" />
            <Text style={styles.analyticsSectionTitle}>Gelecek Ay Tahmini Bakiye</Text>
          </View>
          
          <View style={styles.predictionContainer}>
            <Text style={styles.currentBalanceLabel}>Mevcut Bakiye</Text>
            <Text style={styles.currentBalanceAmount}>
              {formatCurrency(analytics.currentBalance)}
                  </Text>
            
            <Ionicons name="arrow-down" size={24} color="#666666" style={styles.arrowIcon} />
            
            <Text style={styles.futureBalanceLabel}>Tahmini Gelecek Ay Bakiyesi</Text>
            <Text style={[styles.futureBalanceAmount, {
              color: analytics.futureBalance >= analytics.currentBalance ? '#4CAF50' : '#F44336'
            }]}>
              {formatCurrency(analytics.futureBalance)}
            </Text>
            
            <Text style={styles.predictionNote}>
              *Mevcut aylık gelir-gider ortalamasına göre hesaplanmıştır
                  </Text>
                </View>
              </View>

        {/* Hedef Hesaplayıcısı */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsSectionHeader}>
            <Ionicons name="flag" size={24} color="#4CAF50" />
            <Text style={styles.analyticsSectionTitle}>Hedef Hesaplayıcısı</Text>
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
              placeholderTextColor="#666666"
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
                  <Ionicons name="warning" size={20} color="#F44336" />
                  <Text style={styles.goalImpossibleText}>
                    Mevcut harcama alışkanlıklarınızla bu hedefe ulaşmanız mümkün değil. 
                    Önce tasarruf oranınızı artırmanız gerekiyor.
                  </Text>
            </View>
              )}
            </View>
          )}
          </View>

        {/* Kategori Grafikleri */}
        {analyticsCategories.expense.length > 0 && (
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Ionicons name="pie-chart" size={24} color="#F44336" />
              <Text style={styles.analyticsSectionTitle}>Gider Kategorileri Dağılımı</Text>
            </View>
            <View style={styles.chartContainer}>
          <CategoryChart
                data={analyticsCategories.expense.map(cat => ({
              name: cat.name,
              value: cat.amount,
              color: cat.color,
              percentage: cat.percentage
            }))}
              />
          </View>
          </View>
        )}

        {analyticsCategories.income.length > 0 && (
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Ionicons name="pie-chart" size={24} color="#4CAF50" />
              <Text style={styles.analyticsSectionTitle}>Gelir Kategorileri Dağılımı</Text>
            </View>
            <View style={styles.chartContainer}>
          <CategoryChart
                data={analyticsCategories.income.map(cat => ({
              name: cat.name,
              value: cat.amount,
              color: cat.color,
              percentage: cat.percentage
            }))}
              />
          </View>
          </View>
        )}

        {/* Kategori verisi yoksa */}
        {analyticsCategories.expense.length === 0 && analyticsCategories.income.length === 0 && (
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Ionicons name="pie-chart-outline" size={24} color="#666666" />
              <Text style={styles.analyticsSectionTitle}>Kategori Analizi</Text>
            </View>
            <View style={styles.emptyChartContainer}>
              <Ionicons name="pie-chart-outline" size={48} color="#666666" />
              <Text style={styles.emptyChartText}>Bu ay henüz kategori verisi yok</Text>
              <Text style={styles.emptyChartSubtext}>
                İşlem eklediğinizde kategori dağılımları burada görünecek
              </Text>
            </View>
          </View>
      )}
    </View>
  );
  };

  const TrendsTab = () => (
    <View>
      <View style={styles.trendsSection}>
        <View style={styles.trendsSectionHeader}>
          <Ionicons name="trending-up" size={24} color="#2196F3" />
          <Text style={styles.trendsSectionTitle}>Son 4 Ay Trendi</Text>
        </View>
        {reportsViewModel!.lastMonthsTrends.length > 0 ? (
          reportsViewModel!.lastMonthsTrends.map((month, index) => (
            <View key={index} style={styles.trendMonthItem}>
              <View style={styles.trendMonthLeft}>
                <Text style={styles.trendMonthName}>{month.month}</Text>
                <Text style={styles.trendTransactionCount}>
                  {month.transactionCount} işlem
                </Text>
              </View>
              <View style={styles.trendMonthRight}>
                <View style={styles.trendMonthAmounts}>
                  <Text style={[styles.trendMonthAmount, { color: '#4CAF50' }]}>
                    +{formatCurrency(month.income)}
                  </Text>
                  <Text style={[styles.trendMonthAmount, { color: '#F44336' }]}>
                    -{formatCurrency(month.expense)}
                  </Text>
                  <Text style={[
                    styles.trendMonthNet,
                    { color: (month.income - month.expense) >= 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {(month.income - month.expense) >= 0 ? '+' : ''}{formatCurrency(Math.abs(month.income - month.expense))}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyTrendsContainer}>
            <Ionicons name="analytics-outline" size={48} color="#666666" />
            <Text style={styles.emptyTrendsText}>Henüz trend verisi yok</Text>
            <Text style={styles.emptyTrendsSubtext}>
              Birkaç ay işlem ekledikten sonra trendler burada görünecek
            </Text>
          </View>
        )}
      </View>
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
        <View style={styles.accountsSection}>
          <View style={styles.accountsSectionHeader}>
            <Ionicons name="wallet" size={24} color="#2196F3" />
            <Text style={styles.accountsSectionTitle}>Hesap Özeti</Text>
            <TouchableOpacity 
              style={styles.addAccountButton}
              onPress={() => {
                if (Platform.OS === 'web') {
                  navigation.navigate('AddAccount', undefined, {
                    animation: 'none'
                  });
                } else {
                  navigation.navigate('AddAccount');
                }
              }}
            >
              <Ionicons name="add" size={20} color="#2196F3" />
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
        </View>

        {/* Gold Accounts Section */}
        {goldAccounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.accountsSectionHeader}>
              <Text style={styles.goldAccountsTitle}>🏆 Altın Hesapları</Text>
            </View>
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
                        color="#FFFFFF" 
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
                        { color: account.balance < 0 ? '#F44336' : '#FFFFFF' }
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
                        <Ionicons name="analytics-outline" size={16} color="#000000" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Other Accounts List */}
        {otherAccounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.accountsSectionHeader}>
              <Text style={styles.accountsSectionTitle}>Diğer Hesaplar</Text>
            </View>
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
                        color="#FFFFFF" 
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
                      { color: account.balance < 0 ? '#F44336' : '#FFFFFF' }
                    ]}>
                      {formatCurrency(account.balance)}
                    </Text>
                    <View style={styles.accountActions}>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {accountViewModel.accountsWithRealTimeBalances.length === 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.emptyAccounts}>
              <Ionicons name="wallet-outline" size={48} color="#666666" />
              <Text style={styles.emptyAccountsText}>Henüz hesap eklenmedi</Text>
              <TouchableOpacity 
                style={styles.addFirstAccountButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    navigation.navigate('AddAccount', undefined, {
                      animation: 'none'
                    });
                  } else {
                    navigation.navigate('AddAccount');
                  }
                }}
              >
                <Text style={styles.addFirstAccountText}>İlk Hesabını Ekle</Text>
              </TouchableOpacity>
            </View>
            </View>
          )}

        {/* Excluded Accounts Section */}
        {excludedAccounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.accountsSectionHeader}>
              <Text style={styles.excludedAccountsTitle}>🚫 Toplam Bakiyeye Dahil Edilmeyen Hesaplar</Text>
            </View>
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
                        color="#FFFFFF" 
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
                          { color: account.balance < 0 ? '#F44336' : '#FFFFFF' }
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
                        { color: account.balance < 0 ? '#F44336' : '#FFFFFF' }
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
                          <Ionicons name="analytics-outline" size={16} color="#000000" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.editButton]}
                        onPress={() => handleEditAccount(account)}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accountActionButton, styles.deleteButton]}
                        onPress={() => handleDeleteAccount(account)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const BudgetsTab = () => {
    if (!reportsViewModel) {
      return <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 20 }} />;
    }

    const { activeBudgets, getBudgetSummary, deleteBudget } = reportsViewModel;
    const summary = getBudgetSummary();

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tabContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.PRIMARY} />
        }
      >
        <BudgetSummary
          totalBudgeted={summary.totalBudgeted}
          totalSpent={summary.totalSpent}
          activeBudgetCount={summary.activeBudgetCount}
          overBudgetCount={summary.overBudgetCount}
          status={summary.status}
        />

        <View style={styles.budgetListHeader}>
          <Text style={styles.budgetListTitle}>Aktif Bütçeler</Text>
          <TouchableOpacity 
            style={styles.addBudgetButton} 
            onPress={() => setShowCreateBudgetModal(true)}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>

        {activeBudgets.length > 0 ? (
          activeBudgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => {
                Alert.alert('Bütçe Düzenle', `Bu özellik yakında eklenecektir.`);
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
                            const success = await deleteBudget(budget.id);
                            if (success) {
                                Alert.alert('Başarılı', 'Bütçe silindi');
                            } else {
                                Alert.alert('Hata', 'Bütçe silinirken bir sorun oluştu.');
                            }
                         }
                       }
                     ]
                   );
                 }}
            />
          ))
        ) : (
          <View style={styles.emptyBudgetsContainer}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.emptyBudgetsTitle}>Henüz Bütçe Oluşturulmadı</Text>
            <Text style={styles.emptyBudgetsText}>
              Yukarıdaki '+' butonuna basarak ilk bütçenizi oluşturun.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (reportsViewModel.isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      );
    }

    if (reportsViewModel.error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{reportsViewModel.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
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

  if (!reportsViewModel || !accountViewModel) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BACKGROUND }}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <WebLayout title="Raporlar">
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle={isWeb ? 'dark-content' : 'light-content'} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Raporlar</Text>
        </View>

        <TabSelector />

        {renderContent()}

        {reportsViewModel && (
          <CreateBudgetModal
            visible={showCreateBudgetModal}
            onClose={() => setShowCreateBudgetModal(false)}
            onSubmit={async (data) => {
              const success = await reportsViewModel.budgetViewModel.createBudget(data);
              if (success) {
                Alert.alert('Başarılı', 'Yeni bütçe başarıyla oluşturuldu.');
                setShowCreateBudgetModal(false);
              } else {
                Alert.alert('Hata', reportsViewModel.budgetViewModel.error || 'Bütçe oluşturulurken bir hata oluştu.');
              }
              return success; 
            }}
            isLoading={reportsViewModel.budgetViewModel.isLoading}
          />
        )}
        
      </SafeAreaView>
    </WebLayout>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  webContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  emptyStateText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336', // Red error text
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2196F3', // Blue button
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#111111', // Dark background
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333333',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3', // Blue active state
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666', // Gray inactive text
  },
  periodButtonTextActive: {
    color: '#FFFFFF', // White active text
  },
  tabSelector: {
    marginBottom: 16,
  },
  tabScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabScrollIndicatorLeft: {
    padding: 8,
  },
  tabScrollIndicatorRight: {
    padding: 8,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollViewContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#111111', // Dark button background
    borderWidth: 1,
    borderColor: '#333333',
  },
  tabActive: {
    backgroundColor: '#2196F3', // Blue active state
    borderColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666', // Gray inactive text
  },
  tabTextActive: {
    color: '#FFFFFF', // White active text
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  netCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  netHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  netBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  netBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  netAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  savingsRate: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  chartCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 16,
  },
  categoryDetailsCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  categoryDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 16,
  },
  categoryDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  categoryDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDetailName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginLeft: 12,
  },
  categoryDetailRight: {
    alignItems: 'flex-end',
  },
  categoryDetailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  categoryDetailPercentage: {
    fontSize: 12,
    color: '#666666', // Gray text
    marginTop: 2,
  },
  trendsSection: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  trendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  trendMonthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  trendMonthLeft: {
    flex: 1,
  },
  trendMonthName: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  trendTransactionCount: {
    fontSize: 12,
    color: '#666666', // Gray text
    marginTop: 4,
  },
  trendMonthRight: {
    alignItems: 'flex-end',
  },
  trendMonthAmounts: {
    alignItems: 'flex-end',
  },
  trendMonthAmount: {
    fontSize: 12,
    fontWeight: '500',
  },
  trendMonthNet: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyTrendsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTrendsText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 12,
  },
  emptyTrendsSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
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
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111', // Dark background
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  addBudgetText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
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
    backgroundColor: '#000000', // Black background
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreSubtext: {
    fontSize: 12,
    color: '#666666', // Gray text
    marginTop: -4,
  },
  scoreDetails: {
    flex: 1,
    marginLeft: 24,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 16,
    lineHeight: 20,
  },
  scoreBreakdown: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  predictionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  currentBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 4,
  },
  currentBalanceAmount: {
    fontSize: 18,
    color: '#FFFFFF', // White text
    fontWeight: '700',
    marginBottom: 16,
  },
  arrowIcon: {
    marginVertical: 12,
  },
  futureBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 4,
  },
  futureBalanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  predictionNote: {
    fontSize: 12,
    color: '#666666', // Gray text
    textAlign: 'center',
    fontStyle: 'italic',
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111', // Dark background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#FFFFFF', // White text
    fontWeight: '600',
    marginRight: 8,
  },
  goalInput: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF', // White text
    paddingVertical: 16,
  },
  goalResult: {
    marginTop: 16,
    alignItems: 'center',
  },
  goalResultText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  goalTimeText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  goalMonthlyText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
  },
  goalImpossible: {
    marginTop: 16,
    alignItems: 'center',
  },
  goalImpossibleText: {
    fontSize: 14,
    color: '#F44336', // Red text
    textAlign: 'center',
  },
  analyticsSection: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  analyticsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  categoryTrendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  trendLeft: {
    flex: 1,
  },
  trendCategoryName: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  trendAmountText: {
    fontSize: 14,
    color: '#2196F3', // Blue text
    fontWeight: '600',
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    minWidth: 50,
    justifyContent: 'center',
  },
  trendPercentage: {
    fontSize: 12,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    padding: 24,
  },
  goalDescription: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  emptyChartContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
  },
  accountsSection: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  accountsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  accountsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  addAccountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  totalBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
    fontWeight: '600',
  },
  totalBalanceAmount: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  excludedBalanceInfo: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
  },
  excludedBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 4,
  },
  excludedBalanceAmount: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  goldAccountsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  excludedAccountsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  accountsList: {
    gap: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
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
    marginLeft: 12,
  },
  accountName: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  accountType: {
    fontSize: 12,
    color: '#666666', // Gray text
  },
  accountRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  accountBalance: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  accountActionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  goldDetailButton: {
    backgroundColor: '#FFD700',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  emptyAccounts: {
    padding: 24,
    alignItems: 'center',
  },
  emptyAccountsText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 12,
  },
  addFirstAccountButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addFirstAccountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  lastAccountItem: {
    borderBottomWidth: 0,
  },
  goldGrams: {
    fontSize: 12,
    color: '#666666', // Gray text
    marginTop: 4,
  },
  accountSummaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  budgetsSection: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginBottom: 16,
  },
  budgetsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  // Budget Styles
  addBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#111111', // Dark background
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  addBudgetText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyBudgets: {
    padding: 24,
    alignItems: 'center',
  },
  emptyBudgetsText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 12,
  },
  emptyBudgetsSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
  },
  tabContentContainer: {
    padding: SPACING.MEDIUM,
    paddingBottom: 100, // Make space for floating action button if any
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LARGE,
    marginTop: 50,
  },
  placeholderTitle: {
    ...TYPOGRAPHY.H3,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.MEDIUM,
  },
  placeholderText: {
    ...TYPOGRAPHY.BODY,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.SMALL,
  },
  emptyBudgetsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LARGE,
    marginTop: SPACING.LARGE,
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 16,
  },
  emptyBudgetsTitle: {
    ...TYPOGRAPHY.H4,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MEDIUM,
  },
  emptyBudgetsText: {
    ...TYPOGRAPHY.BODY,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.X_SMALL,
  },
  budgetListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.LARGE,
    marginBottom: SPACING.MEDIUM,
    paddingHorizontal: SPACING.X_SMALL,
  },
  budgetListTitle: {
    ...TYPOGRAPHY.H2,
    color: COLORS.TEXT_PRIMARY,
  },
  addBudgetButton: {
    padding: SPACING.X_SMALL,
  },
});

export default ReportsScreen; 