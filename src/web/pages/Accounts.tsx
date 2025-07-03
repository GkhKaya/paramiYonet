import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Avatar,
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  AccountBalance,
  CreditCard,
  Diamond,
  TrendingUp,
  AttachMoney,
  Savings,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { gradients, animations } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';
import { Account, AccountType, GoldType, GoldHolding, GoldHoldings } from '../../models/Account';
import { AccountService } from '../../services/AccountService';
import GoldPriceService from '../../services/GoldPriceService';
import { formatCurrency } from '../../utils/formatters';
import GoldAccountDetail from './GoldAccountDetail';

const AccountsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuAccountId, setMenuAccountId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Gold account detail state
  const [goldDetailAccount, setGoldDetailAccount] = useState<Account | null>(null);
  
  // Edit form states
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountBalance, setEditAccountBalance] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editCurrentDebt, setEditCurrentDebt] = useState('');
  const [editStatementDay, setEditStatementDay] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIncludeInTotal, setEditIncludeInTotal] = useState(true);
  
  // New account creation states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>(AccountType.DEBIT_CARD);
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#10b981');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  
  // Gold account specific states
  const [goldQuantities, setGoldQuantities] = useState({
    GRA: '',          // Gram
    CEYREKALTIN: '',  // Çeyrek
    YARIMALTIN: '',   // Yarım
    TAMALTIN: ''      // Tam
  });
  
  // Credit card specific states
  const [creditLimit, setCreditLimit] = useState('');
  const [currentDebt, setCurrentDebt] = useState('');
  const [statementDay, setStatementDay] = useState('1');
  const [dueDay, setDueDay] = useState('10');

  useEffect(() => {
    loadAccounts();
  }, [currentUser]);

  const loadAccounts = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const accountsData = await AccountService.getUserAccounts(currentUser.uid);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, accountId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuAccountId(accountId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuAccountId('');
  };

  const handleDeleteClick = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEditClick = (account: Account) => {
    setSelectedAccount(account);
    setSelectedColor(account.color);
    setEditAccountName(account.name);
    setEditAccountBalance(account.balance.toString());
    setEditCreditLimit(account.limit?.toString() || '');
    setEditCurrentDebt(account.currentDebt?.toString() || '');
    setEditStatementDay(account.statementDay?.toString() || '1');
    setEditDueDay(account.dueDay?.toString() || '10');
    setEditIsActive(account.isActive);
    setEditIncludeInTotal(account.includeInTotalBalance ?? true);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDetailClick = (account: Account) => {
    if (account.type === AccountType.GOLD) {
      setGoldDetailAccount(account);
    } else {
      setSelectedAccount(account);
      setDetailDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedAccount) {
      try {
        // Remove from state (in real app, would call AccountService.deleteAccount)
        setAccounts(accounts.filter(acc => acc.id !== selectedAccount.id));
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const handleEditSave = async () => {
    if (!selectedAccount || !currentUser) return;
    
    try {
      const updates: any = {
        name: editAccountName,
        color: selectedColor,
        isActive: editIsActive,
        includeInTotalBalance: editIncludeInTotal,
      };

      // Add balance for non-credit cards
      if (selectedAccount.type !== 'credit_card') {
        updates.balance = parseFloat(editAccountBalance) || 0;
      }

      // Add credit card specific fields
      if (selectedAccount.type === 'credit_card') {
        updates.limit = parseFloat(editCreditLimit) || 0;
        updates.currentDebt = parseFloat(editCurrentDebt) || 0;
        updates.statementDay = parseInt(editStatementDay) || 1;
        updates.dueDay = parseInt(editDueDay) || 10;
      }

      // Update in Firebase
      await AccountService.updateAccount(selectedAccount.id, updates);
      
      // Update local state
      setAccounts(accounts.map(acc => 
        acc.id === selectedAccount.id 
          ? { ...acc, ...updates }
          : acc
      ));
      
      setEditDialogOpen(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
             case 'debit_card':
         return <AccountBalance />;
      case 'credit_card':
        return <CreditCard />;
      case 'gold':
        return <Diamond />;
      case 'savings':
        return <Savings />;
      case 'investment':
        return <TrendingUp />;
      case 'cash':
        return <AccountBalanceWallet />;
      default:
        return <AttachMoney />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
             case 'debit_card':
         return 'Banka Kartı';
       case 'credit_card':
         return 'Kredi Kartı';
      case 'gold':
        return 'Altın Hesabı';
      case 'savings':
        return 'Tasarruf';
      case 'investment':
        return 'Yatırım';
      case 'cash':
        return 'Nakit';
      default:
        return 'Hesap';
    }
  };

  const getTotalBalance = () => {
    return accounts
      .filter(account => account.includeInTotalBalance)
      .reduce((total, account) => {
        if (account.type === 'credit_card') {
          // Kredi kartı borcu toplam bakiyeden düşer (negatif değer olarak)
          return total - (account.currentDebt || 0);
        }
        return total + account.balance;
      }, 0);
  };

  const getCreditCardUsage = (account: Account) => {
    if (account.type !== 'credit_card' || !account.limit) return 0;
    return ((account.currentDebt || 0) / account.limit) * 100;
  };

  const handleCreateAccount = async () => {
    setError('');
    setSuccess('');
    
    if (!currentUser) {
      setError('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    
    if (!newAccountName.trim()) {
      setError('Lütfen hesap adını girin.');
      return;
    }
    
    if (newAccountName.trim().length < 2) {
      setError('Hesap adı en az 2 karakter olmalıdır.');
      return;
    }
    
    const isStandardAccount = newAccountType !== AccountType.GOLD && newAccountType !== AccountType.CREDIT_CARD;
    if (isStandardAccount && !newAccountBalance.trim()) {
      setError('Lütfen hesap bakiyesini girin.');
      return;
    }
    
    if (isStandardAccount && isNaN(parseFloat(newAccountBalance))) {
      setError('Geçerli bir bakiye tutarı girin.');
      return;
    }
    
    if (newAccountType === AccountType.CREDIT_CARD) {
      if (!creditLimit.trim() || isNaN(parseFloat(creditLimit))) {
        setError('Lütfen geçerli bir kredi kartı limiti girin.');
        return;
      }
      if (currentDebt.trim() && isNaN(parseFloat(currentDebt))) {
        setError('Geçerli bir borç tutarı girin.');
        return;
      }
    }

    try {
      let finalGoldHoldings: GoldHoldings | undefined = undefined;
      let finalBalance = parseFloat(newAccountBalance) || 0;

      if (newAccountType === AccountType.GOLD) {
        const goldPriceService = GoldPriceService.getInstance();
        const currentGoldPrices = await goldPriceService.getAllGoldPrices();
        
        const holdingsArray = Object.entries(goldQuantities)
          .filter(([, value]) => parseFloat(value) > 0)
          .map(([key, value]) => ({
            type: key as GoldType,
            quantity: parseFloat(value),
            initialPrice: currentGoldPrices.prices[key as GoldType] || 0,
            purchaseDate: new Date(),
          }));

        if (holdingsArray.length > 0) {
            finalGoldHoldings = holdingsArray.reduce((acc, holding) => {
              if (!acc[holding.type]) {
                acc[holding.type] = [];
              }
              acc[holding.type]!.push(holding);
              return acc;
            }, {} as GoldHoldings);
    
            finalBalance = holdingsArray.reduce((total, holding) => {
                return total + (holding.quantity * holding.initialPrice);
            }, 0);
        } else {
            setError('Lütfen altın hesabı için en az bir altın türü ve miktarı girin.');
            return;
        }
      }

      const newAccountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'icon' | 'isActive' | 'goldGrams'> = {
        userId: currentUser.uid,
        name: newAccountName,
        type: newAccountType,
        balance: finalBalance,
        color: newAccountColor,
        currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
        openingDate: new Date(),
        includeInTotalBalance: includeInTotal,
      };

      if (newAccountType === AccountType.CREDIT_CARD) {
        newAccountData.limit = parseFloat(creditLimit) || 0;
        newAccountData.currentDebt = parseFloat(currentDebt) || 0;
        newAccountData.statementDay = parseInt(statementDay, 10) || 1;
        newAccountData.dueDay = parseInt(dueDay, 10) || 10;
        newAccountData.balance = -(parseFloat(currentDebt) || 0);
      }
      
      if (finalGoldHoldings) {
        newAccountData.goldHoldings = finalGoldHoldings;
      }

      setSuccess('Hesap oluşturuluyor...');
      await AccountService.createAccount(newAccountData);
      
      // Reset form and close dialog
      setCreateDialogOpen(false);
      setNewAccountName('');
      setNewAccountType(AccountType.DEBIT_CARD);
      setNewAccountBalance('');
      setNewAccountColor('#10b981');
      setIncludeInTotal(true);
      setCreditLimit('');
      setCurrentDebt('');
      setStatementDay('1');
      setDueDay('10');
      setGoldQuantities({ GRA: '', CEYREKALTIN: '', YARIMALTIN: '', TAMALTIN: '' });
      
      setSuccess('Hesap başarıyla oluşturuldu!');
      loadAccounts();

      // Başarı mesajını 3 saniye sonra temizle
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      console.error("Error creating account:", error);
      setError('Hesap oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If gold detail account is selected, show gold detail page
  if (goldDetailAccount) {
    return (
      <GoldAccountDetail
        account={goldDetailAccount}
        onBack={() => setGoldDetailAccount(null)}
        onAccountUpdate={(updatedAccount) => {
          // Update the account in the list
          setAccounts(accounts.map(acc => 
            acc.id === updatedAccount.id ? updatedAccount : acc
          ));
          setGoldDetailAccount(updatedAccount);
        }}
      />
    );
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', // AppBar height'ını çıkar
      overflowY: 'auto',
      overflowX: 'hidden',
      p: { xs: 2, md: 3 },
      pb: 6,
      width: '100%',
      maxWidth: 'none'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Hesaplarım
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tüm hesaplarınızı görüntüleyin ve yönetin
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        mb: 4, 
        flexWrap: 'wrap',
        '& > *': { flex: 1, minWidth: '300px' }
      }}>
        <motion.div {...animations.scaleIn}>
          <Card sx={{ background: gradients.primary, color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Toplam Bakiye
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {balanceVisible ? formatCurrency(getTotalBalance()) : '••••••'}
                  </Typography>
                </Box>
                <Box>
                  <IconButton 
                    sx={{ color: 'white', mb: 1 }}
                    onClick={() => setBalanceVisible(!balanceVisible)}
                  >
                    {balanceVisible ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  <AccountBalance sx={{ fontSize: 40, opacity: 0.8, display: 'block' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...animations.scaleIn}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Aktif Hesap Sayısı
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {accounts.filter(acc => acc.isActive).length}
                  </Typography>
                </Box>
                <CreditCard sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      {/* Accounts List */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Hesap Listesi
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)'
        },
        gap: 3,
        width: '100%'
      }}>
        {accounts.map((account, index) => (
          <motion.div
            key={account.id}
            {...animations.slideIn}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Card 
              sx={{ 
                height: '100%',
                position: 'relative',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'all 0.2s',
                  boxShadow: 4
                } 
              }}
            >
                <CardContent>
                  {/* Header */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: account.color, width: 48, height: 48 }}>
                      {getAccountIcon(account.type)}
                    </Avatar>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, account.id)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Account Info */}
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {account.name}
                  </Typography>
                  
                  <Chip 
                    label={getAccountTypeLabel(account.type)} 
                    size="small" 
                    sx={{ mb: 2, bgcolor: `${account.color}20`, color: account.color }}
                  />

                  {/* Balance */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {account.type === 'credit_card' ? 'Mevcut Borç' : 'Bakiye'}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700, 
                      mb: 2,
                      color: account.type === 'credit_card' ? 
                        (account.currentDebt && account.currentDebt > 0 ? 'error.main' : 'success.main') :
                        (account.balance < 0 ? 'error.main' : 'text.primary')
                    }}
                  >
                    {balanceVisible ? formatCurrency(
                      account.type === 'credit_card' ? (account.currentDebt || 0) : Math.abs(account.balance)
                    ) : '••••••'}
                  </Typography>

                  {/* Credit Card Specific Info */}
                  {account.type === 'credit_card' && account.limit && (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Limit Kullanımı
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getCreditCardUsage(account).toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getCreditCardUsage(account)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getCreditCardUsage(account) > 80 ? '#ef4444' : 
                                           getCreditCardUsage(account) > 60 ? '#f59e0b' : '#10b981',
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Kalan Limit: {formatCurrency(account.limit - (account.currentDebt || 0))}
                      </Typography>
                    </Box>
                  )}

                  {/* Gold Account Specific Info */}
                  {account.type === 'gold' && account.goldHoldings && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Altın Portföyü
                      </Typography>
                      {Object.entries(account.goldHoldings).map(([type, holdings]) => (
                        holdings.length > 0 && (
                          <Box key={type} display="flex" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption">
                              {type === 'GRA' ? 'Gram' : 
                               type === 'CEYREKALTIN' ? 'Çeyrek' :
                               type === 'YARIMALTIN' ? 'Yarım' : 'Tam'} Altın
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {holdings.reduce((sum: number, h: GoldHolding) => sum + h.quantity, 0)} {type === 'GRA' ? 'gr' : 'adet'}
                            </Typography>
                          </Box>
                        )
                      ))}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setGoldDetailAccount(account)}
                        sx={{ 
                          mt: 1, 
                          width: '100%',
                          borderColor: '#fbbf24',
                          color: '#fbbf24',
                          '&:hover': {
                            borderColor: '#f59e0b',
                            bgcolor: 'rgba(251,191,36,0.1)'
                          }
                        }}
                      >
                        Detayları Görüntüle
                      </Button>
                    </Box>
                  )}

                  {/* Status */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Chip 
                      label={account.isActive ? 'Aktif' : 'Pasif'} 
                      size="small"
                      color={account.isActive ? 'success' : 'default'}
                    />
                    {account.includeInTotalBalance && (
                      <Chip 
                        label="Toplama Dahil" 
                        size="small" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
        ))}
      </Box>

      {/* Empty State */}
      {accounts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AccountBalance sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Henüz hesap eklenmemiş
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            İlk hesabınızı ekleyerek başlayın
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Hesap Ekle
          </Button>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: gradients.primary,
        }}
      >
        <Add />
      </Fab>

      {/* Account Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const account = accounts.find(acc => acc.id === menuAccountId);
          if (account) handleEditClick(account);
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const account = accounts.find(acc => acc.id === menuAccountId);
          if (account) handleDetailClick(account);
        }}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>Detayları Görüntüle</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            const account = accounts.find(acc => acc.id === menuAccountId);
            if (account) handleDeleteClick(account);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* Account Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: selectedAccount?.color, width: 48, height: 48 }}>
              {selectedAccount && getAccountIcon(selectedAccount.type)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedAccount?.name}
              </Typography>
              <Chip 
                label={selectedAccount && getAccountTypeLabel(selectedAccount.type)} 
                size="small" 
                sx={{ bgcolor: `${selectedAccount?.color}20`, color: selectedAccount?.color }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box sx={{ mt: 2 }}>
              {/* Balance Info */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Bakiye Bilgileri
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body1">
                      {selectedAccount.type === 'credit_card' ? 'Mevcut Borç' : 'Bakiye'}
                    </Typography>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700,
                      color: selectedAccount.type === 'credit_card' ? 
                        (selectedAccount.currentDebt && selectedAccount.currentDebt > 0 ? 'error.main' : 'success.main') :
                        (selectedAccount.balance < 0 ? 'error.main' : 'success.main')
                    }}>
                      {formatCurrency(
                        selectedAccount.type === 'credit_card' ? 
                          (selectedAccount.currentDebt || 0) : 
                          Math.abs(selectedAccount.balance)
                      )}
                    </Typography>
                  </Box>
                  
                  {selectedAccount.type === 'credit_card' && selectedAccount.limit && (
                    <>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2">Kredi Limiti</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {formatCurrency(selectedAccount.limit)}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="body2">Kalan Limit</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {formatCurrency(selectedAccount.limit - (selectedAccount.currentDebt || 0))}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getCreditCardUsage(selectedAccount)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getCreditCardUsage(selectedAccount) > 80 ? '#ef4444' : 
                                           getCreditCardUsage(selectedAccount) > 60 ? '#f59e0b' : '#10b981',
                          },
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Limit Kullanımı: {getCreditCardUsage(selectedAccount).toFixed(1)}%
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>

                                {/* Gold Account Details */}
                  {selectedAccount.type === 'gold' && selectedAccount.goldHoldings && (
                    <Card sx={{ mb: 3 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          💰 Altın Portföy Detayları
                        </Typography>
                        
                        {/* Genel Özet */}
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,193,7,0.1)', borderRadius: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#f59e0b' }}>
                            📊 Genel Özet
                          </Typography>
                          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Toplam Değer</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                                {formatCurrency(selectedAccount.balance)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Hesap Türü</Typography>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                Fiziki Altın
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Altın Türleri Detayı */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          🔍 Altın Türleri Detayı
                        </Typography>
                        {Object.entries(selectedAccount.goldHoldings).map(([type, holdings]) => (
                          holdings.length > 0 && (
                            <Box key={type} sx={{ 
                              mb: 2, 
                              p: 2, 
                              border: '1px solid rgba(255,193,7,0.3)', 
                              borderRadius: 2,
                              bgcolor: 'rgba(255,193,7,0.05)'
                            }}>
                              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                                <Diamond sx={{ color: '#f59e0b', fontSize: 20 }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {type === 'GRA' ? 'Gram Altın' : 
                                   type === 'CEYREKALTIN' ? 'Çeyrek Altın' :
                                   type === 'YARIMALTIN' ? 'Yarım Altın' : 'Tam Altın'}
                                </Typography>
                              </Box>
                              
                              <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Miktar</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {holdings.reduce((sum: number, h: GoldHolding) => sum + h.quantity, 0)} {type === 'GRA' ? 'gram' : 'adet'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">Ortalama Fiyat</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {formatCurrency(
                                      holdings.reduce((sum: number, h: GoldHolding) => sum + h.initialPrice, 0) / holdings.length
                                    )}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">İlk Alım</Typography>
                                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {new Date(holdings[0].purchaseDate).toLocaleDateString('tr-TR')}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              {/* Kar/Zarar hesaplaması için placeholder */}
                              <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(16,185,129,0.1)', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">Toplam Değer</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                                  {formatCurrency(
                                    holdings.reduce((sum: number, h: GoldHolding) => sum + (h.quantity * h.initialPrice), 0)
                                  )}
                                </Typography>
                              </Box>
                            </Box>
                          )
                        ))}
                        
                        {/* Altın Ekleme Butonu */}
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                          <Button 
                            variant="outlined" 
                            startIcon={<Add />}
                            sx={{ 
                              borderColor: '#f59e0b', 
                              color: '#f59e0b',
                              '&:hover': { 
                                borderColor: '#d97706', 
                                bgcolor: 'rgba(245,158,11,0.1)' 
                              }
                            }}
                          >
                            Altın Ekle
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

              {/* Account Settings */}
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Hesap Ayarları
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body1">Durum</Typography>
                    <Chip 
                      label={selectedAccount.isActive ? 'Aktif' : 'Pasif'} 
                      color={selectedAccount.isActive ? 'success' : 'default'}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="body1">Toplam Bakiyeye Dahil</Typography>
                    <Chip 
                      label={selectedAccount.includeInTotalBalance ? 'Evet' : 'Hayır'} 
                      color={selectedAccount.includeInTotalBalance ? 'success' : 'default'}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1">Oluşturma Tarihi</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedAccount.createdAt.toLocaleDateString('tr-TR')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Kapat
          </Button>
          <Button 
            onClick={() => {
              setDetailDialogOpen(false);
              if (selectedAccount) handleEditClick(selectedAccount);
            }}
            variant="contained"
          >
            Düzenle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Hesap Düzenle</DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Hesap Adı"
                value={editAccountName}
                onChange={(e) => setEditAccountName(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              {/* Color Picker */}
              <Box sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Hesap Rengi
                  </Typography>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: selectedColor,
                      border: '2px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    '#10b981', // Green
                    '#ef4444', // Red  
                    '#fbbf24', // Yellow
                    '#6366f1', // Indigo
                    '#8b5cf6', // Purple
                    '#06b6d4', // Cyan
                    '#f59e0b', // Amber
                    '#ec4899', // Pink
                    '#84cc16', // Lime
                    '#f97316', // Orange
                    '#3b82f6', // Blue
                    '#64748b', // Slate
                  ].map((color) => (
                                         <Box
                       key={color}
                       onClick={() => setSelectedColor(color)}
                       sx={{
                         width: 40,
                         height: 40,
                         borderRadius: '50%',
                         backgroundColor: color,
                         cursor: 'pointer',
                         border: selectedColor === color ? '3px solid white' : '2px solid transparent',
                         boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : '0 2px 4px rgba(0,0,0,0.1)',
                         transition: 'all 0.2s ease',
                         position: 'relative',
                         '&:hover': {
                           transform: 'scale(1.1)',
                           boxShadow: `0 4px 12px ${color}40`,
                         },
                         ...(selectedColor === color && {
                           '&::after': {
                             content: '"✓"',
                             position: 'absolute',
                             top: '50%',
                             left: '50%',
                             transform: 'translate(-50%, -50%)',
                             color: 'white',
                             fontSize: '16px',
                             fontWeight: 'bold',
                             textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                           }
                         })
                       }}
                     />
                  ))}
                </Box>
              </Box>

              {selectedAccount.type === 'credit_card' && (
                <>
                  <TextField
                    fullWidth
                    label="Kredi Limiti"
                    type="number"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    fullWidth
                    label="Mevcut Borç"
                    type="number"
                    value={editCurrentDebt}
                    onChange={(e) => setEditCurrentDebt(e.target.value)}
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    fullWidth
                    label="Hesap Kesim Günü"
                    type="number"
                    value={editStatementDay}
                    onChange={(e) => setEditStatementDay(e.target.value)}
                    inputProps={{ min: 1, max: 31 }}
                    sx={{ mb: 3 }}
                  />
                  <TextField
                    fullWidth
                    label="Son Ödeme Günü"
                    type="number"
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    inputProps={{ min: 1, max: 31 }}
                    sx={{ mb: 3 }}
                  />
                </>
              )}

              {selectedAccount.type !== 'credit_card' && (
                <TextField
                  fullWidth
                  label="Bakiye"
                  type="number"
                  value={editAccountBalance}
                  onChange={(e) => setEditAccountBalance(e.target.value)}
                  sx={{ mb: 3 }}
                />
              )}

              <FormControlLabel
                control={
                  <Switch 
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Hesap Aktif"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch 
                    checked={editIncludeInTotal}
                    onChange={(e) => setEditIncludeInTotal(e.target.checked)}
                    color="primary"
                  />
                }
                label="Toplam Bakiyeye Dahil Et"
                sx={{ mb: 2, display: 'block' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleEditSave}
            variant="contained"
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Yeni Hesap Oluştur</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Account Name */}
            <TextField
              fullWidth
              label="Hesap Adı"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="Örn: Ana Hesap, Kredi Kartı"
            />
            
            {/* Account Type */}
            <TextField
              fullWidth
              select
              label="Hesap Türü"
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value as AccountType)}
              sx={{ mb: 3 }}
            >
                             <MenuItem value={AccountType.DEBIT_CARD}>Banka Hesabı</MenuItem>
               <MenuItem value={AccountType.CREDIT_CARD}>Kredi Kartı</MenuItem>
               <MenuItem value={AccountType.CASH}>Nakit</MenuItem>
               <MenuItem value={AccountType.SAVINGS}>Tasarruf</MenuItem>
               <MenuItem value={AccountType.INVESTMENT}>Yatırım</MenuItem>
               <MenuItem value={AccountType.GOLD}>Altın</MenuItem>
            </TextField>

            {/* Gold Account Specific Fields */}
                         {newAccountType === AccountType.GOLD && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,193,7,0.1)', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#f59e0b', fontWeight: 600 }}>
                  💰 Altın Miktarları
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Sahip olduğunuz altınları türlerine göre ayrı ayrı giriniz
                </Typography>
                
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <TextField
                    label="Gram Altın"
                    type="number"
                    value={goldQuantities.GRA}
                    onChange={(e) => setGoldQuantities(prev => ({ ...prev, GRA: e.target.value }))}
                    InputProps={{
                      endAdornment: <span style={{ color: '#666', fontSize: '14px' }}>gram</span>
                    }}
                    placeholder="0"
                  />
                  <TextField
                    label="Çeyrek Altın"
                    type="number"
                    value={goldQuantities.CEYREKALTIN}
                    onChange={(e) => setGoldQuantities(prev => ({ ...prev, CEYREKALTIN: e.target.value }))}
                    InputProps={{
                      endAdornment: <span style={{ color: '#666', fontSize: '14px' }}>adet</span>
                    }}
                    placeholder="0"
                  />
                  <TextField
                    label="Yarım Altın"
                    type="number"
                    value={goldQuantities.YARIMALTIN}
                    onChange={(e) => setGoldQuantities(prev => ({ ...prev, YARIMALTIN: e.target.value }))}
                    InputProps={{
                      endAdornment: <span style={{ color: '#666', fontSize: '14px' }}>adet</span>
                    }}
                    placeholder="0"
                  />
                  <TextField
                    label="Tam Altın"
                    type="number"
                    value={goldQuantities.TAMALTIN}
                    onChange={(e) => setGoldQuantities(prev => ({ ...prev, TAMALTIN: e.target.value }))}
                    InputProps={{
                      endAdornment: <span style={{ color: '#666', fontSize: '14px' }}>adet</span>
                    }}
                    placeholder="0"
                  />
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Altın hesabının değeri güncel altın fiyatlarına göre otomatik olarak hesaplanacaktır.
                  </Typography>
                </Alert>
              </Box>
            )}

            {/* Credit Card Specific Fields */}
                         {newAccountType === AccountType.CREDIT_CARD && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'error.main', fontWeight: 600 }}>
                  💳 Kredi Kartı Bilgileri
                </Typography>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} sx={{ mb: 2 }}>
                  <TextField
                    label="Kredi Limiti"
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="0"
                  />
                  <TextField
                    label="Mevcut Borç"
                    type="number"
                    value={currentDebt}
                    onChange={(e) => setCurrentDebt(e.target.value)}
                    placeholder="0"
                  />
                </Box>
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                  <TextField
                    label="Hesap Kesim Günü"
                    type="number"
                    value={statementDay}
                    onChange={(e) => setStatementDay(e.target.value)}
                    inputProps={{ min: 1, max: 31 }}
                  />
                  <TextField
                    label="Son Ödeme Günü"
                    type="number"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Box>
              </Box>
            )}

            {/* Balance Field for Non-Gold and Non-Credit Card Accounts */}
                         {newAccountType !== AccountType.GOLD && newAccountType !== AccountType.CREDIT_CARD && (
              <TextField
                fullWidth
                label="Başlangıç Bakiyesi"
                type="number"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value)}
                sx={{ mb: 3 }}
                placeholder="0"
              />
            )}
            
            {/* Color Picker */}
            <Box sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Hesap Rengi
                </Typography>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: newAccountColor,
                    border: '2px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  '#10b981', '#ef4444', '#fbbf24', '#6366f1',
                  '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899',
                  '#84cc16', '#f97316', '#3b82f6', '#64748b',
                ].map((color) => (
                  <Box
                    key={color}
                    onClick={() => setNewAccountColor(color)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: color,
                      cursor: 'pointer',
                      border: newAccountColor === color ? '3px solid white' : '2px solid transparent',
                      boxShadow: newAccountColor === color ? `0 0 0 2px ${color}` : '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: `0 4px 12px ${color}40`,
                      },
                      ...(newAccountColor === color && {
                        '&::after': {
                          content: '"✓"',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }
                      })
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Include in Total Balance */}
            <FormControlLabel
              control={
                <Switch 
                  checked={includeInTotal}
                  onChange={(e) => setIncludeInTotal(e.target.checked)}
                  color="primary"
                />
              }
              label="Toplam Bakiyeye Dahil Et"
              sx={{ mb: 2, display: 'block' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleCreateAccount}
            variant="contained"
            color="primary"
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Hesabı Sil</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu işlem geri alınamaz!
          </Alert>
          <Typography>
            "{selectedAccount?.name}" hesabını silmek istediğinizden emin misiniz?
            Bu hesaba ait tüm işlemler de silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsPage; 