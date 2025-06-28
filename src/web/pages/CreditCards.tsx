import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  CreditCard,
  Payment,
  AccountBalance,
  Warning,
  CheckCircle,
  Receipt,
  Close,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface CreditCardData {
  id: string;
  name: string;
  currentDebt: number;
  limit: number;
  dueDay: number;
  statementDay: number;
  interestRate: number;
  color: string;
  type: string;
  balance: number;
  isActive: boolean;
}

interface PaymentAccount {
  id: string;
  name: string;
  balance: number;
  color: string;
  type: string;
}

const CreditCards: React.FC = () => {
  const { currentUser } = useAuth();
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardData | null>(null);
  
  // Payment form states
  const [paymentType, setPaymentType] = useState<'minimum' | 'full' | 'custom'>('minimum');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      try {
        const { db } = await import('../../config/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');

        // Load credit cards
        const accountsRef = collection(db, 'accounts');
        const creditCardsQuery = query(
          accountsRef, 
          where('userId', '==', currentUser.uid),
          where('type', '==', 'credit_card'),
          where('isActive', '==', true)
        );
        
        const creditCardsSnapshot = await getDocs(creditCardsQuery);
        const cards: CreditCardData[] = [];
        
        creditCardsSnapshot.forEach((doc) => {
          const data = doc.data();
          cards.push({
            id: doc.id,
            name: data.name || 'Kredi Kartı',
            currentDebt: data.currentDebt || 0,
            limit: data.limit || 0,
            dueDay: data.dueDay || 15,
            statementDay: data.statementDay || 10,
            interestRate: data.interestRate || 4.25,
            color: data.color || '#f44336',
            type: data.type,
            balance: data.balance || 0,
            isActive: data.isActive || true,
          });
        });

        setCreditCards(cards);

        // Load payment accounts (all non-credit card accounts with balance > 0)
        const paymentAccountsQuery = query(
          accountsRef,
          where('userId', '==', currentUser.uid),
          where('isActive', '==', true)
        );
        
        const paymentAccountsSnapshot = await getDocs(paymentAccountsQuery);
        const accounts: PaymentAccount[] = [];
        
        paymentAccountsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type !== 'credit_card' && data.balance > 0) {
            accounts.push({
              id: doc.id,
              name: data.name || 'Hesap',
              balance: data.balance || 0,
              color: data.color || '#2196f3',
              type: data.type,
            });
          }
        });

        setPaymentAccounts(accounts);
      } catch (error) {
        console.error('Error loading credit cards:', error);
        setAlert({ type: 'error', message: 'Veriler yüklenirken hata oluştu' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Alert auto dismiss
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Credit card calculations - mobil uygulamadaki utils/creditCard.ts mantığı
  const calculateMinPayment = (debt: number) => debt * 0.20; // 20% minimum
  const calculateMonthlyInterest = (debt: number, rate: number) => (debt * rate) / 100;
  const calculateAvailableLimit = (limit: number, debt: number) => Math.max(limit - debt, 0);

  const calculateDueDate = (dueDay: number) => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    return nextMonth.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getPaymentAmount = () => {
    if (!selectedCard) return 0;
    
    switch (paymentType) {
      case 'minimum':
        return calculateMinPayment(selectedCard.currentDebt);
      case 'full':
        return selectedCard.currentDebt;
      case 'custom':
        return parseFloat(customAmount.replace(',', '.')) || 0;
      default:
        return 0;
    }
  };

  // Mobil uygulamadaki AccountViewModel.addCreditCardPayment mantığı
  const handlePayment = async () => {
    if (!selectedCard || !selectedAccountId) {
      setAlert({ type: 'error', message: 'Lütfen tüm alanları doldurun' });
      return;
    }

    const paymentAmount = getPaymentAmount();
    const selectedAccount = paymentAccounts.find(acc => acc.id === selectedAccountId);

    if (!selectedAccount) {
      setAlert({ type: 'error', message: 'Geçersiz ödeme hesabı' });
      return;
    }

    if (paymentAmount <= 0) {
      setAlert({ type: 'error', message: 'Geçerli bir ödeme tutarı girin' });
      return;
    }

    if (paymentAmount > selectedCard.currentDebt) {
      setAlert({ type: 'error', message: 'Ödeme tutarı mevcut borçtan fazla olamaz' });
      return;
    }

    if (paymentAmount > selectedAccount.balance) {
      setAlert({ type: 'error', message: 'Ödeme hesabında yetersiz bakiye' });
      return;
    }

    // Minimum payment warning - mobil uygulamadaki mantık
    const minPayment = calculateMinPayment(selectedCard.currentDebt);
    if (paymentType === 'custom' && paymentAmount < minPayment && paymentAmount < selectedCard.currentDebt) {
      if (!window.confirm(`Asgari ödeme tutarı ${minPayment.toFixed(2)} ₺. Bu tutardan az ödeme yapmak faiz uygulanmasına neden olabilir. Devam etmek istiyor musunuz?`)) {
        return;
      }
    }

    setPaymentLoading(true);

    try {
      const { db } = await import('../../config/firebase');
      const { doc, updateDoc, addDoc, collection, Timestamp } = await import('firebase/firestore');

      // Update payment account balance - ödeme hesabından para çıkar
      await updateDoc(doc(db, 'accounts', selectedAccountId), {
        balance: selectedAccount.balance - paymentAmount,
        updatedAt: Timestamp.now()
      });

      // Update credit card debt - kredi kartı borcunu azalt
      const newDebt = Math.max(selectedCard.currentDebt - paymentAmount, 0);
      await updateDoc(doc(db, 'accounts', selectedCard.id), {
        currentDebt: newDebt,
        updatedAt: Timestamp.now()
      });

      // Add transaction record - işlem kaydı ekle
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser!.uid,
        accountId: selectedAccountId,
        amount: paymentAmount,
        type: 'expense',
        description: `Kredi kartı ödeme (${selectedCard.name})`,
        category: 'Kredi Kartı Ödeme',
        categoryIcon: 'card',
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
      });

      // Update local state
      setCreditCards(prev => prev.map(card => 
        card.id === selectedCard.id 
          ? { ...card, currentDebt: newDebt }
          : card
      ));

      setPaymentAccounts(prev => prev.map(acc =>
        acc.id === selectedAccountId
          ? { ...acc, balance: acc.balance - paymentAmount }
          : acc
      ));

      setAlert({ type: 'success', message: 'Kredi kartı ödemesi başarıyla yapıldı' });
      setPaymentDialogOpen(false);
      setSelectedCard(null);
      setPaymentType('minimum');
      setCustomAmount('');
      setSelectedAccountId('');

    } catch (error) {
      console.error('Payment error:', error);
      setAlert({ type: 'error', message: 'Ödeme yapılırken hata oluştu' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const openPaymentDialog = (card: CreditCardData) => {
    setSelectedCard(card);
    setPaymentDialogOpen(true);
    setPaymentType('minimum');
    setCustomAmount('');
    setSelectedAccountId(paymentAccounts.length > 0 ? paymentAccounts[0].id : '');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 2 }}>
          💳 Kredi Kartları
        </Typography>
        <Typography variant="h6" sx={{ color: '#bbb' }}>
          Kredi kartı borçlarınızı yönetin ve ödemelerinizi yapın
        </Typography>
      </Box>

      {/* Alert */}
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert(null)}
            sx={{ mb: 3 }}
          >
            {alert.message}
          </Alert>
        </motion.div>
      )}

      {/* Credit Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
        {creditCards.length === 0 ? (
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            py: 8,
            gridColumn: '1 / -1'
          }}>
            <CardContent>
              <CreditCard sx={{ fontSize: 64, color: '#666', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                Henüz kredi kartınız yok
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                Kredi kartı hesabı oluşturmak için hesaplar sayfasını ziyaret edin
              </Typography>
            </CardContent>
          </Card>
        ) : (
          creditCards.map((card) => {
            const minPayment = calculateMinPayment(card.currentDebt);
            const monthlyInterest = calculateMonthlyInterest(card.currentDebt, card.interestRate);
            const availableLimit = calculateAvailableLimit(card.limit, card.currentDebt);
            const utilizationRate = card.limit > 0 ? (card.currentDebt / card.limit) * 100 : 0;
            
            return (
              <Box key={card.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card sx={{
                    background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 32px ${card.color}40`,
                      borderColor: card.color,
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      {/* Card Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar sx={{ 
                          bgcolor: card.color, 
                          width: 56, 
                          height: 56, 
                          mr: 2 
                        }}>
                          <CreditCard />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                            {card.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>
                            Kredi Kartı
                          </Typography>
                        </Box>
                      </Box>

                      {/* Debt Status */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#bbb' }}>
                            Mevcut Borç
                          </Typography>
                          {card.currentDebt === 0 ? (
                            <Chip 
                              icon={<CheckCircle />} 
                              label="Borç Yok" 
                              color="success" 
                              size="small" 
                            />
                          ) : (
                            <Chip 
                              icon={<Warning />} 
                              label="Ödeme Gerekli" 
                              color="error" 
                              size="small" 
                            />
                          )}
                        </Box>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: card.currentDebt > 0 ? '#f44336' : '#4caf50',
                            fontWeight: 700,
                            mb: 2 
                          }}
                        >
                          ₺{card.currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </Typography>

                        {/* Credit Limit Progress */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: '#bbb' }}>
                              Limit Kullanımı
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#bbb' }}>
                              {utilizationRate.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(utilizationRate, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: utilizationRate > 80 ? '#f44336' : 
                                                utilizationRate > 50 ? '#ff9800' : '#4caf50',
                                borderRadius: 4,
                              },
                            }}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#bbb' }}>
                              Kullanılabilir: ₺{availableLimit.toLocaleString('tr-TR')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#bbb' }}>
                              Limit: ₺{card.limit.toLocaleString('tr-TR')}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Payment Details */}
                      {card.currentDebt > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            <Box sx={{ 
                              p: 2, 
                              bgcolor: 'rgba(255, 255, 255, 0.05)', 
                              borderRadius: 2 
                            }}>
                              <Typography variant="caption" sx={{ color: '#bbb' }}>
                                Asgari Ödeme
                              </Typography>
                              <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600 }}>
                                ₺{minPayment.toFixed(2)}
                              </Typography>
                            </Box>
                            <Box sx={{ 
                              p: 2, 
                              bgcolor: 'rgba(255, 255, 255, 0.05)', 
                              borderRadius: 2 
                            }}>
                              <Typography variant="caption" sx={{ color: '#bbb' }}>
                                Aylık Faiz
                              </Typography>
                              <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 600 }}>
                                ₺{monthlyInterest.toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {/* Due Date */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Schedule sx={{ color: '#bbb', fontSize: 20, mr: 1 }} />
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          Son ödeme: {calculateDueDate(card.dueDay)}
                        </Typography>
                      </Box>

                      {/* Action Button */}
                      {card.currentDebt > 0 ? (
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<Payment />}
                          onClick={() => openPaymentDialog(card)}
                          sx={{
                            bgcolor: card.color,
                            '&:hover': { bgcolor: card.color + 'dd' },
                            py: 1.5,
                            fontWeight: 600,
                          }}
                        >
                          Ödeme Yap
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<CheckCircle />}
                          disabled
                          sx={{
                            borderColor: '#4caf50',
                            color: '#4caf50',
                            py: 1.5,
                            fontWeight: 600,
                          }}
                        >
                          Borç Bulunmuyor
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Box>
            );
          })
        )}
      </Box>

      {/* Payment Dialog - Mobil uygulamadaki CreditCardPaymentScreen mantığı */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Payment sx={{ mr: 1, color: selectedCard?.color }} />
            Kredi Kartı Ödemesi
          </Box>
          <IconButton onClick={() => setPaymentDialogOpen(false)} sx={{ color: '#bbb' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {selectedCard && (
            <Stack spacing={3}>
              {/* Card Info */}
              <Card sx={{ 
                background: `linear-gradient(135deg, ${selectedCard.color}20, ${selectedCard.color}10)`,
                border: `1px solid ${selectedCard.color}40`,
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: selectedCard.color, mr: 2 }}>
                      <CreditCard />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ color: '#fff' }}>
                        {selectedCard.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#bbb' }}>
                        Mevcut Borç: ₺{selectedCard.currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#bbb' }}>Asgari Ödeme</Typography>
                      <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                        ₺{calculateMinPayment(selectedCard.currentDebt).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#bbb' }}>Aylık Faiz</Typography>
                      <Typography variant="body1" sx={{ color: '#f44336', fontWeight: 600 }}>
                        ₺{calculateMonthlyInterest(selectedCard.currentDebt, selectedCard.interestRate).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#bbb' }}>Son Ödeme</Typography>
                      <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600 }}>
                        {calculateDueDate(selectedCard.dueDay).split(' ').slice(0, 2).join(' ')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Payment Type Selection - Mobil uygulamadaki PaymentTypeSelector mantığı */}
              <FormControl component="fieldset">
                <FormLabel sx={{ color: '#fff', mb: 2 }}>Ödeme Türü</FormLabel>
                <RadioGroup
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                >
                  <FormControlLabel
                    value="minimum"
                    control={<Radio sx={{ color: '#fff' }} />}
                    label={
                      <Box>
                        <Typography sx={{ color: '#fff' }}>Asgari Ödeme</Typography>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          ₺{calculateMinPayment(selectedCard.currentDebt).toFixed(2)} (Yasal minimum %20)
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    value="full"
                    control={<Radio sx={{ color: '#fff' }} />}
                    label={
                      <Box>
                        <Typography sx={{ color: '#fff' }}>Tam Ödeme</Typography>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          ₺{selectedCard.currentDebt.toFixed(2)} (Tüm borcu kapatır, faiz ödemezsiniz)
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1 }}
                  />
                  <FormControlLabel
                    value="custom"
                    control={<Radio sx={{ color: '#fff' }} />}
                    label={
                      <Box>
                        <Typography sx={{ color: '#fff' }}>İstediğim Kadar</Typography>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          Özel tutar belirleyin
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {/* Custom Amount Input */}
              {paymentType === 'custom' && (
                <TextField
                  fullWidth
                  label="Ödeme Tutarı (₺)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  type="number"
                  inputProps={{ step: "0.01" }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: selectedCard.color },
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                  }}
                />
              )}

              {/* Payment Account Selection - Mobil uygulamadaki PaymentAccountSelector mantığı */}
              <FormControl fullWidth>
                <InputLabel id="payment-account-label" sx={{ color: '#bbb' }}>Ödeme Hesabı</InputLabel>
                <Select
                  labelId="payment-account-label"
                  label="Ödeme Hesabı"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: selectedCard.color },
                    '& .MuiInputLabel-root': { 
                      color: '#bbb',
                      '&.Mui-focused': { color: selectedCard?.color || '#2196f3' }
                    }
                  }}
                >
                  {paymentAccounts.map((account) => {
                    const paymentAmount = getPaymentAmount();
                    const hasEnoughBalance = account.balance >= paymentAmount;
                    
                    return (
                      <MenuItem 
                        key={account.id} 
                        value={account.id}
                        disabled={!hasEnoughBalance && paymentAmount > 0}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Avatar sx={{ bgcolor: account.color, width: 32, height: 32, mr: 2 }}>
                            <AccountBalance />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ color: hasEnoughBalance ? '#fff' : '#666' }}>
                              {account.name}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: hasEnoughBalance ? '#4caf50' : '#f44336' 
                            }}>
                              Bakiye: ₺{account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Payment Summary - Mobil uygulamadaki PaymentSummaryCard mantığı */}
              {selectedAccountId && getPaymentAmount() > 0 && (
                <Card sx={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
                      <Receipt sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Ödeme Özeti
                    </Typography>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#bbb' }}>Ödeme Tutarı:</Typography>
                        <Typography sx={{ color: '#fff', fontWeight: 600 }}>
                          ₺{getPaymentAmount().toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#bbb' }}>Kalan Borç:</Typography>
                        <Typography sx={{ 
                          color: selectedCard.currentDebt - getPaymentAmount() === 0 ? '#4caf50' : '#f44336',
                          fontWeight: 600 
                        }}>
                          ₺{Math.max(selectedCard.currentDebt - getPaymentAmount(), 0).toFixed(2)}
                        </Typography>
                      </Box>
                      {selectedCard.currentDebt - getPaymentAmount() === 0 && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          bgcolor: 'rgba(76, 175, 80, 0.2)',
                          p: 1,
                          borderRadius: 1 
                        }}>
                          <CheckCircle sx={{ color: '#4caf50', mr: 1 }} />
                          <Typography sx={{ color: '#4caf50' }}>
                            Tüm borç kapatılacak
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
          <Button
            onClick={() => setPaymentDialogOpen(false)}
            variant="outlined"
            sx={{ borderColor: '#666', color: '#bbb', minWidth: 120 }}
          >
            İptal
          </Button>
          <Button
            onClick={handlePayment}
            variant="contained"
            disabled={paymentLoading || !selectedAccountId || getPaymentAmount() <= 0}
            startIcon={paymentLoading ? <CircularProgress size={16} /> : <Payment />}
            sx={{ 
              bgcolor: selectedCard?.color || '#2196f3',
              minWidth: 140,
              '&:hover': { 
                bgcolor: selectedCard?.color ? selectedCard.color + 'dd' : '#1976d2'
              }
            }}
          >
            {paymentLoading ? 'İşleniyor...' : `Ödeme Yap (₺${getPaymentAmount().toFixed(2)})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreditCards; 