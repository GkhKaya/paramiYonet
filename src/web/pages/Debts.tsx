import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  TrendingDown,
  People,
  Payment,
  Delete,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { gradients, animations } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { DebtViewModel } from '../../viewmodels/DebtViewModel';
import { AccountViewModel } from '../../viewmodels/AccountViewModel';
import { Debt, DebtType, DebtStatus } from '../../models/Debt';
import { Account, AccountType } from '../../models/Account';
import { formatCurrency } from '../../utils/formatters';

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
      id={`debt-tabpanel-${index}`}
      aria-labelledby={`debt-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Debts: React.FC = () => {
  const { currentUser } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  
  // ViewModels
  const [debtViewModel, setDebtViewModel] = useState<DebtViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  
  // State
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog state
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: DebtType.LENT,
    personName: '',
    amount: '',
    accountId: '',
    description: '',
  });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
  });

  // Initialize ViewModels
  useEffect(() => {
    if (currentUser?.uid) {
      const debtVm = new DebtViewModel(currentUser.uid);
      const accountVm = new AccountViewModel(currentUser.uid);
      
      setDebtViewModel(debtVm);
      setAccountViewModel(accountVm);
      
      loadData(debtVm, accountVm);
    }
  }, [currentUser]);

  const loadData = async (debtVm: DebtViewModel, accountVm: AccountViewModel) => {
    setLoading(true);
    setGlobalLoading(true, 'Borç verileri yükleniyor...');
    
    try {
      await Promise.all([
        debtVm.loadDebts(),
        accountVm.loadAccounts()
      ]);
      
      setDebts(debtVm.debts);
      setAccounts(accountVm.accounts.filter(acc => 
        acc.type !== AccountType.CREDIT_CARD && 
        acc.type !== AccountType.GOLD &&
        acc.isActive
      ));
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // Filter debts by tab
  const getFilteredDebts = () => {
    switch (tabValue) {
      case 1: // Lent
        return debts.filter(debt => debt.type === DebtType.LENT);
      case 2: // Borrowed
        return debts.filter(debt => debt.type === DebtType.BORROWED);
      default: // All
        return debts;
    }
  };

  // Statistics
  const totalLent = debts
    .filter(d => d.type === DebtType.LENT && d.status !== DebtStatus.PAID)
    .reduce((sum, d) => sum + d.currentAmount, 0);
    
  const totalBorrowed = debts
    .filter(d => d.type === DebtType.BORROWED && d.status !== DebtStatus.PAID)
    .reduce((sum, d) => sum + d.currentAmount, 0);

  // Chart data
  const chartData = [
    { name: 'Verilen', value: totalLent, color: '#4caf50' },
    { name: 'Alınan', value: totalBorrowed, color: '#f44336' },
  ].filter(item => item.value > 0);

  // Handlers
  const handleAddDebt = async () => {
    if (!debtViewModel || !formData.personName || !formData.amount || !formData.accountId) {
      return;
    }

    const success = await debtViewModel.createDebt(
      formData.type,
      formData.personName,
      parseFloat(formData.amount),
      formData.accountId,
      formData.description
    );

    if (success) {
      setDebts(debtViewModel.debts);
      setOpenAddDialog(false);
      resetForm();
    }
  };

  const handleAddPayment = async () => {
    if (!debtViewModel || !selectedDebt || !paymentData.amount) {
      return;
    }

    const success = await debtViewModel.addPayment(
      selectedDebt.id,
      parseFloat(paymentData.amount),
      paymentData.description
    );

    if (success) {
      setDebts(debtViewModel.debts);
      setOpenPaymentDialog(false);
      setSelectedDebt(null);
      setPaymentData({ amount: '', description: '' });
    }
  };

  const handleDeleteDebt = async (debt: Debt) => {
    if (!debtViewModel) return;
    
    if (window.confirm(`"${debt.personName}" ile olan borcu silmek istediğinizden emin misiniz?`)) {
      const success = await debtViewModel.deleteDebt(debt.id);
      if (success) {
        setDebts(debtViewModel.debts);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      type: DebtType.LENT,
      personName: '',
      amount: '',
      accountId: '',
      description: '',
    });
  };

  const getStatusColor = (status: DebtStatus): 'success' | 'warning' | 'error' => {
    switch (status) {
      case DebtStatus.PAID: return 'success';
      case DebtStatus.PARTIAL: return 'warning';
      default: return 'error';
    }
  };

  const getStatusText = (status: DebtStatus): string => {
    switch (status) {
      case DebtStatus.PAID: return 'Ödendi';
      case DebtStatus.PARTIAL: return 'Kısmi';
      default: return 'Aktif';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Borç verileri yükleniyor...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <motion.div {...animations.fadeIn}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', background: gradients.primary, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Borç Yönetimi
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Yeni Borç
          </Button>
        </Box>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div {...animations.fadeIn} style={{ animationDelay: '0.1s' }}>
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card sx={{ borderRadius: 3, background: gradients.success }}>
              <CardContent sx={{ color: 'white', textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Verilen Borçlar</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(totalLent)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card sx={{ borderRadius: 3, background: gradients.error }}>
              <CardContent sx={{ color: 'white', textAlign: 'center' }}>
                <TrendingDown sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6">Alınan Borçlar</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(totalBorrowed)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <People sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                <Typography variant="h6" color="text.secondary">
                  Toplam Borç
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {debts.filter(d => d.status !== DebtStatus.PAID).length}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </motion.div>

      {/* Chart */}
      {chartData.length > 0 && (
        <motion.div {...animations.fadeIn} style={{ animationDelay: '0.2s' }}>
          <Card sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Borç Dağılımı
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div {...animations.fadeIn} style={{ animationDelay: '0.3s' }}>
        <Card sx={{ borderRadius: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label={`Tümü (${debts.length})`} />
              <Tab label={`Verdiklerim (${debts.filter(d => d.type === DebtType.LENT).length})`} />
              <Tab label={`Aldıklarım (${debts.filter(d => d.type === DebtType.BORROWED).length})`} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <DebtList debts={getFilteredDebts()} onAddPayment={(debt) => { setSelectedDebt(debt); setOpenPaymentDialog(true); }} onDelete={handleDeleteDebt} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <DebtList debts={getFilteredDebts()} onAddPayment={(debt) => { setSelectedDebt(debt); setOpenPaymentDialog(true); }} onDelete={handleDeleteDebt} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <DebtList debts={getFilteredDebts()} onAddPayment={(debt) => { setSelectedDebt(debt); setOpenPaymentDialog(true); }} onDelete={handleDeleteDebt} />
          </TabPanel>
        </Card>
      </motion.div>

      {/* Add Debt Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Borç Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Borç Türü"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DebtType })}
            >
              <MenuItem value={DebtType.LENT}>Verilen Borç</MenuItem>
              <MenuItem value={DebtType.BORROWED}>Alınan Borç</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Kişi Adı"
              value={formData.personName}
              onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Tutar"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label="Hesap"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.balance)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>İptal</Button>
          <Button onClick={handleAddDebt} variant="contained">
            Ekle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Ödeme Ekle - {selectedDebt?.personName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Kalan Borç: {selectedDebt ? formatCurrency(selectedDebt.currentAmount) : '0'}
            </Alert>
            <TextField
              fullWidth
              label="Ödeme Tutarı"
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              inputProps={{ max: selectedDebt?.currentAmount }}
            />
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              multiline
              rows={2}
              value={paymentData.description}
              onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>İptal</Button>
          <Button onClick={handleAddPayment} variant="contained">
            Ödeme Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Debt List Component
interface DebtListProps {
  debts: Debt[];
  onAddPayment: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

const DebtList: React.FC<DebtListProps> = ({ debts, onAddPayment, onDelete }) => {
  if (debts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <People sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Henüz borç kaydı bulunmuyor
        </Typography>
        <Typography color="text.disabled">
          Yeni borç eklemek için yukarıdaki butonu kullanın
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      <AnimatePresence>
        {debts.map((debt, index) => (
          <motion.div
            key={debt.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
          >
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ 
                  bgcolor: debt.type === DebtType.LENT ? '#4caf50' : '#f44336',
                  color: 'white'
                }}>
                  {debt.type === DebtType.LENT ? <ArrowUpward /> : <ArrowDownward />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {debt.personName}
                    </Typography>
                    <Chip
                      size="small"
                      label={debt.type === DebtType.LENT ? 'Verilen' : 'Alınan'}
                      color={debt.type === DebtType.LENT ? 'success' : 'error'}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={getStatusText(debt.status)}
                      color={getStatusColor(debt.status)}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Tutar: {formatCurrency(debt.originalAmount)} • 
                      Kalan: {formatCurrency(debt.currentAmount)}
                    </Typography>
                    {debt.description && (
                      <Typography variant="body2" color="text.secondary">
                        {debt.description}
                      </Typography>
                    )}
                    {debt.status === DebtStatus.PARTIAL && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ödenen: {formatCurrency(debt.paidAmount)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(debt.paidAmount / debt.originalAmount) * 100}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </Box>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {debt.status !== DebtStatus.PAID && (
                    <IconButton
                      size="small"
                      onClick={() => onAddPayment(debt)}
                      color="primary"
                    >
                      <Payment />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onDelete(debt)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          </motion.div>
        ))}
      </AnimatePresence>
    </List>
  );
};

// Helper functions
const getStatusColor = (status: DebtStatus): 'success' | 'warning' | 'error' => {
  switch (status) {
    case DebtStatus.PAID: return 'success';
    case DebtStatus.PARTIAL: return 'warning';
    default: return 'error';
  }
};

const getStatusText = (status: DebtStatus): string => {
  switch (status) {
    case DebtStatus.PAID: return 'Ödendi';
    case DebtStatus.PARTIAL: return 'Kısmi';
    default: return 'Aktif';
  }
};

export default Debts; 