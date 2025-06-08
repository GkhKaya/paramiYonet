import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { WebLayout } from '../components/layout/WebLayout';
import { CategoryChart } from '../components/charts/CategoryChart';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { ReportsViewModel } from '../viewmodels/ReportsViewModel';
import { isWeb } from '../utils/platform';
import { DEFAULT_EXPENSE_CATEGORIES } from '../models/Category';

interface AnalyticsScreenProps {
  navigation: any;
}

// Analiz hesaplama fonksiyonları
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

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const { transactionViewModel, accountViewModel } = useViewModels();
  
  // States
  const [goalAmount, setGoalAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [reportsViewModel, setReportsViewModel] = useState<ReportsViewModel | null>(null);
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

  // Formatters
  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatGoalAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setGoalAmount(cleaned);
  };

  // Kategori verilerini al
  const getCurrentCategories = () => {
    if (!reportsViewModel) return { expense: [], income: [] };
    
    return { 
      expense: reportsViewModel.monthlyExpenseCategories,
      income: reportsViewModel.monthlyIncomeCategories
    };
  };

  // Analiz verilerini hesapla
  const calculateAnalytics = () => {
    if (!transactionViewModel || !accountViewModel) return;

    const currentBalance = accountViewModel.totalBalance;
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

  // Sayfa yüklendiğinde analizleri hesapla
  useEffect(() => {
    if (transactionViewModel && accountViewModel) {
      setLoading(true);
      calculateAnalytics();
      setLoading(false);
    }
  }, [transactionViewModel, accountViewModel]);

  // ReportsViewModel'i initialize et
  useEffect(() => {
    if (user?.id) {
      const reportsVm = new ReportsViewModel(user.id);
      setReportsViewModel(reportsVm);
    } else {
      setReportsViewModel(null);
    }
  }, [user?.id]);

  // Hedef hesaplama
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
    if (score >= 70) return '#00E676'; // Bright Success color
    if (score >= 40) return '#FF9800'; // Warning color
    return '#FF1744'; // Bright Error color
  };

  const renderContent = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Tasarruf Skoru */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={24} color="#FF9800" />
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
              <Text style={styles.breakdownItem}>
                Gelir: {formatCurrency(analytics.monthlyIncome)}
              </Text>
              <Text style={styles.breakdownItem}>
                Gider: {formatCurrency(analytics.monthlyExpense)}
              </Text>
              <Text style={[styles.breakdownItem, { 
                color: analytics.monthlyIncome - analytics.monthlyExpense >= 0 ? '#00E676' : '#FF1744' 
              }]}>
                Net: {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Uyarılar */}
      {analytics.alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={24} color="#F44336" />
            <Text style={styles.sectionTitle}>Akıllı Uyarılar</Text>
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={24} color="#2196F3" />
          <Text style={styles.sectionTitle}>Kategorilerdeki Harcama Trendi</Text>
        </View>
        
        {analytics.categoryTrends.length > 0 ? (
          analytics.categoryTrends.map((category, index) => (
            <View key={index} style={styles.trendItem}>
              <View style={styles.trendLeft}>
                <Text style={styles.trendCategoryName}>{category.name}</Text>
                <Text style={styles.trendAmount}>
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
                    size={12} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.trendPercentage}>
                    %{category.trend.percentage.toFixed(0)}
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={24} color="#2196F3" />
          <Text style={styles.sectionTitle}>Gelecek Ay Tahmini Bakiye</Text>
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
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flag" size={24} color="#4CAF50" />
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
      {reportsViewModel && (
        <>
          {/* Gider Kategorileri Grafiği */}
          {getCurrentCategories().expense.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={24} color="#F44336" />
                <Text style={styles.sectionTitle}>Gider Kategorileri Dağılımı</Text>
              </View>
              <CategoryChart
                data={getCurrentCategories().expense.map(cat => ({
                  name: cat.name,
                  value: cat.amount,
                  color: cat.color,
                  percentage: cat.percentage
                }))}
                title=""
                showValues={true}
              />
            </View>
          )}

          {/* Gelir Kategorileri Grafiği */}
          {getCurrentCategories().income.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Gelir Kategorileri Dağılımı</Text>
              </View>
              <CategoryChart
                data={getCurrentCategories().income.map(cat => ({
                  name: cat.name,
                  value: cat.amount,
                  color: cat.color,
                  percentage: cat.percentage
                }))}
                title=""
                showValues={true}
              />
            </View>
          )}

          {/* Kategori verisi yoksa */}
          {getCurrentCategories().expense.length === 0 && getCurrentCategories().income.length === 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart-outline" size={24} color="#666666" />
                <Text style={styles.sectionTitle}>Kategori Analizi</Text>
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
        </>
      )}
    </ScrollView>
  );

  // Loading state
  if (loading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Analizler hazırlanıyor...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Analizler" activeRoute="analytics" navigation={navigation}>
        <View style={[styles.webContent, styles.webContainer]}>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analizler</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              setLoading(true);
              calculateAnalytics();
              setLoading(false);
            }}
          >
            <Ionicons name="refresh" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {renderContent()}
      </SafeAreaView>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666', // Gray text
  },
  webContent: {
    flex: 1,
    padding: 20,
  },
  webContainer: {
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  refreshButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 20,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  
  // Tasarruf Skoru
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  scoreDetails: {
    flex: 1,
  },
  scoreDescription: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 16,
  },
  scoreBreakdown: {
    gap: 4,
  },
  breakdownItem: {
    fontSize: 14,
    color: '#FFFFFF', // White text
  },
  
  // Uyarılar
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  
  // Kategori Trendleri
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  trendLeft: {
    flex: 1,
  },
  trendCategoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // White text
  },
  trendAmount: {
    fontSize: 12,
    color: '#666666', // Gray text
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendPercentage: {
    fontSize: 12,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    padding: 20,
  },
  
  // Gelecek Ay Tahmini
  predictionContainer: {
    alignItems: 'center',
  },
  currentBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  currentBalanceAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 16,
  },
  arrowIcon: {
    marginVertical: 8,
  },
  futureBalanceLabel: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  futureBalanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  predictionNote: {
    fontSize: 12,
    color: '#666666', // Gray text
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Hedef Hesaplayıcısı
  goalDescription: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 16,
  },
  goalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a', // Dark surface
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginRight: 4,
  },
  goalInput: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF', // White text
    paddingVertical: 16,
  },
  goalResult: {
    backgroundColor: '#4CAF5010',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalResultText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  goalTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  goalMonthlyText: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  goalImpossible: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F4433610',
    padding: 16,
    borderRadius: 8,
  },
  goalImpossibleText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  emptyChartContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#666666', // Gray text
    marginTop: 8,
    textAlign: 'center',
  },
  emptyChartSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
  },
});

export default AnalyticsScreen; 