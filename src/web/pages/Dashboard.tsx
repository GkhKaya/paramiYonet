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

// Mock data
const balanceData = {
  totalBalance: 45230,
  monthlyChange: 12.5,
  accounts: [
    { name: 'Ana Hesap', balance: 25430, type: 'debit', color: '#10b981' },
    { name: 'Kredi Kartı', balance: -8500, type: 'credit', color: '#ef4444' },
    { name: 'Altın', balance: 18300, type: 'gold', color: '#fbbf24' },
    { name: 'Tasarruf', balance: 10000, type: 'savings', color: '#6366f1' },
  ]
};

const recentTransactions = [
  { id: 1, description: 'Market Alışverişi', amount: -250, category: 'Gıda', date: '2024-01-15', icon: '🛒' },
  { id: 2, description: 'Maaş', amount: 15000, category: 'Gelir', date: '2024-01-14', icon: '💰' },
  { id: 3, description: 'Elektrik Faturası', amount: -180, category: 'Fatura', date: '2024-01-13', icon: '⚡' },
  { id: 4, description: 'Restoran', amount: -420, category: 'Yemek', date: '2024-01-12', icon: '🍽️' },
  { id: 5, description: 'Altın Alımı', amount: -2500, category: 'Yatırım', date: '2024-01-11', icon: '💎' },
];

const chartData = [
  { name: 'Ocak', income: 15000, expense: 8500 },
  { name: 'Şubat', income: 16200, expense: 9200 },
  { name: 'Mart', income: 14800, expense: 7800 },
  { name: 'Nisan', income: 17500, expense: 10200 },
  { name: 'Mayıs', income: 18200, expense: 9800 },
  { name: 'Haziran', income: 19000, expense: 11200 },
];

const categoryData = [
  { name: 'Gıda', value: 2500, color: '#ef4444' },
  { name: 'Ulaşım', value: 800, color: '#f59e0b' },
  { name: 'Eğlence', value: 1200, color: '#6366f1' },
  { name: 'Faturalar', value: 1800, color: '#8b5cf6' },
  { name: 'Diğer', value: 600, color: '#64748b' },
];

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Load accounts
        const accountsData = await AccountService.getUserAccounts(currentUser.uid);
        setAccounts(accountsData);

        // Calculate total balance
        const total = accountsData.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Load recent transactions
        const transactionsData = await TransactionService.getUserTransactions(currentUser.uid);
        setTransactions(transactionsData.slice(0, 5)); // Get last 5 transactions
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
        setTotalBalance(mockAccounts.reduce((sum, account) => sum + account.balance, 0));
        setTransactions(mockTransactions);
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
                          label={`+${balanceData.monthlyChange}%`}
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
                          {formatCurrency(6900)}
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
            {accounts.map((account, index) => (
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
                          <Avatar sx={{ bgcolor: 'background.paper' }}>
                            {transaction.type === TransactionType.INCOME ? '💰' : '💸'}
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Box>
                  {categoryData.map((category) => (
                    <Box
                      key={category.name}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: category.color,
                          }}
                        />
                        <Typography variant="body2">{category.name}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatCurrency(category.value)}
                      </Typography>
                    </Box>
                  ))}
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