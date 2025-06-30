import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
  Chip,
  Button,
  Alert,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  LinearProgress,
  Drawer,
  AppBar,
  Toolbar,
  Slide,
  Backdrop,
  Grid,
  useTheme,
  alpha,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  CreditCard,
  Diamond,
  Savings,
  AccountBalanceWallet,
  AttachMoney,
    Analytics,
  Assessment,
  Timeline,
  Add,
  Edit,
  Delete,
  MoreVert,
  Refresh,
  TrackChanges,
  Warning,
  CheckCircle,
  Error,
  Close,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
  DonutSmall,
  Insights,
  Compare,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  Treemap
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { Account, AccountType } from '../../models/Account';
import { Transaction, TransactionType } from '../../models/Transaction';
import { AccountService } from '../../services/AccountService';
import { TransactionService } from '../../services/TransactionService';
import { formatCurrency } from '../../utils/formatters';
import { animations } from '../styles/theme';
import { getCategoryIcon } from '../utils/categoryIcons';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  transactionCount: number;
}

interface AnalyticsData {
  savingsScore: number;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  previousMonthExpense: number;
  futureBalance: number;
  categoryTrends: Array<{
    name: string;
    current: number;
    previous: number;
    trend: { percentage: number; isIncrease: boolean; severity: 'normal' | 'warning' | 'danger' };
  }>;
  alerts: Array<{ type: 'warning' | 'danger'; message: string; category?: string }>;
}

const Reports: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goalAmount, setGoalAmount] = useState<string>('');
  
  // Chart drawer states
  const [chartDrawerOpen, setChartDrawerOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<string>('');
  
  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    savingsScore: 0,
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    previousMonthExpense: 0,
    futureBalance: 0,
    categoryTrends: [],
    alerts: [],
  });

  // Menu states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAccountId, setMenuAccountId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Load accounts and transactions
      const [accountsData, transactionsData] = await Promise.all([
        AccountService.getUserAccounts(currentUser.uid),
        TransactionService.getUserTransactions(currentUser.uid)
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);
      
      // Global state'e verileri yaz (chart'lar için)
      (window as any).reportAccounts = accountsData;
      (window as any).reportTransactions = transactionsData;
      
      // Calculate analytics
      calculateAnalytics(accountsData, transactionsData);
      
      console.log('Firebase data loaded:', {
        accounts: accountsData.length,
        transactions: transactionsData.length,
        categories: getExpenseCategoriesFromFirebase().length
      });
    } catch (error) {
      console.error('Error loading reports data:', error);
      
      // Use mock data if needed
      setAccounts([]);
      setTransactions([]);
      (window as any).reportAccounts = [];
      (window as any).reportTransactions = [];
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (accountsData: Account[], transactionsData: Transaction[]) => {
    const currentBalance = accountsData
      .filter(acc => acc.includeInTotalBalance)
      .reduce((sum, acc) => sum + acc.balance, 0);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Current month transactions
    const currentMonthTransactions = transactionsData.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });
    
    // Previous month transactions
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthTransactions = transactionsData.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === lastMonth && transactionDate.getFullYear() === lastMonthYear;
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpense = currentMonthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousMonthExpense = lastMonthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const savingsScore = monthlyIncome > 0 ? Math.max(0, Math.min(100, ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100)) : 0;
    const futureBalance = currentBalance + (monthlyIncome - monthlyExpense);

    setAnalytics({
      savingsScore,
      currentBalance,
      monthlyIncome,
      monthlyExpense,
      previousMonthExpense,
      futureBalance,
      categoryTrends: [],
      alerts: [],
    });
  };

  // Firebase verilerinden kategori analizleri hesaplama
  const getExpenseCategoriesFromFirebase = (): CategoryData[] => {
    const categoryTotals: { [key: string]: number } = {};
    // Mobil uygulamadaki gerçek kategori renkleri
    const categoryColors: { [key: string]: string } = {
      'Yemek': '#FF3030',
      'Market': '#00E5CC',
      'Ulaşım': '#2196F3',
      'Fatura': '#FF1744',
      'İçecekler': '#FFB300',
      'Eğlence': '#9C27B0',
      'Sinema': '#E91E63',
      'Hediye': '#FF4081',
      'Seyahat': '#2196F3',
      'Giyim': '#673AB7',
      'Oyun': '#00BCD4',
      'Kitap': '#3F51B5',
      'Telefon': '#E91E63',
      'Fitness': '#FF9800',
      'Sağlık': '#FF5722',
      'Elektronik': '#607D8B',
      'Temizlik': '#2196F3',
      'Ev': '#FF9800',
      'Kişisel Bakım': '#FF6F00',
      'Gıda': '#FF3030',  // Alias for Yemek
      'Alışveriş': '#00E5CC',  // Alias for Market
      'Diğer': '#9E9E9E'
    };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Sadece bu ayki giderleri hesapla
    const currentMonthExpenses = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return t.type === TransactionType.EXPENSE && 
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    currentMonthExpenses.forEach(transaction => {
      const category = transaction.category || 'Diğer';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
    });

    const totalExpense = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    return Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      color: categoryColors[name] || '#95A5A6',
      icon: name.charAt(0)
    })).sort((a, b) => b.amount - a.amount);
  };

  // Son 6 ay için trend verisi oluşturma
  const getMonthlyTrendDataFromFirebase = () => {
    const monthlyData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('tr-TR', { month: 'short' });
      
      const monthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      });

      const gelir = monthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const gider = monthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month,
        gelir,
        gider,
        tasarruf: gelir - gider,
        transactionCount: monthTransactions.length
      });
    }

    return monthlyData;
  };

  // Hesap bakiye verilerini hazırlama
  const getAccountBalanceDataFromFirebase = () => {
    return accounts
      .filter(account => account.isActive)
      .map(account => ({
        name: account.name.length > 15 ? account.name.substring(0, 15) + '...' : account.name,
        bakiye: account.balance,
        tip: getAccountTypeLabel(account.type),
        color: account.color || '#2196F3'
      }))
      .sort((a, b) => Math.abs(b.bakiye) - Math.abs(a.bakiye)); // Mutlak değere göre sıralama
  };

  const getCurrentData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const periodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (selectedPeriod === 'month') {
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      } else {
        // Week logic
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionDate >= weekAgo;
      }
    });

    const income = periodTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = periodTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const netAmount = income - expense;
    const savingsRate = income > 0 ? (netAmount / income) * 100 : 0;

    return { income, expense, netAmount, savingsRate };
  };

  const getCurrentCategories = (): { expense: CategoryData[], income: CategoryData[] } => {
    const currentData = getCurrentData();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const periodTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (selectedPeriod === 'month') {
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      } else {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionDate >= weekAgo;
      }
    });

    // Group by category
    const expenseCategories = new Map<string, number>();
    const incomeCategories = new Map<string, number>();

    periodTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        expenseCategories.set(t.category, (expenseCategories.get(t.category) || 0) + t.amount);
      } else {
        incomeCategories.set(t.category, (incomeCategories.get(t.category) || 0) + t.amount);
      }
    });

    const categoryColors = ['#FF3030', '#00E5CC', '#2196F3', '#FF1744', '#FFB300', '#9C27B0', '#E91E63', '#FF4081', '#673AB7', '#00BCD4', '#3F51B5', '#FF9800', '#FF5722', '#607D8B', '#FF6F00', '#9E9E9E'];

    const expense: CategoryData[] = Array.from(expenseCategories.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: currentData.expense > 0 ? (amount / currentData.expense) * 100 : 0,
        color: categoryColors[index % categoryColors.length],
        icon: '' // Artık getCategoryIcon kullanıyoruz
      }))
      .sort((a, b) => b.amount - a.amount);

    const income: CategoryData[] = Array.from(incomeCategories.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: currentData.income > 0 ? (amount / currentData.income) * 100 : 0,
        color: categoryColors[index % categoryColors.length],
        icon: '' // Artık getCategoryIcon kullanıyoruz
      }))
      .sort((a, b) => b.amount - a.amount);

    return { expense, income };
  };

  const getMonthlyTrends = (): MonthlyTrend[] => {
    const trends: MonthlyTrend[] = [];
    const currentDate = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      trends.push({
        month,
        income,
        expense,
        transactionCount: monthTransactions.length
      });
    }
    
    return trends;
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.DEBIT_CARD:
        return <AccountBalance />;
      case AccountType.CREDIT_CARD:
        return <CreditCard />;
      case AccountType.GOLD:
        return <Diamond />;
      case AccountType.SAVINGS:
        return <Savings />;
      case AccountType.INVESTMENT:
        return <TrendingUp />;
      case AccountType.CASH:
        return <AccountBalanceWallet />;
      default:
        return <AttachMoney />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case AccountType.DEBIT_CARD:
        return 'Banka Kartı';
      case AccountType.CREDIT_CARD:
        return 'Kredi Kartı';
      case AccountType.GOLD:
        return 'Altın Hesabı';
      case AccountType.SAVINGS:
        return 'Tasarruf';
      case AccountType.INVESTMENT:
        return 'Yatırım';
      case AccountType.CASH:
        return 'Nakit';
      default:
        return 'Hesap';
    }
  };

  const getSavingsScoreColor = (score: number) => {
    if (score >= 70) return '#00E676';
    if (score >= 40) return '#FF9800';
    return '#FF1744';
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, accountId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuAccountId(accountId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAccountId('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleChartClick = (chartId: string) => {
    // Kullanıcının hiç işlemi yoksa alert göster
    if (transactions.length === 0) {
      alert('Grafik analizi için öncelikle işlem eklemelisiniz. Lütfen bir gelir veya gider işlemi ekleyin.');
      return;
    }
    
    setSelectedChart(chartId);
    setChartDrawerOpen(true);
  };

  const currentData = getCurrentData();
  const currentCategories = getCurrentCategories();
  const monthlyTrends = getMonthlyTrends();
  const totalBalance = accounts
    .filter(acc => acc.includeInTotalBalance)
    .reduce((sum, acc) => sum + acc.balance, 0);

  if (loading) {
    return null;
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      overflow: 'auto', 
      bgcolor: 'background.default' 
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Raporlar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Finansal analizler ve detaylı raporlar
          </Typography>
        </Box>
        
        {/* Haftalık ve Aylık butonları kaldırıldı, yerine bilgi metni eklendi */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Kullanıcıya bilgiler sadece aylık olarak gösterilmektedir.
          </Typography>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 3 }}
        >
          <Tab icon={<Assessment />} label="Özet" />
          <Tab icon={<Analytics />} label="Analizler" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 3 }}>
        {/* Overview Tab */}
        <TabPanel value={selectedTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* No transactions message */}
            {transactions.length === 0 && (
              <motion.div {...animations.fadeIn}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Henüz işlem eklememişsiniz
                  </Typography>
                  <Typography variant="body2">
                    Finansal raporları ve analizleri görüntülemek için önce bir gelir veya gider işlemi ekleyin.
                  </Typography>
                </Alert>
              </motion.div>
            )}
            
            {/* Summary Cards */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <motion.div {...animations.scaleIn} style={{ flex: 1, minWidth: '300px' }}>
                <Card sx={{ background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <TrendingUp sx={{ fontSize: 32 }} />
                      <Typography variant="h6">Gelir</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(currentData.income)}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...animations.scaleIn} style={{ flex: 1, minWidth: '300px' }}>
                <Card sx={{ background: 'linear-gradient(135deg, #F44336 0%, #d32f2f 100%)', color: 'white' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <TrendingDown sx={{ fontSize: 32 }} />
                      <Typography variant="h6">Gider</Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {formatCurrency(currentData.expense)}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>

            {/* Net Amount Card */}
            <motion.div {...animations.fadeIn}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Net Tutar
                    </Typography>
                    <Chip 
                      label={currentData.netAmount >= 0 ? 'Kazanç' : 'Zarar'}
                      color={currentData.netAmount >= 0 ? 'success' : 'error'}
                    />
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      color: currentData.netAmount >= 0 ? 'success.main' : 'error.main',
                      mb: 1
                    }}
                  >
                    {currentData.netAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(currentData.netAmount))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasarruf Oranı: %{currentData.savingsRate.toFixed(1)}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Chart */}
            {currentCategories.expense.length > 0 && (
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <motion.div {...animations.fadeIn} style={{ flex: 1, minWidth: '400px' }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        Gider Kategorileri
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={currentCategories.expense}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              paddingAngle={5}
                              dataKey="amount"
                            >
                              {currentCategories.expense.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Category Details */}
                <motion.div {...animations.fadeIn} style={{ flex: 1, minWidth: '400px' }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                        Kategori Detayları
                      </Typography>
                      <List sx={{ p: 0 }}>
                        {currentCategories.expense.map((category, index) => (
                          <React.Fragment key={category.name}>
                            <ListItem sx={{ px: 0 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: category.color, color: 'white' }}>
                                  {getCategoryIcon(category.name)}
                                </Avatar>
                              </ListItemAvatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {category.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  %{category.percentage.toFixed(1)}
                                </Typography>
                              </Box>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {formatCurrency(category.amount)}
                              </Typography>
                            </ListItem>
                            {index < currentCategories.expense.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </motion.div>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={selectedTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* No transactions message */}
            {transactions.length === 0 && (
              <motion.div {...animations.fadeIn}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Analiz için işlem gerekli
                  </Typography>
                  <Typography variant="body2">
                    Detaylı finansal analizler ve grafikler için öncelikle işlem eklemelisiniz.
                  </Typography>
                </Alert>
              </motion.div>
            )}
            
            {/* Savings Score */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <motion.div {...animations.scaleIn} style={{ flex: 1, minWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <TrendingUp sx={{ color: '#FF9800', fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Aylık Tasarruf Skoru
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress
                          variant="determinate"
                          value={analytics.savingsScore}
                          size={120}
                          thickness={6}
                          sx={{ color: getSavingsScoreColor(analytics.savingsScore) }}
                        />
                        <Box sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column'
                        }}>
                          <Typography 
                            variant="h4" 
                            sx={{ 
                              fontWeight: 700,
                              color: getSavingsScoreColor(analytics.savingsScore)
                            }}
                          >
                            {analytics.savingsScore.toFixed(0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            / 100
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Bu Ay Gelir
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(analytics.monthlyIncome)}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                          Bu Ay Gider
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {formatCurrency(analytics.monthlyExpense)}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                          Net Tasarruf
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          color: (analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? 'success.main' : 'error.main' 
                        }}>
                          {(analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(analytics.monthlyIncome - analytics.monthlyExpense))}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Skor Açıklaması */}
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.savingsScore >= 70 && "🎉 Harika! Çok iyi tasarruf ediyorsunuz."}
                        {analytics.savingsScore >= 40 && analytics.savingsScore < 70 && "👍 İyi gidiyorsunuz, biraz daha iyileştirilebilir."}
                        {analytics.savingsScore < 40 && "⚠️ Harcamalarınızı gözden geçirmeniz önerilir."}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Goal Calculator */}
              <motion.div {...animations.scaleIn} style={{ flex: 1, minWidth: '400px' }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                      <TrackChanges sx={{ color: '#2196F3', fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Hedef Hesaplayıcı
                      </Typography>
                    </Box>
                    
                    <TextField
                      fullWidth
                      label="Hedef Miktar"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                      }}
                      sx={{ mb: 3 }}
                      placeholder="Örn: 50000"
                    />
                    
                    {goalAmount && parseFloat(goalAmount) > 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Mevcut Bakiye
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(totalBalance)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Hedef Miktar
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(parseFloat(goalAmount))}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Kalan Miktar
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: (parseFloat(goalAmount) - totalBalance) > 0 ? 'warning.main' : 'success.main'
                          }}>
                            {formatCurrency(Math.max(0, parseFloat(goalAmount) - totalBalance))}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Aylık Net Tasarruf
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: (analytics.monthlyIncome - analytics.monthlyExpense) > 0 ? 'success.main' : 'error.main'
                          }}>
                            {formatCurrency(analytics.monthlyIncome - analytics.monthlyExpense)}
                          </Typography>
                        </Box>
                        
                        {parseFloat(goalAmount) <= totalBalance ? (
                          <Alert severity="success" sx={{ mt: 2 }}>
                            🎉 Tebrikler! Hedefinize zaten ulaştınız!
                          </Alert>
                        ) : (analytics.monthlyIncome - analytics.monthlyExpense) > 0 ? (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            📅 Bu hızla hedefinize ulaşmak için yaklaşık{' '}
                            <strong>
                              {Math.ceil((parseFloat(goalAmount) - totalBalance) / (analytics.monthlyIncome - analytics.monthlyExpense))} ay
                            </strong>{' '}
                            gerekir.
                          </Alert>
                        ) : (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            ⚠️ Mevcut tasarruf hızınızla hedefinize ulaşmanız mümkün değil. Gelirlerinizi artırmanız veya harcamalarınızı azaltmanız gerekiyor.
                          </Alert>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Box>

            {/* Future Balance Prediction */}
            <motion.div {...animations.fadeIn}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <TrendingUp sx={{ color: '#9C27B0', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Gelecek Ay Tahminleri
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center', p: 2, bgcolor: 'primary.main', borderRadius: 2, color: 'white' }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Mevcut Bakiye
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalBalance)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center', p: 2, bgcolor: (analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? 'success.main' : 'error.main', borderRadius: 2, color: 'white' }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Tahmini Net Değişim
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {(analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? '+' : ''}
                        {formatCurrency(Math.abs(analytics.monthlyIncome - analytics.monthlyExpense))}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center', p: 2, bgcolor: analytics.futureBalance >= totalBalance ? 'success.main' : 'error.main', borderRadius: 2, color: 'white' }}>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Gelecek Ay Tahmini
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {formatCurrency(analytics.futureBalance)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      💡 Bu tahmin, mevcut aylık gelir ve gider ortalamanıza dayanmaktadır. 
                      Gerçek sonuçlar değişiklik gösterebilir.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>

            {/* Monthly Comparison */}
            <motion.div {...animations.fadeIn}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Analytics sx={{ color: '#FF5722', fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Aylık Karşılaştırma
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: '300px' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Bu Ay
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Gelir:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(analytics.monthlyIncome)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Gider:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {formatCurrency(analytics.monthlyExpense)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Net:</Typography>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          color: (analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? 'success.main' : 'error.main' 
                        }}>
                          {(analytics.monthlyIncome - analytics.monthlyExpense) >= 0 ? '+' : ''}
                          {formatCurrency(Math.abs(analytics.monthlyIncome - analytics.monthlyExpense))}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: '300px' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Geçen Ay
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Gider:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {formatCurrency(analytics.previousMonthExpense)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Değişim:</Typography>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 600,
                          color: analytics.monthlyExpense > analytics.previousMonthExpense ? 'error.main' : 'success.main'
                        }}>
                          {analytics.monthlyExpense > analytics.previousMonthExpense ? '+' : ''}
                          {formatCurrency(analytics.monthlyExpense - analytics.previousMonthExpense)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Değişim Oranı:</Typography>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 700, 
                          color: analytics.monthlyExpense > analytics.previousMonthExpense ? 'error.main' : 'success.main'
                        }}>
                          {analytics.previousMonthExpense > 0 ? (
                            <>
                              {analytics.monthlyExpense > analytics.previousMonthExpense ? '+' : ''}
                              {(((analytics.monthlyExpense - analytics.previousMonthExpense) / analytics.previousMonthExpense) * 100).toFixed(1)}%
                            </>
                          ) : (
                            'N/A'
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  {analytics.monthlyExpense > analytics.previousMonthExpense && analytics.previousMonthExpense > 0 && (
                    <Alert severity="warning" sx={{ mt: 3 }}>
                      ⚠️ Bu ay giderleriniz geçen aya göre %{(((analytics.monthlyExpense - analytics.previousMonthExpense) / analytics.previousMonthExpense) * 100).toFixed(1)} arttı. 
                      Harcama alışkanlıklarınızı gözden geçirmeniz önerilir.
                    </Alert>
                  )}
                  
                  {analytics.monthlyExpense < analytics.previousMonthExpense && analytics.previousMonthExpense > 0 && (
                    <Alert severity="success" sx={{ mt: 3 }}>
                      🎉 Harika! Bu ay giderlerinizi geçen aya göre %{(((analytics.previousMonthExpense - analytics.monthlyExpense) / analytics.previousMonthExpense) * 100).toFixed(1)} azalttınız.
                    </Alert>
                  )}
                                 </CardContent>
               </Card>
             </motion.div>

                        {/* Modern Chart Analytics Buttons */}
            {transactions.length > 0 && (
              <>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 3 }}>
              Görsel Analiz Grafikleri
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
              {/* Chart Selection Cards */}
              {[
                {
                  id: 'category-pie',
                  title: 'Kategori Pasta Grafiği',
                  subtitle: 'Gelir/Gider kategori analizi',
                  icon: <DonutSmall sx={{ fontSize: 40 }} />,
                  color: '#9C27B0',
                  description: 'Seçilebilir kategori dağılımı'
                },
                {
                  id: 'income-expense-trend',
                  title: 'Gelir-Gider Trendi',
                  subtitle: '3 aylık finansal trend',
                  icon: <ShowChart sx={{ fontSize: 40 }} />,
                  color: '#4ECDC4',
                  description: 'Aylık gelir ve gider karşılaştırması'
                },
                {
                  id: 'account-balances',
                  title: 'Hesap Bakiyeleri',
                  subtitle: 'Hesap dağılım analizi',
                  icon: <BarChartIcon sx={{ fontSize: 40 }} />,
                  color: '#45B7D1',
                  description: 'Hesaplarınızın bakiye durumu'
                },
                {
                  id: 'monthly-comparison',
                  title: 'Aylık Karşılaştırma',
                  subtitle: 'Performans analizi',
                  icon: <Timeline sx={{ fontSize: 40 }} />,
                  color: '#96CEB4',
                  description: 'Ay bazında detaylı karşılaştırma'
                },
                {
                  id: 'savings-analysis',
                  title: 'Tasarruf Analizi',
                  subtitle: 'Tasarruf trendleriniz',
                  icon: <Analytics sx={{ fontSize: 40 }} />,
                  color: '#FFEAA7',
                  description: 'Tasarruf oranları ve hedefler'
                },
                {
                  id: 'financial-insights',
                  title: 'Finansal İçgörüler',
                  subtitle: 'AI destekli analizler',
                  icon: <Insights sx={{ fontSize: 40 }} />,
                  color: '#DDA0DD',
                  description: 'Akıllı finansal öneriler'
                }
                             ].map((chart) => (
                 <motion.div key={chart.id} {...animations.fadeIn}>
                   <Card 
                     sx={{ 
                       height: '100%',
                       cursor: 'pointer',
                       transition: 'all 0.3s ease',
                       '&:hover': {
                         transform: 'translateY(-8px)',
                         boxShadow: `0 20px 40px ${alpha(chart.color, 0.2)}`
                       }
                     }}
                     onClick={() => handleChartClick(chart.id)}
                   >
                     <CardContent sx={{ p: 3, textAlign: 'center' }}>
                       <Box
                         sx={{
                           display: 'flex',
                           justifyContent: 'center',
                           alignItems: 'center',
                           width: 80,
                           height: 80,
                           mx: 'auto',
                           mb: 2,
                           borderRadius: '50%',
                           bgcolor: alpha(chart.color, 0.1),
                           color: chart.color,
                           border: `2px solid ${alpha(chart.color, 0.3)}`
                         }}
                       >
                         {chart.icon}
                       </Box>
                       
                       <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                         {chart.title}
                       </Typography>
                       
                       <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                         {chart.subtitle}
                       </Typography>
                       
                       <Chip
                         label={chart.description}
                         size="small"
                         sx={{ 
                           bgcolor: alpha(chart.color, 0.1),
                           color: chart.color,
                           fontWeight: 600
                         }}
                       />
                     </CardContent>
                   </Card>
                 </motion.div>
               ))}
             </Box>
                </>
              )}
           </Box>
        </TabPanel>
      </Box>

      {/* Account Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>
      {/* Chart Drawer */}
      <Drawer
        anchor="right"
        open={chartDrawerOpen}
        onClose={() => setChartDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: '60%', md: '50%', lg: '40%' },
            bgcolor: 'background.default',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Drawer Header */}
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {getChartTitle(selectedChart)}
              </Typography>
              <IconButton onClick={() => setChartDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Drawer Content */}
          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            {renderChartContent(selectedChart)}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

// Tasarruf Analizi Component
const SavingsAnalysisChart: React.FC = () => {
  const getSavingsAnalysisData = () => {
    const allTransactions = (window as any).reportTransactions || [];
    const currentDate = new Date();
    
    // Son 6 ayın tasarruf verilerini hesapla
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const monthTransactions = allTransactions.filter((t: Transaction) => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === month && transactionDate.getFullYear() === year;
      });
      
      const income = monthTransactions
        .filter((t: Transaction) => t.type === TransactionType.INCOME)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      const savings = income - expense;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      
      monthlyData.push({
        month: targetDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
        savings,
        savingsRate,
        income,
        expense,
        target: income * 0.2 // Hedef tasarruf %20
      });
    }
    
    return monthlyData;
  };

  const data = getSavingsAnalysisData();
  const latestSavings = data[data.length - 1];
  const avgSavingsRate = data.reduce((sum, item) => sum + item.savingsRate, 0) / data.length;
  const totalSavings = data.reduce((sum, item) => sum + item.savings, 0);
  
  console.log('💰 Savings Analysis Data:', data);
  console.log('📊 Latest month savings:', latestSavings);
  console.log('📈 Average savings rate:', avgSavingsRate);

  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 3, color: '#bbb' }}>
        Son 6 ayın tasarruf performansınızı analiz edin ve hedeflerinizi takip edin.
      </Typography>

      {/* Tasarruf Özet Kartları */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Bu Ay Tasarruf
                </Typography>
                <Typography variant="h4" sx={{ 
                  color: latestSavings.savings >= 0 ? '#4CAF50' : '#F44336', 
                  fontWeight: 700 
                }}>
                  ₺{Math.abs(latestSavings.savings).toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Savings sx={{ color: latestSavings.savings >= 0 ? '#4CAF50' : '#F44336', fontSize: 32 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              {latestSavings.savings >= 0 ? 'Pozitif tasarruf' : 'Negatif tasarruf'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Tasarruf Oranı
                </Typography>
                <Typography variant="h4" sx={{ 
                  color: latestSavings.savingsRate >= 20 ? '#4CAF50' : latestSavings.savingsRate >= 10 ? '#FF9800' : '#F44336', 
                  fontWeight: 700 
                }}>
                  %{latestSavings.savingsRate.toFixed(1)}
                </Typography>
              </Box>
              <TrendingUp sx={{ 
                color: latestSavings.savingsRate >= 20 ? '#4CAF50' : latestSavings.savingsRate >= 10 ? '#FF9800' : '#F44336', 
                fontSize: 32 
              }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Gelirden tasarruf yüzdesi
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  6 Ay Ortalama
                </Typography>
                <Typography variant="h4" sx={{ 
                  color: avgSavingsRate >= 15 ? '#4CAF50' : '#FF9800', 
                  fontWeight: 700 
                }}>
                  %{avgSavingsRate.toFixed(1)}
                </Typography>
              </Box>
              <Analytics sx={{ color: avgSavingsRate >= 15 ? '#4CAF50' : '#FF9800', fontSize: 32 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Ortalama tasarruf performansı
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Toplam Tasarruf
                </Typography>
                <Typography variant="h4" sx={{ 
                  color: totalSavings >= 0 ? '#4CAF50' : '#F44336', 
                  fontWeight: 700 
                }}>
                  ₺{Math.abs(totalSavings).toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <AccountBalance sx={{ color: totalSavings >= 0 ? '#4CAF50' : '#F44336', fontSize: 32 }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Son 6 ay toplam tasarruf
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tasarruf Trend Grafiği */}
      <Box sx={{ height: 400, mb: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9800" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#FF9800" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="month" 
              stroke="#fff"
              tick={{ fill: '#fff' }}
            />
            <YAxis 
              stroke="#fff" 
              tick={{ fill: '#fff' }}
              tickFormatter={(value) => `₺${(value/1000).toFixed(0)}K`} 
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <Box sx={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333', 
                      borderRadius: '8px', 
                      p: 2,
                      minWidth: 250
                    }}>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                        {label}
                      </Typography>
                      {payload.map((entry: any, index: number) => (
                        <Typography key={index} variant="body2" sx={{ 
                          color: entry.stroke, 
                          fontWeight: 500,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5
                        }}>
                          <span>{entry.dataKey === 'savings' ? 'Tasarruf' : entry.dataKey === 'target' ? 'Hedef' : entry.dataKey}:</span>
                          <span>₺{(entry.value as number).toLocaleString('tr-TR')}</span>
                        </Typography>
                      ))}
                      {payload[0]?.payload && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #333' }}>
                          <Typography variant="caption" sx={{ color: '#bbb' }}>
                            Tasarruf Oranı: %{payload[0].payload.savingsRate.toFixed(1)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="target" 
              stroke="#FF9800" 
              strokeWidth={2}
              fill="url(#targetGradient)"
              strokeDasharray="5 5"
              dot={{ fill: '#FF9800', r: 4 }}
            />
            <Area 
              type="monotone" 
              dataKey="savings" 
              stroke="#4CAF50" 
              strokeWidth={3}
              fill="url(#savingsGradient)"
              dot={{ fill: '#4CAF50', r: 6 }}
              activeDot={{ r: 8, fill: '#4CAF50' }}
            />
            <Legend 
              wrapperStyle={{ color: '#fff', paddingTop: '20px' }}
              iconType="line"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* Tasarruf Tavsiyeleri */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#fff' }}>
          💡 Tasarruf Tavsiyeleri
        </Typography>
        
        {latestSavings.savingsRate < 10 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Tasarruf oranınız %{latestSavings.savingsRate.toFixed(1)} ile düşük seviyede. 
            Hedef olarak gelirlerinizin en az %20'sini tasarruf etmeyi hedefleyin.
          </Alert>
        )}
        
        {latestSavings.savingsRate >= 20 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            🎉 Harika! Tasarruf oranınız %{latestSavings.savingsRate.toFixed(1)} ile hedefin üzerinde. 
            Bu performansı sürdürmeye devam edin!
          </Alert>
        )}
        
        {latestSavings.savingsRate >= 10 && latestSavings.savingsRate < 20 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            👍 Tasarruf oranınız %{latestSavings.savingsRate.toFixed(1)} ile iyi seviyede. 
            %20 hedefine ulaşmak için biraz daha gayret gösterin!
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          <Chip 
            label={`Bu ay hedef: ₺${latestSavings.target.toLocaleString('tr-TR')}`}
            sx={{ bgcolor: '#FF9800', color: '#fff' }}
          />
          <Chip 
            label={`Fark: ₺${Math.abs(latestSavings.savings - latestSavings.target).toLocaleString('tr-TR')}`}
            sx={{ 
              bgcolor: latestSavings.savings >= latestSavings.target ? '#4CAF50' : '#F44336', 
              color: '#fff' 
            }}
          />
          <Chip 
            label={latestSavings.savings >= latestSavings.target ? 'Hedef Aşıldı!' : 'Hedefe Yakın'}
            sx={{ 
              bgcolor: latestSavings.savings >= latestSavings.target ? '#4CAF50' : '#FF5722', 
              color: '#fff' 
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

// Helper functions for chart drawer
const getChartTitle = (chartId: string) => {
  const titles: Record<string, string> = {
    'expenses-pie': 'Gider Kategorileri Analizi',
    'category-pie': 'Kategori Bazlı Pasta Grafiği',
    'income-expense-trend': 'Gelir-Gider Trend Analizi',
    'account-balances': 'Hesap Bakiye Dağılımı',
    'monthly-comparison': 'Aylık Performans Karşılaştırması',
    'savings-analysis': 'Tasarruf Analizi',
    'financial-insights': 'Finansal İçgörüler'
  };
  return titles[chartId] || 'Grafik Analizi';
};

// Aylık Karşılaştırma Component
const MonthlyComparisonChart: React.FC = () => {
  const getMonthlyComparisonData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Firebase verilerini kontrol et
    const allTransactions = (window as any).reportTransactions || [];
    console.log('🔍 MonthlyComparison: Total transactions loaded:', allTransactions.length);
    console.log('📅 Current month:', currentMonth + 1, 'year:', currentYear);
    console.log('📅 Previous month:', previousMonth + 1, 'year:', previousYear);

    // Bu ay verilerini al
    const currentMonthTransactions = allTransactions.filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    // Önceki ay verilerini al
    const previousMonthTransactions = allTransactions.filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === previousMonth && 
             transactionDate.getFullYear() === previousYear;
    });

    console.log('📊 Current month transactions:', currentMonthTransactions.length);
    console.log('📊 Previous month transactions:', previousMonthTransactions.length);

    // Bu ay hesaplamaları
    const currentIncome = currentMonthTransactions
      .filter((t: Transaction) => t.type === TransactionType.INCOME)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const currentExpense = currentMonthTransactions
      .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    // Önceki ay hesaplamaları  
    const previousIncome = previousMonthTransactions
      .filter((t: Transaction) => t.type === TransactionType.INCOME)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const previousExpense = previousMonthTransactions
      .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    // Değişim hesaplamaları
    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpense > 0 ? ((currentExpense - previousExpense) / previousExpense) * 100 : 0;
    const savingsChange = (currentIncome - currentExpense) - (previousIncome - previousExpense);

    // Ay isimleri
    const currentMonthName = new Date(currentYear, currentMonth).toLocaleDateString('tr-TR', { month: 'long' });
    const previousMonthName = new Date(previousYear, previousMonth).toLocaleDateString('tr-TR', { month: 'long' });

    console.log('💰 Current month calculations:', {
      name: currentMonthName,
      income: currentIncome,
      expense: currentExpense,
      savings: currentIncome - currentExpense
    });
    console.log('💰 Previous month calculations:', {
      name: previousMonthName,
      income: previousIncome,
      expense: previousExpense,
      savings: previousIncome - previousExpense
    });
    console.log('📈 Changes:', { incomeChange, expenseChange, savingsChange });

    return {
      currentMonth: {
        name: currentMonthName,
        income: currentIncome,
        expense: currentExpense,
        savings: currentIncome - currentExpense,
        transactionCount: currentMonthTransactions.length
      },
      previousMonth: {
        name: previousMonthName,
        income: previousIncome,
        expense: previousExpense,
        savings: previousIncome - previousExpense,
        transactionCount: previousMonthTransactions.length
      },
      changes: {
        income: incomeChange,
        expense: expenseChange,
        savings: savingsChange
      }
    };
  };

  const data = getMonthlyComparisonData();

  const getChangeColor = (change: number) => {
    if (change > 0) return '#4CAF50';
    if (change < 0) return '#F44336';
    return '#9E9E9E';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp />;
    if (change < 0) return <TrendingDown />;
    return <TrendingUp sx={{ transform: 'rotate(90deg)' }} />;
  };

  const chartData = [
    {
      category: 'Gelir',
      [data.currentMonth.name]: data.currentMonth.income,
      [data.previousMonth.name]: data.previousMonth.income
    },
    {
      category: 'Gider', 
      [data.currentMonth.name]: data.currentMonth.expense,
      [data.previousMonth.name]: data.previousMonth.expense
    },
    {
      category: 'Tasarruf',
      [data.currentMonth.name]: data.currentMonth.savings,
      [data.previousMonth.name]: data.previousMonth.savings
    }
  ];
  console.log('📊 Chart data for line chart:', chartData);

  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 3, color: '#bbb' }}>
        Bu ay ile geçen ayın performansını karşılaştırın ve trend analizini görün.
      </Typography>

      {/* Özet Kartları */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 4 }}>
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Gelir Değişimi
                </Typography>
                <Typography variant="h4" sx={{ color: getChangeColor(data.changes.income), fontWeight: 700 }}>
                  %{Math.abs(data.changes.income).toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ color: getChangeColor(data.changes.income) }}>
                {getChangeIcon(data.changes.income)}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Önceki aya göre {data.changes.income > 0 ? 'artış' : data.changes.income < 0 ? 'azalış' : 'değişim yok'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Gider Değişimi
                </Typography>
                <Typography variant="h4" sx={{ color: getChangeColor(-data.changes.expense), fontWeight: 700 }}>
                  %{Math.abs(data.changes.expense).toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ color: getChangeColor(-data.changes.expense) }}>
                {getChangeIcon(-data.changes.expense)}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Gider {data.changes.expense > 0 ? 'arttı' : data.changes.expense < 0 ? 'azaldı' : 'değişmedi'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                  Net Tasarruf
                </Typography>
                <Typography variant="h4" sx={{ color: getChangeColor(data.changes.savings), fontWeight: 700 }}>
                  ₺{Math.abs(data.changes.savings).toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ color: getChangeColor(data.changes.savings) }}>
                {getChangeIcon(data.changes.savings)}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
              Tasarruf {data.changes.savings > 0 ? 'arttı' : data.changes.savings < 0 ? 'azaldı' : 'aynı kaldı'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

                    {/* Karşılaştırma Grafiği */}
       <Box sx={{ height: 400, mb: 3 }}>
         <ResponsiveContainer width="100%" height="100%">
           <LineChart
             data={chartData}
             margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
           >
             <CartesianGrid strokeDasharray="3 3" stroke="#333" />
             <XAxis 
               dataKey="category" 
               stroke="#fff"
               tick={{ fill: '#fff' }}
             />
             <YAxis 
               stroke="#fff" 
               tick={{ fill: '#fff' }}
               tickFormatter={(value) => `₺${(value/1000).toFixed(0)}K`} 
             />
             <Tooltip 
               content={({ active, payload, label }) => {
                 if (active && payload && payload.length) {
                   return (
                     <Box sx={{ 
                       backgroundColor: '#1a1a1a', 
                       border: '1px solid #333', 
                       borderRadius: '8px', 
                       p: 2,
                       minWidth: 200
                     }}>
                       <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                         {label}
                       </Typography>
                       {payload.map((entry: any, index: number) => (
                         <Typography key={index} variant="body2" sx={{ 
                           color: entry.stroke, 
                           fontWeight: 500,
                           display: 'flex',
                           justifyContent: 'space-between',
                           alignItems: 'center'
                         }}>
                           <span>{entry.dataKey}:</span>
                           <span>₺{(entry.value as number).toLocaleString('tr-TR')}</span>
                         </Typography>
                       ))}
                     </Box>
                   );
                 }
                 return null;
               }}
             />
             <Line 
               type="monotone" 
               dataKey={data.currentMonth.name} 
               stroke="#4CAF50" 
               strokeWidth={4}
               dot={{ fill: '#4CAF50', r: 8 }}
               activeDot={{ r: 10, fill: '#4CAF50' }}
             />
             <Line 
               type="monotone" 
               dataKey={data.previousMonth.name} 
               stroke="#FF5722" 
               strokeWidth={4}
               dot={{ fill: '#FF5722', r: 8 }}
               activeDot={{ r: 10, fill: '#FF5722' }}
             />
             <Legend 
               wrapperStyle={{ color: '#fff', paddingTop: '20px' }}
               iconType="line"
             />
           </LineChart>
         </ResponsiveContainer>
       </Box>

      {/* Detaylı Karşılaştırma */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
              {data.currentMonth.name} ({data.currentMonth.transactionCount} işlem)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Gelir:</Typography>
                <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                  ₺{data.currentMonth.income.toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Gider:</Typography>
                <Typography variant="body2" sx={{ color: '#F44336', fontWeight: 600 }}>
                  ₺{data.currentMonth.expense.toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>Net:</Typography>
                <Typography variant="body2" sx={{ 
                  color: data.currentMonth.savings >= 0 ? '#4CAF50' : '#F44336', 
                  fontWeight: 600 
                }}>
                  ₺{data.currentMonth.savings.toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
              {data.previousMonth.name} ({data.previousMonth.transactionCount} işlem)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Gelir:</Typography>
                <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                  ₺{data.previousMonth.income.toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Gider:</Typography>
                <Typography variant="body2" sx={{ color: '#F44336', fontWeight: 600 }}>
                  ₺{data.previousMonth.expense.toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>Net:</Typography>
                <Typography variant="body2" sx={{ 
                  color: data.previousMonth.savings >= 0 ? '#4CAF50' : '#F44336', 
                  fontWeight: 600 
                }}>
                  ₺{data.previousMonth.savings.toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

// Kategori Pasta Grafiği Component
const CategoryPieChart: React.FC = () => {
  const [selectedType, setSelectedType] = React.useState<'expense' | 'income'>('expense');
  
  // Gider kategorileri için mobil uygulamadaki gerçek renkler
  const getExpenseCategoriesFromFirebase = (): CategoryData[] => {
    const categoryTotals: { [key: string]: number } = {};
    const categoryColors: { [key: string]: string } = {
      'Yemek': '#FF3030',
      'Market': '#00E5CC',
      'Ulaşım': '#2196F3',
      'Fatura': '#FF1744',
      'İçecekler': '#FFB300',
      'Eğlence': '#9C27B0',
      'Sinema': '#E91E63',
      'Hediye': '#FF4081',
      'Seyahat': '#2196F3',
      'Giyim': '#673AB7',
      'Oyun': '#00BCD4',
      'Kitap': '#3F51B5',
      'Telefon': '#E91E63',
      'Fitness': '#FF9800',
      'Sağlık': '#FF5722',
      'Elektronik': '#607D8B',
      'Temizlik': '#2196F3',
      'Ev': '#FF9800',
      'Kişisel Bakım': '#FF6F00',
      'Gıda': '#FF3030',
      'Alışveriş': '#00E5CC',
      'Diğer': '#9E9E9E'
    };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthExpenses = (window as any).reportTransactions?.filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return t.type === TransactionType.EXPENSE && 
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    }) || [];
    
    currentMonthExpenses.forEach((transaction: Transaction) => {
      const category = transaction.category || 'Diğer';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
    });

    const totalExpense = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    if (totalExpense === 0) {
      return [
        { name: 'Yemek', amount: 1200, color: '#FF3030', percentage: 30, icon: 'Y' },
        { name: 'Ulaşım', amount: 800, color: '#2196F3', percentage: 20, icon: 'U' },
        { name: 'Ev', amount: 1500, color: '#FF9800', percentage: 37.5, icon: 'E' },
        { name: 'Eğlence', amount: 400, color: '#9C27B0', percentage: 10, icon: 'E' },
        { name: 'Sağlık', amount: 300, color: '#FF5722', percentage: 7.5, icon: 'S' }
      ];
    }

    return Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount,
      percentage: (amount / totalExpense) * 100,
      color: categoryColors[name] || '#95A5A6',
      icon: name.charAt(0)
    })).sort((a, b) => b.amount - a.amount);
  };

  // Gelir kategorileri için mobil uygulamadaki gerçek renkler
  const getIncomeCategoriesFromFirebase = (): CategoryData[] => {
    const categoryTotals: { [key: string]: number } = {};
    const categoryColors: { [key: string]: string } = {
      'Maaş': '#4CAF50',
      'Yan İş': '#2196F3',
      'Freelance': '#00BCD4',
      'Burs': '#3F51B5',
      'Harçlık': '#E91E63',
      'Yatırım': '#9C27B0',
      'Prim': '#FF9800',
      'Temettü': '#00BCD4',
      'Hediye': '#F44336',
      'Satış': '#2196F3',
      'Kira Geliri': '#4CAF50',
      'Borç İade': '#FF9800',
      'İkramiye': '#FFD700',
      'Diğer': '#9E9E9E'
    };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthIncomes = (window as any).reportTransactions?.filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return t.type === TransactionType.INCOME && 
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    }) || [];
    
    currentMonthIncomes.forEach((transaction: Transaction) => {
      const category = transaction.category || 'Diğer';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
    });

    const totalIncome = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    if (totalIncome === 0) {
      return [
        { name: 'Maaş', amount: 5000, color: '#4CAF50', percentage: 70, icon: 'M' },
        { name: 'Freelance', amount: 1500, color: '#00BCD4', percentage: 21, icon: 'F' },
        { name: 'Yatırım', amount: 400, color: '#9C27B0', percentage: 6, icon: 'Y' },
        { name: 'Hediye', amount: 200, color: '#F44336', percentage: 3, icon: 'H' }
      ];
    }

    return Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount,
      percentage: (amount / totalIncome) * 100,
      color: categoryColors[name] || '#95A5A6',
      icon: name.charAt(0)
    })).sort((a, b) => b.amount - a.amount);
  };

  const currentCategories = selectedType === 'expense' 
    ? getExpenseCategoriesFromFirebase() 
    : getIncomeCategoriesFromFirebase();

  const topCategories = currentCategories.slice(0, 6);

  return (
    <Box>
      {/* Tip Seçici Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={selectedType}
          exclusive
          onChange={(_, newType) => newType && setSelectedType(newType)}
          sx={{
            '& .MuiToggleButton-root': {
              color: '#fff',
              borderColor: '#333',
              '&.Mui-selected': {
                bgcolor: selectedType === 'expense' ? '#F44336' : '#4CAF50',
                color: '#fff',
                '&:hover': {
                  bgcolor: selectedType === 'expense' ? '#D32F2F' : '#388E3C',
                }
              }
            }
          }}
        >
          <ToggleButton value="expense" sx={{ px: 3 }}>
            <TrendingDown sx={{ mr: 1 }} />
            Gider Kategorileri
          </ToggleButton>
          <ToggleButton value="income" sx={{ px: 3 }}>
            <TrendingUp sx={{ mr: 1 }} />
            Gelir Kategorileri
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Typography variant="body1" sx={{ mb: 3, color: '#bbb', textAlign: 'center' }}>
        {selectedType === 'expense' 
          ? 'En çok harcama yaptığınız 6 kategoriyi görün ve harcama dağılımınızı analiz edin.'
          : 'En çok gelir elde ettiğiniz 6 kategoriyi görün ve gelir dağılımınızı analiz edin.'
        }
      </Typography>
      
      <Box sx={{ height: 400, mb: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={topCategories}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name}: %${(percent * 100).toFixed(0)}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="amount"
            >
              {topCategories.map((entry: CategoryData, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <Box sx={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333', 
                      borderRadius: '8px', 
                      p: 1.5,
                      color: '#fff'
                    }}>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        {data.name}: ₺{(data.value as number).toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <List>
        {topCategories.map((category: CategoryData) => (
          <ListItem key={category.name} sx={{ px: 0 }}>
            <ListItemAvatar>
              <Avatar sx={{ 
                bgcolor: category.color, 
                width: 40, 
                height: 40,
                '& svg': {
                  color: '#fff',
                  fontSize: '20px'
                }
              }}>
                {getCategoryIcon(category.name)}
              </Avatar>
            </ListItemAvatar>
            <Box sx={{ flex: 1, ml: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                {category.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                %{category.percentage.toFixed(1)} - Toplam {selectedType === 'expense' ? 'harcama' : 'gelir'}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
              ₺{category.amount.toLocaleString('tr-TR')}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

const renderChartContent = (chartId: string) => {
  // Firebase'den gerçek verileri al
     const getExpenseCategoriesFromFirebase = (): CategoryData[] => {
     const categoryTotals: { [key: string]: number } = {};
     // Mobil uygulamadaki gerçek kategori renkleri
     const categoryColors: { [key: string]: string } = {
       'Yemek': '#FF3030',
       'Market': '#00E5CC',
       'Ulaşım': '#2196F3',
       'Fatura': '#FF1744',
       'İçecekler': '#FFB300',
       'Eğlence': '#9C27B0',
       'Sinema': '#E91E63',
       'Hediye': '#FF4081',
       'Seyahat': '#2196F3',
       'Giyim': '#673AB7',
       'Oyun': '#00BCD4',
       'Kitap': '#3F51B5',
       'Telefon': '#E91E63',
       'Fitness': '#FF9800',
       'Sağlık': '#FF5722',
       'Elektronik': '#607D8B',
       'Temizlik': '#2196F3',
       'Ev': '#FF9800',
       'Kişisel Bakım': '#FF6F00',
       'Gıda': '#FF3030',  // Alias for Yemek
       'Alışveriş': '#00E5CC',  // Alias for Market
       'Diğer': '#9E9E9E'
     };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Global transactions state'ini kullan
    const currentMonthExpenses = (window as any).reportTransactions?.filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return t.type === TransactionType.EXPENSE && 
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    }) || [];
    
    currentMonthExpenses.forEach((transaction: Transaction) => {
      const category = transaction.category || 'Diğer';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
    });

    const totalExpense = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

    if (totalExpense === 0) {
      // Eğer veri yoksa mock data kullan - mobil uygulamadaki gerçek renkler
      return [
        { name: 'Yemek', amount: 1200, color: '#FF3030', percentage: 30, icon: 'Y' },
        { name: 'Ulaşım', amount: 800, color: '#2196F3', percentage: 20, icon: 'U' },
        { name: 'Ev', amount: 1500, color: '#FF9800', percentage: 37.5, icon: 'E' },
        { name: 'Eğlence', amount: 400, color: '#9C27B0', percentage: 10, icon: 'E' },
        { name: 'Sağlık', amount: 300, color: '#FF5722', percentage: 7.5, icon: 'S' }
      ];
    }

    return Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount,
      percentage: (amount / totalExpense) * 100,
      color: categoryColors[name] || '#95A5A6',
      icon: name.charAt(0)
    })).sort((a, b) => b.amount - a.amount);
  };

  const getMonthlyTrendDataFromFirebase = () => {
    const monthlyData = [];
    const now = new Date();
    
    console.log('Firebase Transactions for Monthly Trend:', (window as any).reportTransactions?.length || 0);

    for (let i = 2; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('tr-TR', { month: 'short' });
      
      const monthTransactions = (window as any).reportTransactions?.filter((transaction: Transaction) => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      }) || [];

      const gelir = monthTransactions
        .filter((t: Transaction) => t.type === TransactionType.INCOME)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const gider = monthTransactions
        .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const tasarruf = gelir - gider;

      console.log(`${month}: Gelir=${gelir}, Gider=${gider}, Tasarruf=${tasarruf}, TransactionCount=${monthTransactions.length}`);

      monthlyData.push({
        month,
        gelir,
        gider,
        tasarruf
      });
    }

    // Eğer hiç veri yoksa minimal mock data göster
    if (monthlyData.every(data => data.gelir === 0 && data.gider === 0)) {
      console.log('No Firebase data found, using minimal mock data');
      return [
        { month: 'Oca', gelir: 3200, gider: 2300, tasarruf: 900 },
        { month: 'Şub', gelir: 2900, gider: 2100, tasarruf: 800 },
        { month: 'Mar', gelir: 3100, gider: 2400, tasarruf: 700 }
      ];
    }

    return monthlyData;
  };

  const getAccountBalanceDataFromFirebase = () => {
    const firebaseAccounts = (window as any).reportAccounts || [];
    
    if (firebaseAccounts.length === 0) {
      // Mock data fallback
      return [
        { name: 'Ana Hesap', bakiye: 5000, color: '#4CAF50' },
        { name: 'Kredi Kartı', bakiye: -1200, color: '#F44336' },
        { name: 'Altın Hesabı', bakiye: 8500, color: '#FF9800' },
        { name: 'Tasarruf', bakiye: 3200, color: '#2196F3' }
      ];
    }

    return firebaseAccounts
      .filter((account: Account) => account.isActive)
      .map((account: Account) => ({
        name: account.name.length > 15 ? account.name.substring(0, 15) + '...' : account.name,
        bakiye: account.balance,
        color: account.color || '#2196F3'
      }))
      .sort((a: any, b: any) => Math.abs(b.bakiye) - Math.abs(a.bakiye));
  };

  const expenseCategories = getExpenseCategoriesFromFirebase();

  switch (chartId) {
    case 'expenses-pie':
      return (
        <Box>
          <Typography variant="body1" sx={{ mb: 3, color: '#bbb' }}>
            En çok harcama yaptığınız 6 kategoriyi görün ve harcama dağılımınızı analiz edin.
          </Typography>
          
          <Box sx={{ height: 400, mb: 3 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategories.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: %${(percent * 100).toFixed(0)}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {expenseCategories.slice(0, 6).map((entry: CategoryData, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <Box sx={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333', 
                          borderRadius: '8px', 
                          p: 1.5,
                          color: '#fff'
                        }}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                            {data.name}: ₺{(data.value as number).toLocaleString('tr-TR')}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <List>
            {expenseCategories.slice(0, 6).map((category: CategoryData) => (
              <ListItem key={category.name} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ 
                    bgcolor: category.color, 
                    width: 40, 
                    height: 40,
                    '& svg': {
                      color: '#fff',
                      fontSize: '20px'
                    }
                  }}>
                    {getCategoryIcon(category.name)}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ flex: 1, ml: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
                    {category.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#bbb' }}>
                    %{category.percentage.toFixed(1)} - Toplam harcama
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                  ₺{category.amount.toLocaleString('tr-TR')}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      );

    case 'income-expense-trend':
      return (
        <Box>
          <Typography variant="body1" sx={{ mb: 3, color: '#bbb' }}>
            Son 3 ayın gelir ve gider trendlerini analiz edin.
          </Typography>
          
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={getMonthlyTrendDataFromFirebase()}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorGider" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F44336" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F44336" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#fff" />
                <YAxis stroke="#fff" tickFormatter={(value) => `₺${(value/1000).toFixed(0)}K`} />
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Box sx={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333', 
                          borderRadius: '8px', 
                          p: 2,
                          minWidth: 200
                        }}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 1 }}>
                            {label}
                          </Typography>
                          {payload.map((entry: any, index: number) => (
                            <Typography key={index} variant="body2" sx={{ 
                              color: entry.color, 
                              fontWeight: 500,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{entry.dataKey === 'gelir' ? 'Gelir' : 'Gider'}:</span>
                              <span>₺{(entry.value as number).toLocaleString('tr-TR')}</span>
                            </Typography>
                          ))}
                          {payload.length > 1 && (
                            <Typography variant="body2" sx={{ 
                              color: '#fff', 
                              fontWeight: 600,
                              mt: 1,
                              pt: 1,
                              borderTop: '1px solid #333',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>Net Tasarruf:</span>
                              <span style={{ color: payload[0].payload.tasarruf >= 0 ? '#4CAF50' : '#F44336' }}>
                                ₺{payload[0].payload.tasarruf.toLocaleString('tr-TR')}
                              </span>
                            </Typography>
                          )}
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="gelir" stroke="#4CAF50" fill="url(#colorGelir)" name="gelir" />
                <Area type="monotone" dataKey="gider" stroke="#F44336" fill="url(#colorGider)" name="gider" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      );

    case 'account-balances':
      return (
        <Box>
          <Typography variant="body1" sx={{ mb: 3, color: '#bbb' }}>
            Hesaplarınızın bakiye dağılımını görselleştirin.
          </Typography>
          
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getAccountBalanceDataFromFirebase()}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barCategoryGap="20%"
                barGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#fff"
                  axisLine={{ stroke: '#fff' }}
                  tickLine={{ stroke: '#fff' }}
                  tick={{ textAnchor: 'middle' }}
                />
                <YAxis stroke="#fff" tickFormatter={(value) => `₺${(value/1000).toFixed(0)}K`} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <Box sx={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333', 
                          borderRadius: '8px', 
                          p: 1.5,
                          color: '#fff'
                        }}>
                          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: (data.value as number) >= 0 ? '#4CAF50' : '#F44336', 
                            fontWeight: 500 
                          }}>
                            Bakiye: ₺{(data.value as number).toLocaleString('tr-TR')}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="bakiye" name="Bakiye" radius={[4, 4, 0, 0]}>
                  {getAccountBalanceDataFromFirebase().map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      );

    case 'category-pie':
      return <CategoryPieChart />;

    case 'monthly-comparison':
      return <MonthlyComparisonChart />;

    case 'savings-analysis':
      return <SavingsAnalysisChart />;

    default:
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
            Bu grafik henüz hazırlanıyor
          </Typography>
          <Typography variant="body2" sx={{ color: '#bbb' }}>
            Yakında daha detaylı analizler eklenecek.
          </Typography>
        </Box>
      );
  }
};

export default Reports;