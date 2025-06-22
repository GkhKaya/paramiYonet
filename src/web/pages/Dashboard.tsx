import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  CreditCard,
  Diamond,
  Receipt,
  Add,
  MoreVert,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { gradients, animations } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { TransactionService } from '../../services/TransactionService';
import { AccountService } from '../../services/AccountService';
import { Transaction, TransactionType } from '../../models/Transaction';
import { Account } from '../../models/Account';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';





interface ChartDataItem {
  name: string;
  income: number;
  expense: number;
}

interface CategoryDataItem {
  name: string;
  value: number;
  color: string;
}

// Kategori renkleri
const categoryColors: Record<string, string> = {
  'Gıda': '#ef4444',
  'Market': '#ef4444',  // Market = Gıda
  'Ulaşım': '#f59e0b', 
  'Eğlence': '#6366f1',
  'Faturalar': '#8b5cf6',
  'Fatura': '#8b5cf6',  // Fatura = Faturalar
  'Ev': '#10b981',
  'Sağlık': '#06b6d4',
  'Teknoloji': '#64748b',
  'Elektronik': '#06b6d4',  // Elektronik = Sağlık rengi yerine mavi
  'Yemek': '#f97316',
  'Alışveriş': '#ec4899',
  'Gelir': '#22c55e',
  'Diğer': '#64748b'
};

// Son 6 ayın gelir-gider verilerini hesapla
const calculateMonthlyData = (transactions: Transaction[]): ChartDataItem[] => {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const now = new Date();
  const monthlyData: ChartDataItem[] = [];

  // Son 6 ay için veri hesapla
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    
    const monthTransactions = transactions.filter(transaction => {
      const transactionDate = transaction.date;
      return transactionDate.getMonth() === date.getMonth() && 
             transactionDate.getFullYear() === date.getFullYear();
    });

    const income = monthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = monthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    monthlyData.push({
      name: monthName,
      income,
      expense
    });
  }

  return monthlyData;
};

// Bu ayın kategori dağılımını hesapla
const calculateCategoryData = (transactions: Transaction[]): CategoryDataItem[] => {
  const now = new Date();
  const currentMonthTransactions = transactions.filter(transaction => {
    const transactionDate = transaction.date;
    return transactionDate.getMonth() === now.getMonth() && 
           transactionDate.getFullYear() === now.getFullYear() &&
           transaction.type === TransactionType.EXPENSE; // Sadece giderler
  });

  // Kategorilere göre grupla
  const categoryTotals: Record<string, number> = {};
  currentMonthTransactions.forEach(transaction => {
    const category = transaction.category || 'Diğer';
    categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount);
  });

  // Kategori verilerini oluştur
  const categoryDataArray = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || categoryColors['Diğer']
    }))
    .sort((a, b) => b.value - a.value) // Büyükten küçüğe sırala
    .slice(0, 5); // En büyük 5 kategori

  return categoryDataArray;
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Load accounts
        const accountsData = await AccountService.getUserAccounts(currentUser.uid);
        setAccounts(accountsData);

        // Calculate total balance (only include accounts that are marked to be included)
        const total = accountsData
          .filter(account => account.includeInTotalBalance)
          .reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Load recent transactions
        const transactionsData = await TransactionService.getUserTransactions(currentUser.uid);
        setTransactions(transactionsData.slice(0, 5)); // Get last 5 transactions

        // Calculate chart data for last 6 months
        const chartDataCalculated = calculateMonthlyData(transactionsData);
        setChartData(chartDataCalculated);

        // Calculate category breakdown for current month
        const categoryDataCalculated = calculateCategoryData(transactionsData);
        console.log('Category data calculated:', categoryDataCalculated);
        
        // Eğer veri yoksa dummy data ekle
        if (categoryDataCalculated.length === 0) {
          const dummyCategories: CategoryDataItem[] = [
            { name: 'Gıda', value: 1500, color: '#ef4444' },
            { name: 'Ulaşım', value: 800, color: '#f59e0b' },
            { name: 'Eğlence', value: 600, color: '#6366f1' },
          ];
          setCategoryData(dummyCategories);
        } else {
          setCategoryData(categoryDataCalculated);
        }

        // Calculate current month expense
        const now = new Date();
        const currentMonthTransactions = transactionsData.filter(transaction => {
          const transactionDate = transaction.date;
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        });
        
        const currentExpense = currentMonthTransactions
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        setCurrentMonthExpense(currentExpense);

        // Calculate monthly change (compare with previous month)
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthTransactions = transactionsData.filter(transaction => {
          const transactionDate = transaction.date;
          return transactionDate.getMonth() === previousMonth.getMonth() && 
                 transactionDate.getFullYear() === previousMonth.getFullYear();
        });
        
        const previousMonthBalance = previousMonthTransactions.reduce((sum, t) => {
          return sum + (t.type === TransactionType.INCOME ? t.amount : -Math.abs(t.amount));
        }, 0);
        
        const currentMonthBalance = currentMonthTransactions.reduce((sum, t) => {
          return sum + (t.type === TransactionType.INCOME ? t.amount : -Math.abs(t.amount));
        }, 0);
        
        const change = previousMonthBalance !== 0 ? 
          ((currentMonthBalance - previousMonthBalance) / Math.abs(previousMonthBalance)) * 100 : 0;
        setMonthlyChange(change);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Show mock data if Firebase fails or no data exists
        const mockAccounts: Account[] = [
          {
            id: 'mock-1',
            userId: currentUser.uid,
            name: 'Ana Hesap',
            type: 'debit_card' as any,
            balance: 25430,
            color: '#10b981',
            icon: 'bank',
            isActive: true,
            includeInTotalBalance: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'mock-2',
            userId: currentUser.uid,
            name: 'Kredi Kartı',
            type: 'credit_card' as any,
            balance: -8500,
            color: '#ef4444',
            icon: 'credit-card',
            isActive: true,
            includeInTotalBalance: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'mock-3',
            userId: currentUser.uid,
            name: 'Altın Hesabı',
            type: 'gold' as any,
            balance: 18300,
            color: '#fbbf24',
            icon: 'gold',
            isActive: true,
            includeInTotalBalance: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const mockTransactions: Transaction[] = [
          {
            id: 'mock-trans-1',
            userId: currentUser.uid,
            accountId: 'mock-1',
            amount: 2500,
            description: 'Maaş',
            category: 'Gelir',
            categoryIcon: '💰',
            type: TransactionType.INCOME,
            date: new Date('2024-01-15'),
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
          },
          {
            id: 'mock-trans-2',
            userId: currentUser.uid,
            accountId: 'mock-1',
            amount: 150,
            description: 'Market Alışverişi',
            category: 'Gıda',
            categoryIcon: '🛒',
            type: TransactionType.EXPENSE,
            date: new Date('2024-01-14'),
            createdAt: new Date('2024-01-14'),
            updatedAt: new Date('2024-01-14'),
          },
        ];

        setAccounts(mockAccounts);
        setTotalBalance(mockAccounts
          .filter(account => account.includeInTotalBalance)
          .reduce((sum, account) => sum + account.balance, 0));
        setTransactions(mockTransactions);

        // Mock veriler için de grafik verilerini hesapla
        const chartDataCalculated = calculateMonthlyData(mockTransactions);
        setChartData(chartDataCalculated);

        const categoryDataCalculated = calculateCategoryData(mockTransactions);
        
        // Mock veriler için dummy kategoriler ekle
        if (categoryDataCalculated.length === 0) {
          const dummyCategories: CategoryDataItem[] = [
            { name: 'Gıda', value: 150, color: '#ef4444' },
            { name: 'Ulaşım', value: 100, color: '#f59e0b' },
            { name: 'Yemek', value: 80, color: '#f97316' },
          ];
          setCategoryData(dummyCategories);
        } else {
          setCategoryData(categoryDataCalculated);
        }

        // Mock veriler için bu ay harcama ve aylık değişim
        const mockCurrentExpense = mockTransactions
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        setCurrentMonthExpense(mockCurrentExpense);
        setMonthlyChange(12.5); // Mock değer
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      overflow: 'auto', 
      p: 3,
      pb: 6 // Extra padding at bottom for floating action buttons
    }}>
      {/* Header */}
      <motion.div {...animations.fadeIn}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Hoş geldiniz! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Finansal durumunuzun özeti burada
          </Typography>
        </Box>
      </motion.div>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
        {/* Left Column - Main Cards and Charts */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Row - Balance Cards */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Total Balance Card */}
            <Box sx={{ flex: 1 }}>
              <motion.div {...animations.scaleIn}>
                <Card
                  sx={{
                    background: gradients.primary,
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                          Toplam Bakiye
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                          {formatCurrency(totalBalance)}
                        </Typography>
                        <Chip
                          icon={<TrendingUp sx={{ fontSize: 16 }} />}
                          label={`${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      </Box>
                      <IconButton sx={{ color: 'white' }}>
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </CardContent>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </Card>
              </motion.div>
            </Box>

            {/* Monthly Spending Card */}
            <Box sx={{ flex: 1 }}>
              <motion.div {...animations.scaleIn}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Bu Ay Harcama
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                          {formatCurrency(currentMonthExpense)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={65}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#ef4444',
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Bütçenin %65'i kullanıldı
                        </Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: 'error.main' }}>
                        <Receipt />
                      </Avatar>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          </Box>

          {/* Account Cards Row */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
            {accounts.filter(account => account.includeInTotalBalance).map((account, index) => (
              <Box key={account.name} sx={{ flex: { sm: '1 1 calc(50% - 8px)' }, minWidth: 250 }}>
                <motion.div
                  {...animations.slideIn}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card sx={{ '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.2s' } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {account.name}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: account.balance < 0 ? 'error.main' : 'text.primary'
                            }}
                          >
                            {formatCurrency(account.balance)}
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: account.color }}>
                          {account.type === 'debit_card' && <AccountBalance />}
                          {account.type === 'credit_card' && <CreditCard />}
                          {account.type === 'gold' && <Diamond />}
                          {account.type === 'savings' && <TrendingUp />}
                          {account.type === 'cash' && <AccountBalance />}
                          {account.type === 'investment' && <TrendingUp />}
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Box>
            ))}
          </Box>

          {/* Chart */}
          <motion.div {...animations.fadeIn}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Gelir & Gider Trendi
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#incomeGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#expenseGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>

        {/* Right Column - Sidebar */}
        <Box sx={{ width: { lg: 350 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Recent Transactions */}
          <motion.div {...animations.fadeIn}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Son İşlemler
                  </Typography>
                  <Button size="small" endIcon={<Add />}>
                    Yeni
                  </Button>
                </Box>
                <List sx={{ p: 0 }}>
                  {transactions.map((transaction, index) => (
                    <React.Fragment key={transaction.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'background.paper', color: 'white' }}>
                            {getCategoryIcon(transaction.category)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={transaction.description}
                          secondary={transaction.category}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: transaction.amount > 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {formatCurrency(transaction.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {transaction.date.toLocaleDateString('tr-TR')}
                          </Typography>
                        </Box>
                      </ListItem>
                      {index < transactions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div {...animations.fadeIn}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Kategori Dağılımı
                </Typography>
                {categoryData.length > 0 ? (
                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#ffffff'
                          }}
                          labelStyle={{
                            color: '#ffffff'
                          }}
                          itemStyle={{
                            color: '#ffffff'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ height: 200, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Bu ay henüz gider kaydı bulunmuyor
                    </Typography>
                  </Box>
                )}
                <Box>
                  {categoryData.length > 0 ? (
                    categoryData.map((category) => (
                      <Box
                        key={category.name}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1.5,
                          p: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'action.hover',
                            '& .MuiTypography-root': {
                              color: 'text.primary'
                            }
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: category.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}
                          >
                            {getCategoryIcon(category.name)}
                          </Box>
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500,
                                color: 'text.primary',
                                '&:hover': { color: 'text.primary' }
                              }}
                            >
                              {category.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                '&:hover': { color: 'text.secondary' }
                              }}
                            >
                              Bu ay
                            </Typography>
                          </Box>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600, 
                            color: 'error.main',
                            '&:hover': { color: 'error.main' }
                          }}
                        >
                          {formatCurrency(category.value)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      Kategori verisi bulunmuyor
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 