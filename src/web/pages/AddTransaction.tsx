import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  InputAdornment,
  Grid,
  useTheme,
  alpha,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Remove,
  TrendingUp,
  TrendingDown,
  Close,
  Save,
  CalendarToday,
  AccountBalance,
  CreditCard,
  Wallet,
  Diamond,
  Category as CategoryIcon,
  AttachMoney,
  Notes,
  Check,
  ExpandMore,
  ExpandLess,
  Schedule,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import { AccountService } from '../../services/AccountService';
import { TransactionService } from '../../services/TransactionService';
import { CategoryService } from '../../services/CategoryService';
import { Account, AccountType } from '../../models/Account';
import { Transaction, TransactionType } from '../../models/Transaction';
import { Category, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';
import { formatCurrency } from '../../utils/formatters';
import { animations, gradients } from '../styles/theme';
import { getCategoryIcon } from '../utils/categoryIcons';

interface AddTransactionProps {
  onClose: () => void;
  defaultType?: 'income' | 'expense';
  onSuccess?: () => void;
}

const quickAmounts = [
  { value: 50, label: '50₺' },
  { value: 100, label: '100₺' },
  { value: 250, label: '250₺' },
  { value: 500, label: '500₺' },
  { value: 1000, label: '1.000₺' },
  { value: 2500, label: '2.500₺' },
];

const AddTransaction: React.FC<AddTransactionProps> = ({ onClose, defaultType, onSuccess }) => {
  const { currentUser } = useAuth();
  const { setLoading: setGlobalLoading } = useLoading();
  const theme = useTheme();
  
  // States
  const [selectedType, setSelectedType] = useState<TransactionType>(
    defaultType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE
  );
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>(
    new Date().toTimeString().slice(0, 5) // "HH:MM" format
  );
  const [showTimeDropdowns, setShowTimeDropdowns] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // UI states
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Helper to format date correctly for the input
  const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset*60*1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const [accountsData, categoriesData] = await Promise.all([
        AccountService.getUserAccounts(currentUser.uid),
        CategoryService.getUserCategories(currentUser.uid)
      ]);
      
      const filteredAccounts = accountsData.filter(acc => acc.isActive && acc.type !== AccountType.GOLD);
      
      // Son 30 günün işlemlerini al ve hesap kullanım sayısını hesapla
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      try {
        const allTransactions = await TransactionService.getUserTransactions(currentUser.uid);
        
        // Son 30 günün işlemlerini filtrele
        const recentTransactions = allTransactions.filter(transaction => 
          transaction.date >= thirtyDaysAgo
        );
        
        // Her hesap için işlem sayısını hesapla
        const accountUsageCount = filteredAccounts.map(account => {
          const transactionCount = recentTransactions.filter(
            (transaction: Transaction) => transaction.accountId === account.id
          ).length;
          
          return {
            ...account,
            transactionCount
          };
        });
        
        // İşlem sayısına göre sırala (en çok kullanılan üstte)
        const sortedAccounts = accountUsageCount.sort((a, b) => {
          // Önce transaction count'a göre sırala
          if (b.transactionCount !== a.transactionCount) {
            return b.transactionCount - a.transactionCount;
          }
          // Eşitse alfabetik sırala
          return a.name.localeCompare(b.name);
        });
        
        setAccounts(sortedAccounts);
        
        // En çok kullanılan hesabı otomatik seç
        if (sortedAccounts.length > 0) {
          setSelectedAccount(sortedAccounts[0].id);
        }
      } catch (transactionError) {
        // İşlem verileri alınamazsa sadece alfabetik sırala
        console.warn('Could not load transaction data for sorting:', transactionError);
        const sortedAccounts = filteredAccounts.sort((a, b) => a.name.localeCompare(b.name));
        setAccounts(sortedAccounts);
        
        if (sortedAccounts.length > 0) {
          setSelectedAccount(sortedAccounts[0].id);
        }
      }
      
      // Combine default categories with user custom categories
      const defaultExpenseCategories: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default_expense_${index}`,
        userId: currentUser.uid,
      }));

      const defaultIncomeCategories: Category[] = DEFAULT_INCOME_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default_income_${index}`,
        userId: currentUser.uid,
      }));

      const allCategories = [...defaultExpenseCategories, ...defaultIncomeCategories, ...categoriesData];
      setCategories(allCategories);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Veri yüklenirken hata oluştu', 'error');
    }
  }, [currentUser]);

  useEffect(() => {
    // Always start with current date/time when component mounts
    const now = new Date();
    setSelectedDate(now);
    setSelectedTime(now.toTimeString().slice(0, 5));
    
    loadData();
  }, [loadData]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAmountChange = (value: string) => {
    // Sadece sayı ve virgül kabul et
    let filtered = value.replace(/[^0-9,]/g, '');
    
    // Çoklu virgülü engelle
    const commaCount = (filtered.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = filtered.indexOf(',');
      filtered = filtered.substring(0, firstCommaIndex + 1) + filtered.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    // Virgülden sonra max 2 basamak
    if (filtered.includes(',')) {
      const parts = filtered.split(',');
      if (parts[1] && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
      }
      filtered = parts[0] + ',' + (parts[1] || '');
    }
    
    setAmount(filtered);
  };

  const getNumericAmount = (): number => {
    if (!amount || amount.trim() === '') return 0;
    const numericValue = parseFloat(amount.replace(',', '.'));
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const formatDateTimeForInput = (date: Date): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getCombinedDateTime = (): Date => {
    const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = selectedTime; // HH:MM
    const combinedDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return combinedDateTime;
  };

  const getFilteredCategories = () => {
    return categories.filter(cat => cat.type === selectedType);
  };

  const getFrequentCategories = () => {
    const filtered = getFilteredCategories();
    return filtered.slice(0, 6); // İlk 6 kategori
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD:
        return <CreditCard />;
      case AccountType.CASH:
        return <Wallet />;
      case AccountType.SAVINGS:
        return <AccountBalance />;
      case AccountType.INVESTMENT:
        return <TrendingUp />;
      case AccountType.GOLD:
        return <Diamond />;
      default:
        return <AccountBalance />;
    }
  };

  const getAccountTypeName = (type: AccountType): string => {
    switch (type) {
      case AccountType.CASH:
        return 'Nakit';
      case AccountType.DEBIT_CARD:
        return 'Banka Kartı';
      case AccountType.CREDIT_CARD:
        return 'Kredi Kartı';
      case AccountType.SAVINGS:
        return 'Tasarruf Hesabı';
      case AccountType.INVESTMENT:
        return 'Yatırım Hesabı';
      default:
        return 'Hesap';
    }
  };

  const handleSave = async () => {
    if (!currentUser || !selectedAccount) {
      showSnackbar('Sistem hatası', 'error');
      return;
    }

    if (getNumericAmount() <= 0) {
      showSnackbar('Lütfen geçerli bir tutar girin', 'error');
      return;
    }

    if (!selectedCategory) {
      showSnackbar('Lütfen kategori seçin', 'error');
      return;
    }

    setLoading(true);
    setGlobalLoading(true, 'İşlem kaydediliyor...');

    try {
      const categoryDetails = categories.find(cat => cat.name === selectedCategory);
      
      const transactionData = {
        userId: currentUser.uid,
        accountId: selectedAccount,
        type: selectedType,
        amount: getNumericAmount(),
        category: selectedCategory,
        categoryIcon: categoryDetails?.icon || 'category',
        description: description.trim(),
        date: getCombinedDateTime(),
      };

      await TransactionService.createTransaction(transactionData);
      
      showSnackbar('İşlem başarıyla kaydedildi', 'success');
      
      // Call onSuccess callback to refresh parent data
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form for quick next entry
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      // Always use current date/time for reset
      const now = new Date();
      setSelectedDate(now);
      setSelectedTime(now.toTimeString().slice(0, 5));
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      showSnackbar('İşlem kaydedilemedi', 'error');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const isFormValid = () => {
    return getNumericAmount() > 0 && selectedCategory && selectedAccount;
  };

  return (
    <Box sx={{ 
      maxWidth: 1000, 
      mx: 'auto', 
      p: 3,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)}, ${alpha(theme.palette.secondary.main, 0.03)})`,
      borderRadius: 4,
      minHeight: '90vh'
    }}>
      {/* Header */}
      <motion.div {...animations.fadeIn}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Hızlı İşlem Ekle
          </Typography>
          <IconButton onClick={onClose} size="large" sx={{ bgcolor: 'background.paper' }}>
            <Close />
          </IconButton>
        </Box>
      </motion.div>

             <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
         {/* Sol Taraf - Ana İşlem Formu */}
         <Box sx={{ flex: { xs: 1, md: 2 } }}>
          <Stack spacing={3}>
            {/* Tip ve Tutar */}
            <motion.div {...animations.slideIn}>
              <Card sx={{ 
                background: alpha(theme.palette.background.paper, 0.8), 
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Type Selection */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                      fullWidth
                      variant={selectedType === TransactionType.EXPENSE ? 'contained' : 'outlined'}
                      onClick={() => {
                        setSelectedType(TransactionType.EXPENSE);
                        setSelectedCategory(''); // Reset category
                      }}
                      size="large"
                      startIcon={<Remove />}
                      sx={{
                        py: 2,
                        ...(selectedType === TransactionType.EXPENSE && {
                          background: gradients.error,
                          '&:hover': { background: gradients.error }
                        })
                      }}
                    >
                      Gider
                    </Button>
                    <Button
                      fullWidth
                      variant={selectedType === TransactionType.INCOME ? 'contained' : 'outlined'}
                      onClick={() => {
                        setSelectedType(TransactionType.INCOME);
                        setSelectedCategory(''); // Reset category
                      }}
                      size="large"
                      startIcon={<Add />}
                      sx={{
                        py: 2,
                        ...(selectedType === TransactionType.INCOME && {
                          background: gradients.success,
                          '&:hover': { background: gradients.success }
                        })
                      }}
                    >
                      Gelir
                    </Button>
                  </Box>

                  {/* Amount Input */}
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0,00"
                      variant="outlined"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                        sx: { 
                          fontSize: '2rem',
                          '& input': { 
                            fontSize: '2rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: selectedType === TransactionType.INCOME ? 'success.main' : 'error.main'
                          }
                        }
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.background.default, 0.5)
                        }
                      }}
                    />
                  </Box>

                  {/* Quick Amount Chips */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {quickAmounts.map((quickAmount) => (
                      <Chip
                        key={quickAmount.value}
                        label={quickAmount.label}
                        onClick={() => setAmount(quickAmount.value.toString())}
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.9rem',
                          '&:hover': { 
                            backgroundColor: selectedType === TransactionType.INCOME ? 'success.main' : 'error.main',
                            color: 'white',
                            transform: 'translateY(-2px)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>

            {/* Kategori Seçimi */}
            <motion.div {...animations.slideIn} style={{ transitionDelay: '0.1s' }}>
              <Card sx={{ 
                background: alpha(theme.palette.background.paper, 0.8), 
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <CategoryIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Kategori
                    </Typography>
                    {selectedCategory && (
                      <Chip
                        label={selectedCategory}
                        color="primary"
                        size="small"
                        onDelete={() => setSelectedCategory('')}
                      />
                    )}
                  </Box>
                  
                  {/* Frequent Categories */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                    gap: 2,
                    mb: 2
                  }}>
                    {getFrequentCategories().map((category) => (
                      <motion.div
                        key={category.name}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Paper
                          onClick={() => setSelectedCategory(category.name)}
                          elevation={selectedCategory === category.name ? 8 : 2}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            textAlign: 'center',
                            borderRadius: 3,
                            border: selectedCategory === category.name ? 2 : 1,
                            borderColor: selectedCategory === category.name ? 'primary.main' : 'transparent',
                            background: selectedCategory === category.name ? 
                              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.05)})` : 
                              'background.paper',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.action.hover, 0.1),
                              transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: category.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              mx: 'auto',
                              mb: 1
                            }}
                          >
                            {getCategoryIcon(category.name)}
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                            {category.name}
                          </Typography>
                        </Paper>
                      </motion.div>
                    ))}
                  </Box>

                  {/* Show More Categories Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    endIcon={showAllCategories ? <ExpandLess /> : <ExpandMore />}
                    sx={{ mt: 1 }}
                  >
                    {showAllCategories ? 'Daha Az Göster' : 'Tüm Kategoriler'}
                  </Button>

                  {/* All Categories */}
                  {showAllCategories && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                        gap: 2,
                        mt: 2,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider'
                      }}>
                        {getFilteredCategories().slice(6).map((category) => (
                          <motion.div
                            key={category.name}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Paper
                              onClick={() => setSelectedCategory(category.name)}
                              elevation={selectedCategory === category.name ? 8 : 2}
                              sx={{
                                p: 2,
                                cursor: 'pointer',
                                textAlign: 'center',
                                borderRadius: 3,
                                border: selectedCategory === category.name ? 2 : 1,
                                borderColor: selectedCategory === category.name ? 'primary.main' : 'transparent',
                                background: selectedCategory === category.name ? 
                                  `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.primary.main, 0.05)})` : 
                                  'background.paper',
                                '&:hover': {
                                  backgroundColor: alpha(theme.palette.action.hover, 0.1),
                                  transform: 'translateY(-2px)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  backgroundColor: category.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  mx: 'auto',
                                  mb: 1
                                }}
                              >
                                {getCategoryIcon(category.name)}
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                {category.name}
                              </Typography>
                            </Paper>
                          </motion.div>
                        ))}
                      </Box>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
                     </Stack>
         </Box>

         {/* Sağ Taraf - Detaylar ve Kaydet */}
         <Box sx={{ flex: { xs: 1, md: 1 } }}>
           <Stack spacing={3}>
            {/* Detaylar */}
            <motion.div {...animations.slideIn} style={{ transitionDelay: '0.2s' }}>
              <Card sx={{ 
                background: alpha(theme.palette.background.paper, 0.8), 
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Notes color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Detaylar
                    </Typography>
                  </Box>
                  
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Tarih"
                      type="date"
                      value={formatDateForInput(selectedDate)}
                      onChange={(e) => {
                        // Create date object from YYYY-MM-DD string in a way that avoids timezone shifts
                        const dateString = e.target.value;
                        const [year, month, day] = dateString.split('-').map(Number);
                        // Using UTC to prevent the browser from shifting the date based on its timezone
                        const newDate = new Date(Date.UTC(year, month - 1, day));
                        setSelectedDate(newDate);
                      }}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2
                        }
                      }}
                    />

                    {!showTimeDropdowns ? (
                      <Box>
                        <TextField
                          fullWidth
                          label="Saat"
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Schedule />
                              </InputAdornment>
                            ),
                            inputProps: {
                              step: 300, // 5 dakika aralıkları
                              pattern: "[0-9]{2}:[0-9]{2}",
                              placeholder: "HH:MM"
                            }
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 2
                            },
                            '& input[type="time"]': {
                              fontSize: '1rem',
                              fontFamily: 'monospace'
                            }
                          }}
                        />
                        <Button
                          size="small"
                          onClick={() => setShowTimeDropdowns(true)}
                          sx={{ mt: 1, fontSize: '0.75rem' }}
                        >
                          Saat seçici çalışmıyor mu? Buraya tıklayın
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                          Saat Seçin
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel size="small">Saat</InputLabel>
                            <Select
                              size="small"
                              value={selectedTime.split(':')[0]}
                              label="Saat"
                              onChange={(e) => {
                                const hour = e.target.value;
                                const minute = selectedTime.split(':')[1] || '00';
                                setSelectedTime(`${hour}:${minute}`);
                              }}
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <MenuItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography>:</Typography>
                          <FormControl sx={{ minWidth: 80 }}>
                            <InputLabel size="small">Dakika</InputLabel>
                            <Select
                              size="small"
                              value={selectedTime.split(':')[1] || '00'}
                              label="Dakika"
                              onChange={(e) => {
                                const hour = selectedTime.split(':')[0] || '00';
                                const minute = e.target.value;
                                setSelectedTime(`${hour}:${minute}`);
                              }}
                            >
                              {Array.from({ length: 12 }, (_, i) => (
                                <MenuItem key={i} value={(i * 5).toString().padStart(2, '0')}>
                                  {(i * 5).toString().padStart(2, '0')}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => setShowTimeDropdowns(false)}
                          sx={{ mt: 1, fontSize: '0.75rem' }}
                        >
                          Normal saat seçiciye dön
                        </Button>
                      </Box>
                    )}
                    
                    <FormControl fullWidth>
                      <InputLabel>Hesap</InputLabel>
                      <Select
                        value={selectedAccount}
                        label="Hesap"
                        onChange={(e) => setSelectedAccount(e.target.value as string)}
                        sx={{ borderRadius: 2 }}
                      >
                        {accounts.map((account) => (
                          <MenuItem key={account.id} value={account.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: account.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white'
                                }}
                              >
                                {getAccountIcon(account.type)}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {account.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {getAccountTypeName(account.type)}
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="Açıklama (opsiyonel)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      multiline
                      rows={2}
                      placeholder="İşlem hakkında not..."
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2
                        }
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>

            {/* Özet ve Kaydet */}
            <motion.div {...animations.slideIn} style={{ transitionDelay: '0.3s' }}>
              <Card sx={{ 
                background: alpha(theme.palette.background.paper, 0.8), 
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                <CardContent sx={{ p: 3 }}>
                  {/* Özet */}
                  {getNumericAmount() > 0 && (
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 700,
                          color: selectedType === TransactionType.INCOME ? 'success.main' : 'error.main',
                          mb: 1
                        }}
                      >
                        {selectedType === TransactionType.INCOME ? '+' : '-'}{formatCurrency(getNumericAmount())}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {selectedType === TransactionType.INCOME ? 'Gelir' : 'Gider'}
                        {selectedCategory && ` • ${selectedCategory}`}
                      </Typography>
                    </Box>
                  )}

                  {/* Save Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={loading || !isFormValid()}
                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                    sx={{ 
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: selectedType === TransactionType.INCOME ? gradients.success : gradients.error,
                      '&:hover': {
                        background: selectedType === TransactionType.INCOME ? gradients.success : gradients.error,
                        transform: 'translateY(-2px)'
                      },
                      '&:disabled': {
                        opacity: 0.6
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {loading ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
                  </Button>

                  {!isFormValid() && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                      {getNumericAmount() <= 0 && 'Tutar giriniz • '}
                      {!selectedCategory && 'Kategori seçiniz • '}
                      {!selectedAccount && 'Hesap seçiniz'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
                     </Stack>
         </Box>
       </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTransaction; 