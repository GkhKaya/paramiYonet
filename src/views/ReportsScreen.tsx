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
import { CategoryIcon } from '../components/common/CategoryIcon';
import { CategoryChart } from '../components/charts/CategoryChart';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { useAuth } from '../contexts/AuthContext';
import { ReportsViewModel } from '../viewmodels/ReportsViewModel';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ReportsScreenProps {
  navigation: any;
}

const ReportsScreen: React.FC<ReportsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [reportsViewModel, setReportsViewModel] = useState<ReportsViewModel | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'categories' | 'trends'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';

  // Initialize ReportsViewModel when user is available
  useEffect(() => {
    if (user?.id) {
      const reportsVm = new ReportsViewModel(user.id);
      setReportsViewModel(reportsVm);
    } else {
      setReportsViewModel(null);
    }
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleRefresh = async () => {
    if (reportsViewModel) {
      setRefreshing(true);
      reportsViewModel.refreshData();
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
            style={[styles.tab, selectedTab === 'categories' && styles.tabActive]}
            onPress={() => setSelectedTab('categories')}
          >
            <Text style={[styles.tabText, selectedTab === 'categories' && styles.tabTextActive]}>
              Kategoriler
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

  const CategoriesTab = () => (
    <View>
      {/* Chart for Monthly Expenses */}
      {selectedPeriod === 'month' && currentCategories.expense.length > 0 && (
        <Card style={styles.chartCard}>
          <CategoryChart
            data={currentCategories.expense.map(cat => ({
              name: cat.name,
              value: cat.amount,
              color: cat.color,
              percentage: cat.percentage
            }))}
            title="Aylık Gider Dağılımı"
            showValues={true}
          />
        </Card>
      )}

      {/* Expense Categories */}
      <Card style={styles.categoriesCard}>
        <Text style={styles.categoriesTitle}>Gider Kategorileri</Text>
        {currentCategories.expense.length > 0 ? (
          currentCategories.expense.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <CategoryIcon
                  iconName={category.icon}
                  color={category.color}
                  size="small"
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryPercentage}>%{category.percentage}</Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.amount)}
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCategory}>
            <Text style={styles.emptyCategoryText}>Bu dönemde gider bulunamadı</Text>
          </View>
        )}
      </Card>

      {/* Income Categories */}
      <Card style={styles.categoriesCard}>
        <Text style={styles.categoriesTitle}>Gelir Kategorileri</Text>
        {currentCategories.income.length > 0 ? (
          currentCategories.income.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <CategoryIcon
                  iconName={category.icon}
                  color={category.color}
                  size="small"
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryPercentage}>%{category.percentage}</Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.amount)}
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCategory}>
            <Text style={styles.emptyCategoryText}>Bu dönemde gelir bulunamadı</Text>
          </View>
        )}
      </Card>
    </View>
  );

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
            case 'categories':
              return <CategoriesTab />;
            case 'trends':
              return <TrendsTab />;
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
  webContent: {
    flex: 1,
  },
});

export default ReportsScreen; 