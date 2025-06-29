import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  Avatar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Snackbar,
  Menu,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add,
  Schedule,
  Warning,
  CheckCircle,
  Refresh,
  TrendingUp,
  Receipt,
  MoreVert,
  Edit,
  Delete,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { gradients, animations } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { RecurringPayment } from '../../models/RecurringPayment';
import { Account } from '../../models/Account';
import { RecurringPaymentService } from '../../services/RecurringPaymentService';
import { AccountService } from '../../services/AccountService';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../models/Category';

interface PaymentSummary {
  totalMonthlyAmount: number;
  activeCount: number;
  upcomingCount: number;
  overdueCount: number;
}

const RecurringPayments: React.FC = () => {
  const { currentUser } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RecurringPayment | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    category: '',
    accountId: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    reminderDays: 3,
    autoCreateTransaction: true,
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Automatic processing of due payments every 24 hours on this page
  useEffect(() => {
    if (!currentUser) return;

    const processRecurringPayments = async () => {
      try {
        await RecurringPaymentService.processRecurringPayments(currentUser.uid);
        // Reload data to show updated payment statuses
        await loadData();
      } catch (error) {
        console.error('Otomatik düzenli ödeme kontrolü hatası:', error);
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

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setGlobalLoading(true, 'Düzenli ödemeler yükleniyor...');
    try {
      const [paymentsData, accountsData] = await Promise.all([
        RecurringPaymentService.getRecurringPayments(currentUser.uid),
        AccountService.getUserAccounts(currentUser.uid)
      ]);
      
      setRecurringPayments(paymentsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProcessDuePayments = async () => {
    if (!currentUser) return;
    
    setGlobalLoading(true, 'Vadesini dolmuş ödemeler işleniyor...');
    try {
      await RecurringPaymentService.processRecurringPayments(currentUser.uid);
      showSnackbar('Vadesini dolmuş ödemeler işlendi.');
      await loadData();
    } catch (error) {
      showSnackbar('Ödemeler işlenirken hata oluştu.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: '',
      category: '',
      accountId: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toTimeString().slice(0, 5),
      reminderDays: 3,
      autoCreateTransaction: true,
    });
  };

  const handleCreateSubmit = async () => {
    if (!currentUser) return;

    setGlobalLoading(true, 'Düzenli ödeme oluşturuluyor...');
    
    // Validation
    if (!formData.name.trim()) {
      showSnackbar('Lütfen ödeme adını girin');
      return;
    }
    if (!formData.category) {
      showSnackbar('Lütfen bir kategori seçin');
      return;
    }
    if (!formData.accountId) {
      showSnackbar('Lütfen bir hesap seçin');
      return;
    }
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      showSnackbar('Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      const category = DEFAULT_EXPENSE_CATEGORIES.find(cat => cat.name === formData.category);
      
      const newPayment: Omit<RecurringPayment, 'id'> = {
        userId: currentUser.uid,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        amount,
        category: formData.category,
        categoryIcon: category?.icon || 'Receipt',
        accountId: formData.accountId,
        frequency: formData.frequency,
        startDate: new Date(`${formData.startDate}T${formData.startTime}`),
        nextPaymentDate: new Date(`${formData.startDate}T${formData.startTime}`),
        isActive: true,
        autoCreateTransaction: formData.autoCreateTransaction,
        reminderDays: formData.reminderDays,
        totalPaid: 0,
        paymentCount: 0,
        createdAt: new Date(),
      };

      await RecurringPaymentService.createRecurringPayment(newPayment);
      showSnackbar('Düzenli ödeme oluşturuldu');
      resetForm();
      setCreateDialogOpen(false);
      await loadData();
    } catch (error) {
      showSnackbar('Ödeme oluşturulurken hata oluştu');
    } finally {
      setGlobalLoading(false);
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, payment: RecurringPayment) => {
    setAnchorEl(event.currentTarget);
    setSelectedPayment(payment);
  };

  const closeMenu = () => {
    setAnchorEl(null);
    setSelectedPayment(null);
  };

  const handleEditClick = () => {
    if (selectedPayment) {
      const startDateTime = new Date(selectedPayment.startDate);
      setFormData({
        name: selectedPayment.name,
        description: selectedPayment.description || '',
        amount: selectedPayment.amount.toString(),
        category: selectedPayment.category,
        accountId: selectedPayment.accountId,
        frequency: selectedPayment.frequency,
        startDate: startDateTime.toISOString().split('T')[0],
        startTime: startDateTime.toTimeString().slice(0, 5),
        reminderDays: selectedPayment.reminderDays,
        autoCreateTransaction: selectedPayment.autoCreateTransaction,
      });
      setEditDialogOpen(true);
    }
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedPayment(null);
  };

  const confirmDelete = async () => {
    if (selectedPayment && currentUser) {
      setGlobalLoading(true, 'Ödeme siliniyor...');
      try {
        await RecurringPaymentService.deleteRecurringPayment(selectedPayment.id);
        showSnackbar('Ödeme başarıyla silindi.');
        loadData();
      } catch (error) {
        showSnackbar('Ödeme silinirken bir hata oluştu.');
      } finally {
        setGlobalLoading(false);
        setDeleteDialogOpen(false);
        setSelectedPayment(null);
      }
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedPayment(null);
    resetForm();
  };

  const handleEditSubmit = async () => {
    if (!currentUser || !selectedPayment) return;

    setGlobalLoading(true, 'Düzenli ödeme güncelleniyor...');

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
        showSnackbar('Lütfen geçerli bir tutar girin');
        setGlobalLoading(false);
        return;
    }

    try {
        const category = DEFAULT_EXPENSE_CATEGORIES.find(cat => cat.name === formData.category);

        const updatedPayment: Partial<RecurringPayment> = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            amount,
            category: formData.category,
            categoryIcon: category?.icon || 'Receipt',
            accountId: formData.accountId,
            frequency: formData.frequency,
            startDate: new Date(`${formData.startDate}T${formData.startTime}`),
            reminderDays: formData.reminderDays,
            autoCreateTransaction: formData.autoCreateTransaction,
        };

        await RecurringPaymentService.updateRecurringPayment(selectedPayment.id, updatedPayment);
        showSnackbar('Düzenli ödeme güncellendi');
        setEditDialogOpen(false);
        resetForm();
        loadData();
    } catch (error) {
        showSnackbar('Ödeme güncellenirken hata oluştu');
    } finally {
        setGlobalLoading(false);
    }
};

  // Filter payments by status
  const activePayments = recurringPayments.filter(p => p.isActive);
  const overduePayments = activePayments.filter(p => new Date(p.nextPaymentDate) < new Date());
  const upcomingPayments = activePayments.filter(p => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const paymentDate = new Date(p.nextPaymentDate);
    return paymentDate >= now && paymentDate <= nextWeek;
  });

  // Calculate summary
  const calculateSummary = (): PaymentSummary => {
    const totalMonthlyAmount = activePayments.reduce((sum, payment) => {
      switch (payment.frequency) {
        case 'daily':
          return sum + (payment.amount * 30);
        case 'weekly':
          return sum + (payment.amount * 4.33);
        case 'monthly':
          return sum + payment.amount;
        case 'yearly':
          return sum + (payment.amount / 12);
        default:
          return sum;
      }
    }, 0);

    return {
      totalMonthlyAmount,
      activeCount: activePayments.length,
      upcomingCount: upcomingPayments.length,
      overdueCount: overduePayments.length,
    };
  };

  const summary = calculateSummary();

  const getFrequencyLabel = (frequency: string): string => {
    const labels: { [key: string]: string } = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
      yearly: 'Yıllık',
    };
    return labels[frequency] || frequency;
  };

  const getStatusColor = (payment: RecurringPayment) => {
    if (!payment.isActive) return '#666666';
    const paymentDate = new Date(payment.nextPaymentDate);
    if (paymentDate < new Date()) return '#F44336';
    const daysUntil = Math.ceil((paymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) return '#FF9800';
    return '#4CAF50';
  };

  const getStatusText = (payment: RecurringPayment): string => {
    if (!payment.isActive) return 'Pasif';
    const paymentDate = new Date(payment.nextPaymentDate);
    const now = new Date();
    
    if (paymentDate < now) return 'Gecikmiş';
    
    const diffInMinutes = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60));
    const diffInHours = Math.ceil(diffInMinutes / 60);
    const diffInDays = Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Same day payments - show hours/minutes
    if (paymentDate.toDateString() === now.toDateString()) {
      if (diffInMinutes <= 60) {
        return `${diffInMinutes} dakika sonra`;
      } else {
        return `${diffInHours} saat sonra`;
      }
    }
    
    // Different day payments
    if (diffInDays === 1) return 'Yarın';
    return `${diffInDays} gün sonra`;
  };

  const renderPaymentCard = (payment: RecurringPayment) => {
    const account = accounts.find(a => a.id === payment.accountId);
    const statusColor = getStatusColor(payment);
    const statusText = getStatusText(payment);

    return (
      <Card
        key={payment.id}
        component={motion.div}
        {...animations.fadeIn}
        sx={{
          mb: 3,
          borderRadius: 4,
          boxShadow: '0 8px 32px 0 rgba(128, 128, 128, 0.15)',
          border: `1px solid ${statusColor}`,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: statusColor, width: 56, height: 56 }}>
                {getCategoryIcon(payment.categoryIcon || 'Receipt')}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{payment.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {payment.description || 'Açıklama yok'}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={(e) => openMenu(e, payment)}>
              <MoreVert />
            </IconButton>
          </Box>
          <Divider sx={{ my: 2 }}/>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>
                {formatCurrency(payment.amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getFrequencyLabel(payment.frequency)}
              </Typography>
            </Box>
            <Chip 
              label={statusText}
              sx={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                fontWeight: 600,
              }}
            />
          </Box>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'text.secondary' }}>
             <Typography variant="body2">
              Sonraki Ödeme: {new Date(payment.nextPaymentDate).toLocaleString('tr-TR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
            <Typography variant="body2">
              Hesap: {account?.name || 'Bilinmiyor'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Düzenli Ödemeler
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Aboneliklerinizi ve düzenli ödemelerinizi yönetin
          </Typography>
        </Box>
        <IconButton onClick={handleRefresh} disabled={refreshing}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <motion.div {...animations.scaleIn} style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card sx={{ background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Aylık Toplam
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatCurrency(summary.totalMonthlyAmount)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...animations.scaleIn} style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card sx={{ background: gradients.success, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Aktif Ödeme
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summary.activeCount}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...animations.scaleIn} style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card sx={{ background: gradients.warning, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Bu Hafta
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summary.upcomingCount}
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...animations.scaleIn} style={{ flex: '1 1 250px', minWidth: '250px' }}>
          <Card sx={{ background: gradients.error, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Gecikmiş
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {summary.overdueCount}
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            Gecikmiş Ödemeler ({overduePayments.length})
          </Typography>
          {overduePayments.map(renderPaymentCard)}
        </Box>
      )}

      {/* All Active Payments */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Tüm Aktif Ödemeler ({activePayments.length})
        </Typography>
        {activePayments.length > 0 ? (
          activePayments.map(renderPaymentCard)
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz düzenli ödeme yok
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                İlk düzenli ödemenizi oluşturmak için + butonuna tıklayın
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                İlk Düzenli Ödemenizi Ekleyin
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: gradients.primary,
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Create Payment Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Düzenli Ödeme Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Ödeme Adı"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Tutar"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
              required
              type="number"
              InputProps={{
                startAdornment: <Typography>₺</Typography>,
              }}
            />

            <FormControl fullWidth required>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                label="Kategori"
              >
                {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(category.name)}
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Hesap</InputLabel>
              <Select
                value={formData.accountId}
                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                label="Hesap"
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sıklık</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                label="Sıklık"
              >
                <MenuItem value="daily">Günlük</MenuItem>
                <MenuItem value="weekly">Haftalık</MenuItem>
                <MenuItem value="monthly">Aylık</MenuItem>
                <MenuItem value="yearly">Yıllık</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Başlangıç Tarihi"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="Başlangıç Saati"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Hatırlatma (gün öncesi)"
              value={formData.reminderDays}
              onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 0 }))}
              type="number"
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoCreateTransaction}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoCreateTransaction: e.target.checked }))}
                />
              }
              label="Otomatik işlem oluştur"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>İptal</Button>
          <Button onClick={handleCreateSubmit} variant="contained">
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Düzenli Ödemeyi Düzenle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Ödeme Adı"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />

            <TextField
              label="Tutar"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
              required
              type="number"
              InputProps={{
                startAdornment: <Typography>₺</Typography>,
              }}
            />

            <FormControl fullWidth required>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                label="Kategori"
              >
                {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category.name} value={category.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(category.name)}
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Hesap</InputLabel>
              <Select
                value={formData.accountId}
                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                label="Hesap"
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sıklık</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                label="Sıklık"
              >
                <MenuItem value="daily">Günlük</MenuItem>
                <MenuItem value="weekly">Haftalık</MenuItem>
                <MenuItem value="monthly">Aylık</MenuItem>
                <MenuItem value="yearly">Yıllık</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Başlangıç Tarihi"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="Başlangıç Saati"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Hatırlatma (gün öncesi)"
              value={formData.reminderDays}
              onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 0 }))}
              type="number"
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.autoCreateTransaction}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoCreateTransaction: e.target.checked }))}
                />
              }
              label="Otomatik işlem oluştur"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>İptal</Button>
          <Button onClick={handleEditSubmit} variant="contained">Güncelle</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Ödemeyi Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu düzenli ödemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>İptal</Button>
          <Button onClick={confirmDelete} color="error">Sil</Button>
        </DialogActions>
      </Dialog>
      
      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Düzenle
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          Sil
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* New Action Buttons */}
      <motion.div {...animations.scaleIn}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'flex-end' }}>
          <Button
            onClick={handleProcessDuePayments}
            variant="outlined"
            sx={{
              borderRadius: 3,
              borderColor: '#f59e0b',
              color: '#f59e0b',
              '&:hover': {
                borderColor: '#d97706',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
              }
            }}
          >
            Vadesini Dolmuş Ödemeleri İşle
          </Button>
        </Box>
      </motion.div>
    </Box>
  );
};

export default RecurringPayments; 