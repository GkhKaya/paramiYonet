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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { WebLayout } from '../components/layout/WebLayout';
import { CategoryChart } from '../components/charts/CategoryChart';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
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
    if (score >= 70) return COLORS.SUCCESS;
    if (score >= 40) return COLORS.WARNING;
    return COLORS.ERROR;
  };

  const renderContent = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.breakdownItem}>
                Gelir: {formatCurrency(analytics.monthlyIncome)}
              </Text>
              <Text style={styles.breakdownItem}>
                Gider: {formatCurrency(analytics.monthlyExpense)}
              </Text>
              <Text style={[styles.breakdownItem, { 
                color: analytics.monthlyIncome - analytics.monthlyExpense >= 0 ? COLORS.SUCCESS : COLORS.ERROR 
              }]}>
                Net: {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
              </Text>
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
                    ? (category.trend.severity === 'danger' ? COLORS.ERROR : 
                       category.trend.severity === 'warning' ? COLORS.WARNING : COLORS.ERROR)
                    : COLORS.SUCCESS
                }]}>
                  <Ionicons 
                    name={category.trend.isIncrease ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color={COLORS.WHITE} 
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
      {reportsViewModel && (
        <>
          {/* Gider Kategorileri Grafiği */}
          {getCurrentCategories().expense.length > 0 && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={24} color={COLORS.ERROR} />
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
            </Card>
          )}

          {/* Gelir Kategorileri Grafiği */}
          {getCurrentCategories().income.length > 0 && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={24} color={COLORS.SUCCESS} />
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
            </Card>
          )}

          {/* Kategori verisi yoksa */}
          {getCurrentCategories().expense.length === 0 && getCurrentCategories().income.length === 0 && (
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
        </>
      )}
    </ScrollView>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Analizler hazırlanıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Analizler" activeRoute="analytics" navigation={navigation}>
        <View style={styles.webContent}>
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
        <Text style={styles.headerTitle}>Analizler</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setLoading(true);
            calculateAnalytics();
            setLoading(false);
          }}
        >
          <Ionicons name="refresh" size={24} color={COLORS.PRIMARY} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  webContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: SPACING.md,
    padding: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
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
    borderColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  scoreText: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  scoreSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  scoreDetails: {
    flex: 1,
  },
  scoreDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
  },
  scoreBreakdown: {
    gap: SPACING.xs,
  },
  breakdownItem: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  
  // Uyarılar
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
  },
  
  // Kategori Trendleri
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  trendLeft: {
    flex: 1,
  },
  trendCategoryName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
  trendAmount: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  trendPercentage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.WHITE,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  
  // Gelecek Ay Tahmini
  predictionContainer: {
    alignItems: 'center',
  },
  currentBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  currentBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  arrowIcon: {
    marginVertical: SPACING.sm,
  },
  futureBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  futureBalanceAmount: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.md,
  },
  predictionNote: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Hedef Hesaplayıcısı
  goalDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
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
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  goalInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.md,
  },
  goalResult: {
    backgroundColor: COLORS.SUCCESS + '10',
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  goalResultText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  goalTimeText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.SUCCESS,
    marginBottom: SPACING.xs,
  },
  goalMonthlyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  goalImpossible: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.ERROR + '10',
    padding: SPACING.md,
    borderRadius: 8,
  },
  goalImpossibleText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  emptyChartContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyChartText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyChartSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default AnalyticsScreen; 