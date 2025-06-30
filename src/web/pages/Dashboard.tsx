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
import { useLoading } from '../contexts/LoadingContext';
import { TransactionService } from '../../services/TransactionService';
import { AccountService } from '../../services/AccountService';
import { RecurringPaymentService } from '../../services/RecurringPaymentService';
import { Transaction, TransactionType } from '../../models/Transaction';
import { Account } from '../../models/Account';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Budget } from '../../models/Budget';
import { BudgetService } from '../../services/BudgetService';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../models/Category';

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
      .reduce((sum, t) => sum + t.amount, 0);

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
  const { setLoading: setGlobalLoading } = useLoading();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState<Budget | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      setGlobalLoading(true, 'Dashboard verileri yükleniyor...');
      try {
        // Process due recurring payments first
        try {
          await RecurringPaymentService.processRecurringPayments(currentUser.uid);
        } catch (error) {
          console.error('Düzenli ödemeler işlenirken hata:', error);
        }

        // Load accounts
        const accountsData = await AccountService.getUserAccounts(currentUser.uid);
        setAccounts(accountsData);

        // Calculate total balance
        const total = accountsData
          .filter(account => account.includeInTotalBalance)
          .reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Load all transactions for calculations
        const transactionsData = await TransactionService.getUserTransactions(currentUser.uid);
        
        // Set recent transactions for the list (last 5)
        setTransactions(transactionsData.slice(0, 5)); 

        // Calculate chart data for the last 6 months
        const chartDataCalculated = calculateMonthlyData(transactionsData);
        setChartData(chartDataCalculated);

        // Calculate category breakdown for the current month
        const categoryDataCalculated = calculateCategoryData(transactionsData);
        setCategoryData(categoryDataCalculated);

        // Calculate total expense for the card
        const totalExpense = transactionsData
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + t.amount, 0);
        setCurrentMonthExpense(totalExpense);

        // Calculate monthly change (compare with previous month)
        const now = new Date();
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousMonthTransactions = transactionsData.filter(transaction => {
          const transactionDate = transaction.date;
          return transactionDate.getMonth() === previousMonth.getMonth() && 
                 transactionDate.getFullYear() === previousMonth.getFullYear();
        });
        
        const previousMonthBalance = previousMonthTransactions.reduce((sum, t) => {
          return sum + (t.type === TransactionType.INCOME ? t.amount : -t.amount);
        }, 0);
        
        const currentMonthTransactions = transactionsData.filter(transaction => {
            const transactionDate = transaction.date;
            return transactionDate.getMonth() === now.getMonth() &&
                   transactionDate.getFullYear() === now.getFullYear();
        });

        const currentMonthBalance = currentMonthTransactions.reduce((sum, t) => {
          return sum + (t.type === TransactionType.INCOME ? t.amount : -t.amount);
        }, 0);
        
        const change = currentMonthBalance - previousMonthBalance;
        setMonthlyChange(change);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Hata durumunda state'leri sıfırla
        setAccounts([]);
        setTransactions([]);
        setTotalBalance(0);
        setCurrentMonthExpense(0);
        setMonthlyChange(0);
        setChartData([]);
        setCategoryData([]);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    if (currentUser) {
    loadData();
    }
  }, [currentUser, setGlobalLoading]);

  // Periodic check for recurring payments every 5 minutes
  useEffect(() => {
    if (!currentUser) return;

    const processRecurringPayments = async () => {
      try {
        await RecurringPaymentService.processRecurringPayments(currentUser.uid);
      } catch (error) {
        console.error('Periyodik düzenli ödeme kontrolü hatası:', error);
      }
    };

    // Set up interval for every 24 hours (86400000 ms) - once per day
    const interval = setInterval(processRecurringPayments, 86400000);

    // Also check when page gains focus (but only once per day)
    const lastCheckKey = `lastRecurringCheck_${currentUser.uid}`;
    const handleFocus = () => {
      const lastCheck = localStorage.getItem(lastCheckKey);
      const now = new Date().getTime();
      
      // Only check if more than 24 hours have passed since last check
      if (!lastCheck || (now - parseInt(lastCheck)) > 86400000) {
        processRecurringPayments();
        localStorage.setItem(lastCheckKey, now.toString());
      }
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser]);

  // Bütçeleri yükle
  useEffect(() => {
    const loadBudgets = async () => {
      if (!currentUser) return;
      setBudgetLoading(true);
      try {
        const data = await BudgetService.getBudgets(currentUser.uid);
        setBudgets(data);
      } catch (e) {
        setBudgets([]);
      } finally {
        setBudgetLoading(false);
      }
    };
    if (currentUser) loadBudgets();
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
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Toplam Harcama
                        </Typography>
                        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(currentMonthExpense)}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ListItemText 
                    primary="Son İşlemler" 
                    secondary="En son yaptığınız 5 işlem"
                  />
                </Box>
                <List dense>
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
                              color: transaction.type === TransactionType.INCOME ? 'success.main' : 'error.main'
                            }}
                          >
                            {transaction.type === TransactionType.INCOME ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {transaction.date.toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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

          {/* Bütçe Özeti ve Kartları */}
          <Box sx={{ mb: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Bütçe Özeti</Typography>
                  <Button variant="contained" size="small" onClick={() => { setBudgetEdit(null); setBudgetModalOpen(true); }}>
                    Bütçe Ekle
                  </Button>
                </Box>
                {budgetLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : budgets.length === 0 ? (
                  <Typography color="text.secondary">Henüz bütçe eklenmedi.</Typography>
                ) : (
                  <Box>
                    {/* Bütçe kartları */}
                    {budgets.map((budget) => (
                      <Card key={budget.id} sx={{ mb: 2, borderLeft: budget.progressPercentage >= 100 ? '4px solid #ef4444' : budget.progressPercentage >= 80 ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="subtitle1">{budget.categoryName}</Typography>
                              <Typography variant="body2" color="text.secondary">{budget.period === 'monthly' ? 'Aylık' : 'Haftalık'} Bütçe</Typography>
                              <Typography variant="body2">Harcanan: <b>{formatCurrency(budget.spentAmount)}</b></Typography>
                              <Typography variant="body2">Bütçe: <b>{formatCurrency(budget.budgetedAmount)}</b></Typography>
                              <Typography variant="body2">Kalan: <b style={{ color: budget.remainingAmount < 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(budget.remainingAmount)}</b></Typography>
                            </Box>
                            <Box>
                              <Button size="small" onClick={() => { setBudgetEdit(budget); setBudgetModalOpen(true); }}>Düzenle</Button>
                              <Button size="small" color="error" onClick={async () => { await BudgetService.deleteBudget(budget.id); setBudgets(budgets.filter(b => b.id !== budget.id)); }}>Sil</Button>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 2 }}>
                            <LinearProgress variant="determinate" value={Math.min(budget.progressPercentage, 100)} sx={{ height: 8, borderRadius: 4, background: '#eee', '& .MuiLinearProgress-bar': { backgroundColor: budget.progressPercentage >= 100 ? '#ef4444' : budget.progressPercentage >= 80 ? '#f59e0b' : '#10b981' } }} />
                            <Typography variant="caption" color={budget.progressPercentage >= 100 ? '#ef4444' : budget.progressPercentage >= 80 ? '#f59e0b' : '#10b981'}>{budget.progressPercentage.toFixed(0)}%</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Bütçe Ekle/Düzenle Modalı */}
      {budgetModalOpen && (
        <BudgetModal
          open={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          onSaved={async () => {
            setBudgetModalOpen(false);
            setBudgetEdit(null);
            // Refresh budgets
            if (currentUser) {
              setBudgetLoading(true);
              const data = await BudgetService.getBudgets(currentUser.uid);
              setBudgets(data);
              setBudgetLoading(false);
            }
          }}
          editBudget={budgetEdit}
          userId={currentUser?.uid}
        />
      )}
    </Box>
  );
};

export default Dashboard;

// MUI BudgetModal (ekle/düzenle) - Dashboard'dan sonra tanımla
interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editBudget: import('../../models/Budget').Budget | null;
  userId?: string;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ open, onClose, onSaved, editBudget, userId }) => {
  const isEdit = !!editBudget;
  const [category, setCategory] = React.useState(editBudget?.categoryName || '');
  const [amount, setAmount] = React.useState(editBudget ? editBudget.budgetedAmount.toString() : '');
  const [period, setPeriod] = React.useState<'monthly' | 'weekly'>(editBudget?.period || 'monthly');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!category) { setError('Kategori seçin'); return; }
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) { setError('Geçerli bir tutar girin'); return; }
    if (!userId) { setError('Kullanıcı bulunamadı'); return; }
    setLoading(true);
    try {
      // Tarih aralığı hesapla
      const startDate = new Date();
      const endDate = new Date();
      if (period === 'monthly') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
      } else {
        const dayOfWeek = startDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + diffToMonday);
        endDate.setDate(startDate.getDate() + 6);
      }
      if (isEdit && editBudget) {
        await import('../../services/BudgetService').then(({ BudgetService }) =>
          BudgetService.updateBudget(editBudget.id, {
            categoryName: category,
            budgetedAmount: numericAmount,
            period,
            startDate,
            endDate,
          })
        );
      } else {
        const catObj = DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === category);
        await import('../../services/BudgetService').then(({ BudgetService }) =>
          BudgetService.createBudget({
            userId,
            categoryName: category,
            categoryIcon: catObj?.icon || 'ellipsis-horizontal',
            categoryColor: catObj?.color || '#95A5A6',
            budgetedAmount: numericAmount,
            spentAmount: 0,
            remainingAmount: numericAmount,
            progressPercentage: 0,
            period,
            startDate,
            endDate,
            createdAt: new Date(),
          })
        );
      }
      onSaved();
    } catch (e) {
      setError('Kayıt sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Bütçeyi Düzenle' : 'Yeni Bütçe'}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Kategori</InputLabel>
          <Select
            value={category}
            label="Kategori"
            onChange={e => setCategory(e.target.value as string)}
            disabled={isEdit}
          >
            {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
              <MenuItem key={cat.name} value={cat.name}>
                {cat.icon ? <span style={{ marginRight: 8 }}>{cat.icon}</span> : null}
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Bütçe Tutarı"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          fullWidth
          margin="normal"
          type="number"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Periyot</InputLabel>
          <Select
            value={period}
            label="Periyot"
            onChange={e => setPeriod(e.target.value as 'monthly' | 'weekly')}
          >
            <MenuItem value="monthly">Aylık</MenuItem>
            <MenuItem value="weekly">Haftalık</MenuItem>
          </Select>
        </FormControl>
        {error && <Typography color="error" variant="body2">{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>İptal</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>{isEdit ? 'Kaydet' : 'Ekle'}</Button>
      </DialogActions>
    </Dialog>
  );
}; 