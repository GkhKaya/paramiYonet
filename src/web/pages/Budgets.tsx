import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  Chip,
  Switch,
  Grid
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { Budget } from '../../models/Budget';
import { BudgetService } from '../../services/BudgetService';
import { CategoryService } from '../../services/CategoryService';
import { Category, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

const BudgetsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({
    categoryName: '',
    budgetedAmount: '',
    period: 'monthly',
    budgetType: 'single',
    includeIncome: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load budgets
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    BudgetService.getBudgets(currentUser.uid)
      .then(setBudgets)
      .finally(() => setLoading(false));
    // Fetch categories (default + user)
    CategoryService.getUserCategories(currentUser.uid).then(userCategories => {
      const defaultExpense: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((cat, i) => ({ ...cat, id: `default_expense_${i}`, userId: currentUser.uid }));
      const defaultIncome: Category[] = DEFAULT_INCOME_CATEGORIES.map((cat, i) => ({ ...cat, id: `default_income_${i}`, userId: currentUser.uid }));
      setCategories([...defaultExpense, ...(form.includeIncome ? defaultIncome : []), ...userCategories]);
    });
  }, [currentUser, form.includeIncome]);

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditBudget(budget);
      setForm({
        categoryName: budget.categoryName,
        budgetedAmount: budget.budgetedAmount.toString(),
        period: budget.period,
        budgetType: budget.categoryName === 'Tüm Kategoriler' ? 'all' : 'single',
        includeIncome: false,
      });
    } else {
      setEditBudget(null);
      setForm({
        categoryName: '',
        budgetedAmount: '',
        period: 'monthly',
        budgetType: 'single',
        includeIncome: false,
      });
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditBudget(null);
    setFormError(null);
  };

  const handleFormChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'budgetType' && value === 'all') {
      setForm((prev) => ({ ...prev, categoryName: '' }));
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (form.budgetType === 'single' && !form.categoryName) {
      setFormError('Lütfen bir kategori seçin.');
      return;
    }
    const numericAmount = parseFloat(form.budgetedAmount.replace(',', '.'));
    if (!form.budgetedAmount || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Geçerli bir tutar girin.');
      return;
    }
    if (!currentUser) {
      setFormError('Kullanıcı bulunamadı.');
      return;
    }
    const startDate = new Date();
    const endDate = new Date();
    if (form.period === 'monthly') {
      startDate.setDate(1);
      endDate.setMonth(endDate.getMonth() + 1, 0);
    } else {
      const dayOfWeek = startDate.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(startDate.getDate() + diffToMonday);
      endDate.setDate(startDate.getDate() + 6);
    }
    try {
      if (editBudget) {
        await BudgetService.updateBudget(editBudget.id, {
          categoryName: form.budgetType === 'all' ? 'Tüm Kategoriler' : form.categoryName,
          budgetedAmount: numericAmount,
          period: form.period as 'monthly' | 'weekly',
          startDate,
          endDate,
        });
      } else {
        let catObj = DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === form.categoryName);
        if (form.budgetType === 'all') catObj = undefined;
        await BudgetService.createBudget({
          userId: currentUser.uid,
          categoryName: form.budgetType === 'all' ? 'Tüm Kategoriler' : form.categoryName,
          categoryIcon: catObj?.icon || 'ellipsis-horizontal',
          categoryColor: catObj?.color || '#95A5A6',
          budgetedAmount: numericAmount,
          spentAmount: 0,
          remainingAmount: numericAmount,
          progressPercentage: 0,
          period: form.period as 'monthly' | 'weekly',
          startDate,
          endDate,
          createdAt: new Date(),
        });
      }
      // Refresh
      const data = await BudgetService.getBudgets(currentUser.uid);
      setBudgets(data);
      handleCloseModal();
    } catch (e) {
      setFormError('Kayıt sırasında hata oluştu.');
    }
  };

  const handleDelete = async (budget: Budget) => {
    if (!window.confirm('Bu bütçeyi silmek istediğinize emin misiniz?')) return;
    await BudgetService.deleteBudget(budget.id);
    setBudgets(budgets.filter(b => b.id !== budget.id));
  };

  // Category options (now from state)
  const categoryOptions = categories;

  // Budget summary
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const overBudgetCount = budgets.filter(b => b.progressPercentage >= 100).length;
  const activeBudgetCount = budgets.length;
  const progressPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', overflow: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Bütçeler</Typography>
      </Box>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Bütçe Özeti</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Toplam Bütçe</Typography>
              <Typography variant="h6">{formatCurrency(totalBudgeted)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Harcanan</Typography>
              <Typography variant="h6" color={progressPercentage >= 100 ? 'error' : progressPercentage >= 80 ? 'warning.main' : 'success.main'}>{formatCurrency(totalSpent)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Kalan</Typography>
              <Typography variant="h6" color={totalBudgeted-totalSpent < 0 ? 'error' : 'success.main'}>{formatCurrency(totalBudgeted-totalSpent)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Aktif Bütçe</Typography>
              <Typography variant="h6">{activeBudgetCount}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Aşım</Typography>
              <Typography variant="h6" color="error">{overBudgetCount}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <LinearProgress variant="determinate" value={Math.min(progressPercentage, 100)} sx={{ height: 10, borderRadius: 5, background: '#eee', '& .MuiLinearProgress-bar': { backgroundColor: progressPercentage >= 100 ? '#ef4444' : progressPercentage >= 80 ? '#f59e0b' : '#10b981' } }} />
              <Typography variant="caption" color={progressPercentage >= 100 ? 'error' : progressPercentage >= 80 ? 'warning.main' : 'success.main'}>{progressPercentage.toFixed(0)}%</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : budgets.length === 0 ? (
        <Typography color="text.secondary">Henüz bütçe eklenmedi.</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {budgets.map((budget) => (
            <Card key={budget.id} sx={{ borderLeft: budget.progressPercentage >= 100 ? '4px solid #ef4444' : budget.progressPercentage >= 80 ? '4px solid #f59e0b' : '4px solid #10b981' }}>
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
                    <IconButton onClick={() => handleOpenModal(budget)}><Edit /></IconButton>
                    <IconButton color="error" onClick={() => handleDelete(budget)}><Delete /></IconButton>
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={Math.min(budget.progressPercentage, 100)} sx={{ height: 8, borderRadius: 4, background: '#eee', '& .MuiLinearProgress-bar': { backgroundColor: budget.progressPercentage >= 100 ? '#ef4444' : budget.progressPercentage >= 80 ? '#f59e0b' : '#10b981' } }} />
                  <Typography variant="caption" color={budget.progressPercentage >= 100 ? 'error' : budget.progressPercentage >= 80 ? 'warning.main' : 'success.main'}>{budget.progressPercentage.toFixed(0)}%</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {/* Modal */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
        <DialogTitle>{editBudget ? 'Bütçeyi Düzenle' : 'Yeni Bütçe'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant={form.budgetType === 'single' ? 'contained' : 'outlined'}
              onClick={() => handleFormChange('budgetType', 'single')}
            >
              Tek Kategori
            </Button>
            <Button
              variant={form.budgetType === 'all' ? 'contained' : 'outlined'}
              onClick={() => handleFormChange('budgetType', 'all')}
            >
              Tüm Kategoriler
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" mb={2} display="block">
            {form.budgetType === 'single' ? 'Belirli bir kategori için bütçe oluşturun.' : 'Tüm kategoriler için toplam bütçe belirleyin.'}
          </Typography>
          {form.budgetType === 'single' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Switch
                  checked={form.includeIncome}
                  onChange={e => handleFormChange('includeIncome', e.target.checked)}
                  size="small"
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Gelir kategorilerini dahil et
                </Typography>
              </Box>
              <Autocomplete
                options={categoryOptions}
                getOptionLabel={option => option.name}
                value={categoryOptions.find(c => c.name === form.categoryName) || null}
                onChange={(_, value) => handleFormChange('categoryName', value ? value.name : '')}
                renderInput={(params) => <TextField {...params} label="Kategori" fullWidth />}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                sx={{ mb: 2 }}
              />
            </>
          )}
          <TextField
            label="Bütçe Tutarı"
            value={form.budgetedAmount}
            onChange={e => handleFormChange('budgetedAmount', e.target.value)}
            fullWidth
            margin="normal"
            type="number"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Periyot</InputLabel>
            <Select
              value={form.period}
              label="Periyot"
              onChange={e => handleFormChange('period', e.target.value)}
            >
              <MenuItem value="monthly">Aylık</MenuItem>
              <MenuItem value="weekly">Haftalık</MenuItem>
            </Select>
          </FormControl>
          {formError && <Typography color="error" variant="body2">{formError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>İptal</Button>
          <Button onClick={handleSave} variant="contained">{editBudget ? 'Kaydet' : 'Ekle'}</Button>
        </DialogActions>
      </Dialog>
      {/* FAB for Bütçe Ekle */}
      <Button
        variant="contained"
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          borderRadius: '50%',
          minWidth: 0,
          width: 56,
          height: 56,
          boxShadow: 4,
          zIndex: 1201
        }}
        onClick={() => handleOpenModal()}
      >
        <Add />
      </Button>
    </Box>
  );
};

export default BudgetsPage; 