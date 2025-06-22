import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fab,
  Grid,
  InputAdornment,
  Avatar,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Search,
  Delete,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Download,
  Refresh,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { gradients, animations } from '../styles/theme';
import { Transaction, TransactionType } from '../../models/Transaction';
import { useAuth } from '../contexts/AuthContext';
import { TransactionService } from '../../services/TransactionService';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';

interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

interface TransactionsPageProps {
  onNavigate: (page: 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'recurring' | 'reports' | 'settings' | 'profile' | 'categories' | 'help' | 'add-transaction') => void;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransactionStats>({
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
    transactionCount: 0
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, typeFilter, categoryFilter, dateFilter]);

  const loadTransactions = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Try to load from Firebase
      const firebaseTransactions = await TransactionService.getUserTransactions(currentUser.uid);
      
      if (firebaseTransactions.length > 0) {
        setTransactions(firebaseTransactions);
        calculateStats(firebaseTransactions);
      } else {
        // Use mock data if no Firebase data
        const mockTransactions: Transaction[] = [
          {
            id: '1',
            userId: currentUser.uid,
            amount: 2500,
            description: 'Maaş',
            category: 'Gelir',
            categoryIcon: '💰',
            type: TransactionType.INCOME,
            accountId: 'account-1',
            date: new Date('2024-01-15'),
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
          },
          {
            id: '2',
            userId: currentUser.uid,
            amount: 150,
            description: 'Market Alışverişi',
            category: 'Gıda',
            categoryIcon: '🛒',
            type: TransactionType.EXPENSE,
            accountId: 'account-1',
            date: new Date('2024-01-14'),
            createdAt: new Date('2024-01-14'),
            updatedAt: new Date('2024-01-14'),
          },
          {
            id: '3',
            userId: currentUser.uid,
            amount: 80,
            description: 'Benzin',
            category: 'Ulaşım',
            categoryIcon: '⛽',
            type: TransactionType.EXPENSE,
            accountId: 'account-1',
            date: new Date('2024-01-13'),
            createdAt: new Date('2024-01-13'),
            updatedAt: new Date('2024-01-13'),
          },
          {
            id: '4',
            userId: currentUser.uid,
            amount: 1200,
            description: 'Kira',
            category: 'Ev',
            categoryIcon: '🏠',
            type: TransactionType.EXPENSE,
            accountId: 'account-1',
            date: new Date('2024-01-01'),
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: '5',
            userId: currentUser.uid,
            amount: 300,
            description: 'Freelance Proje',
            category: 'Gelir',
            categoryIcon: '💻',
            type: TransactionType.INCOME,
            accountId: 'account-1',
            date: new Date('2024-01-10'),
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-10'),
          },
        ];
        
        setTransactions(mockTransactions);
        calculateStats(mockTransactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      
      // Fallback to mock data on error
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          userId: currentUser.uid,
          amount: 2500,
          description: 'Maaş',
          category: 'Gelir',
          categoryIcon: '💰',
          type: TransactionType.INCOME,
          accountId: 'account-1',
          date: new Date('2024-01-15'),
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          userId: currentUser.uid,
          amount: 150,
          description: 'Market Alışverişi',
          category: 'Gıda',
          categoryIcon: '🛒',
          type: TransactionType.EXPENSE,
          accountId: 'account-1',
          date: new Date('2024-01-14'),
          createdAt: new Date('2024-01-14'),
          updatedAt: new Date('2024-01-14'),
        },
      ];
      
      setTransactions(mockTransactions);
      calculateStats(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactionList: Transaction[]) => {
    const income = transactionList
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactionList
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalIncome: income,
      totalExpense: expense,
      netAmount: income - expense,
      transactionCount: transactionList.length
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(t => t.date >= startDate);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(t => t.date >= startDate);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(t => t.date >= startDate);
          break;
      }
    }

    setFilteredTransactions(filtered);
    setPage(0);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTransaction) {
      try {
        const updatedTransactions = transactions.filter(t => t.id !== selectedTransaction.id);
        setTransactions(updatedTransactions);
        calculateStats(updatedTransactions);
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  // formatCurrency function is now imported from utils

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getUniqueCategories = () => {
    const categories = [...new Set(transactions.map(t => t.category))];
    return categories;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          İşlemler
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gelir ve gider işlemlerinizi yönetin
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...animations.scaleIn}>
            <Card sx={{ background: gradients.success, color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Toplam Gelir
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {formatCurrency(stats.totalIncome)}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...animations.scaleIn}>
            <Card sx={{ background: gradients.error, color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Toplam Gider
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {formatCurrency(stats.totalExpense)}
                    </Typography>
                  </Box>
                  <TrendingDown sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...animations.scaleIn}>
            <Card sx={{ background: stats.netAmount >= 0 ? gradients.primary : gradients.warning, color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Net Bakiye
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {formatCurrency(stats.netAmount)}
                    </Typography>
                  </Box>
                  <AccountBalance sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div {...animations.scaleIn}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Toplam İşlem
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {stats.transactionCount}
                    </Typography>
                  </Box>
                  <Receipt sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="İşlem ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tür</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
                  label="Tür"
                >
                  <MenuItem value="all">Tümü</MenuItem>
                  <MenuItem value={TransactionType.INCOME}>Gelir</MenuItem>
                  <MenuItem value={TransactionType.EXPENSE}>Gider</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Kategori"
                >
                  <MenuItem value="all">Tümü</MenuItem>
                  {getUniqueCategories().map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tarih</InputLabel>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  label="Tarih"
                >
                  <MenuItem value="all">Tümü</MenuItem>
                  <MenuItem value="today">Bugün</MenuItem>
                  <MenuItem value="week">Son 7 Gün</MenuItem>
                  <MenuItem value="month">Son 30 Gün</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadTransactions}
                >
                  Yenile
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                >
                  Dışa Aktar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Kategori</TableCell>
                <TableCell>Açıklama</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell align="right">Tutar</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="center">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <AnimatePresence>
                {filteredTransactions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      hover
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(25, 118, 210, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'primary.main',
                            }}
                          >
                            {getCategoryIcon(transaction.category)}
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            {transaction.category}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {transaction.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type === TransactionType.INCOME ? 'Gelir' : 'Gider'}
                          color={transaction.type === TransactionType.INCOME ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={transaction.type === TransactionType.INCOME ? 'success.main' : 'error.main'}
                        >
                          {transaction.type === TransactionType.INCOME ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(transaction.date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={filteredTransactions.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: gradients.primary,
        }}
        onClick={() => onNavigate('add-transaction')}
      >
        <Add />
      </Fab>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>İşlemi Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedTransaction?.description}" işlemini silmek istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            İptal
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage; 