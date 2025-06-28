import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  MenuItem,
  } from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Add,
  Diamond,
  TrendingUp,
  TrendingDown,
  Schedule,
  Assessment,
  AttachMoney,
  Sell,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Account, GoldType, GoldHolding, GoldHoldings, AccountType } from '../../models/Account';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { AccountService } from '../../services/AccountService';
import GoldPriceService, { AllGoldPricesData } from '../../services/GoldPriceService';

interface GoldAccountDetailProps {
  account: Account;
  onBack: () => void;
  onAccountUpdate: (account: Account) => void;
}

interface GoldBreakdown {
  type: GoldType;
  typeName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  initialValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

interface GoldAccountDetails {
  accountId: string;
  accountName: string;
  goldHoldings: GoldHoldings;
  currentGoldPrices: { [key in GoldType]: number };
  initialGoldPrices: { [key in GoldType]: number };
  createdDate: Date;
  currentValue: number;
  initialValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  daysSinceCreation: number;
  breakdown: GoldBreakdown[];
}

const GOLD_TYPES = [
  {
    type: GoldType.GRAM,
    label: 'Gram Altın',
    unit: 'gram',
    icon: 'diamond-outline',
    description: 'Gram cinsinden altın'
  },
  {
    type: GoldType.QUARTER,
    label: 'Çeyrek Altın',
    unit: 'adet',
    icon: 'diamond',
    description: 'Çeyrek altın (adet)'
  },
  {
    type: GoldType.HALF,
    label: 'Yarım Altın',
    unit: 'adet',
    icon: 'diamond',
    description: 'Yarım altın (adet)'
  },
  {
    type: GoldType.FULL,
    label: 'Tam Altın',
    unit: 'adet',
    icon: 'diamond',
    description: 'Tam altın (adet)'
  }
];

// Gold price service instance
const goldPriceService = GoldPriceService.getInstance();

const GoldAccountDetail: React.FC<GoldAccountDetailProps> = ({ 
  account, 
  onBack, 
  onAccountUpdate 
}) => {
  const { currentUser } = useAuth();
  const [goldDetails, setGoldDetails] = useState<GoldAccountDetails | null>(null);
  const [currentGoldPrices, setCurrentGoldPrices] = useState<AllGoldPricesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addGoldModalVisible, setAddGoldModalVisible] = useState(false);
  const [selectedGoldType, setSelectedGoldType] = useState<GoldType>(GoldType.GRAM);
  const [goldQuantity, setGoldQuantity] = useState('');
  const [addingGold, setAddingGold] = useState(false);
  const [priceSource, setPriceSource] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // States for selling gold
  const [sellGoldModalVisible, setSellGoldModalVisible] = useState(false);
  const [sellingGold, setSellingGold] = useState(false);
  const [goldTypeToSell, setGoldTypeToSell] = useState<GoldType>(GoldType.GRAM);
  const [quantityToSell, setQuantityToSell] = useState('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [sellError, setSellError] = useState<string>('');

  useEffect(() => {
    loadGoldDetails();
    fetchUserAccounts();
  }, [account]);

  const fetchUserAccounts = async () => {
    if (currentUser) {
      try {
        const accounts = await AccountService.getUserAccounts(currentUser.uid);
        // Filter for non-gold accounts to transfer funds to
        const filteredAccounts = accounts.filter(acc => acc.type !== AccountType.GOLD && acc.id !== account.id);
        setUserAccounts(filteredAccounts);
        if (filteredAccounts.length > 0) {
          setTargetAccountId(filteredAccounts[0].id);
        }
      } catch (error) {
        console.error("Error fetching user accounts:", error);
      }
    }
  };

  const loadGoldDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Güncel altın fiyatlarını al
      const pricesData = await goldPriceService.getAllGoldPrices();
      setCurrentGoldPrices(pricesData);
      setPriceSource(pricesData.source || 'Bilinmeyen Kaynak');
      setLastUpdate(pricesData.lastUpdate);

      // Altın hesap detaylarını hesapla
      const details = calculateGoldDetails(account, pricesData.prices);
      setGoldDetails(details);
    } catch (error) {
      console.error('Altın detayları yüklenirken hata:', error);
      // Fallback - hesabın mevcut bakiyesini kullan
      if (account.goldHoldings) {
        const fallbackPrices = {
          [GoldType.GRAM]: 1950,
          [GoldType.QUARTER]: 480,
          [GoldType.HALF]: 960,
          [GoldType.FULL]: 1920,
        };
        const details = calculateGoldDetails(account, fallbackPrices);
        setGoldDetails(details);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const calculateGoldDetails = (acc: Account, currentPrices: { [key in GoldType]: number }): GoldAccountDetails => {
    const goldHoldings = acc.goldHoldings || {};

    
    let totalCurrentValue = 0;
    let totalInitialValue = 0;
    const breakdown: GoldBreakdown[] = [];

    // Her altın türü için hesaplama yap
    Object.entries(goldHoldings).forEach(([goldType, holdings]) => {
      if (holdings && holdings.length > 0) {
        const typeKey = goldType as GoldType;
        const currentPrice = currentPrices[typeKey];
        
        let typeQuantity = 0;
        let typeInitialValue = 0;
        
        holdings.forEach((holding: GoldHolding) => {
          typeQuantity += holding.quantity;
          typeInitialValue += holding.quantity * holding.initialPrice;
        });
        
        const typeCurrentValue = typeQuantity * currentPrice;
        const typeProfitLoss = typeCurrentValue - typeInitialValue;
        const typeProfitLossPercentage = typeInitialValue > 0 ? (typeProfitLoss / typeInitialValue) * 100 : 0;
        
        totalCurrentValue += typeCurrentValue;
        totalInitialValue += typeInitialValue;
        
        breakdown.push({
          type: typeKey,
          typeName: getGoldTypeName(typeKey),
          quantity: typeQuantity,
          currentPrice,
          currentValue: typeCurrentValue,
          initialValue: typeInitialValue,
          profitLoss: typeProfitLoss,
          profitLossPercentage: Math.round(typeProfitLossPercentage * 100) / 100,
        });
      }
    });

    const totalProfitLoss = totalCurrentValue - totalInitialValue;
    const totalProfitLossPercentage = totalInitialValue > 0 ? (totalProfitLoss / totalInitialValue) * 100 : 0;
    const daysSinceCreation = Math.floor((Date.now() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    return {
      accountId: acc.id,
      accountName: acc.name,
      goldHoldings,
      currentGoldPrices: currentPrices,
      initialGoldPrices: currentPrices,
      createdDate: new Date(acc.createdAt),
      currentValue: totalCurrentValue,
      initialValue: totalInitialValue,
      profitLoss: totalProfitLoss,
      profitLossPercentage: Math.round(totalProfitLossPercentage * 100) / 100,
      daysSinceCreation,
      breakdown,
    };
  };

  const getGoldTypeName = (type: GoldType): string => {
    const goldType = GOLD_TYPES.find(gt => gt.type === type);
    return goldType?.label || type;
  };

  const handleAddGold = async () => {
    if (!goldQuantity.trim()) {
      return;
    }

    const quantityToAdd = parseFloat(goldQuantity);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      return;
    }

    if (!currentGoldPrices) {
      console.error('Altın fiyatları yüklenmedi');
      return;
    }

    setAddingGold(true);
    try {
      const currentPrice = currentGoldPrices.prices[selectedGoldType];
      
      const newHolding: GoldHolding = {
        type: selectedGoldType,
        quantity: quantityToAdd,
        initialPrice: currentPrice,
        purchaseDate: new Date(),
      };

      const updatedHoldings: GoldHoldings = JSON.parse(JSON.stringify(account.goldHoldings || {}));
      
      if (!updatedHoldings[selectedGoldType]) {
        updatedHoldings[selectedGoldType] = [];
      }
      
      updatedHoldings[selectedGoldType]!.push(newHolding);

      if (currentUser) {
        await AccountService.updateAccount(account.id, {
          goldHoldings: updatedHoldings,
        });
      }
      
      const updatedAccount = {
        ...account,
        goldHoldings: updatedHoldings,
      };

      onAccountUpdate(updatedAccount);
      setAddGoldModalVisible(false);
      setGoldQuantity('');
    } catch (error) {
      console.error('Altın eklenirken hata:', error);
    } finally {
      setAddingGold(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR');
  };

  const getProfitLossColor = (amount: number) => {
    return amount >= 0 ? '#10b981' : '#ef4444';
  };

  const handleSellGold = async () => {
    if (!currentUser || !currentGoldPrices) {
      setSellError('Güncel veriler yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    if (!quantityToSell.trim() || !targetAccountId) {
      setSellError('Lütfen tüm alanları doldurun.');
      return;
    }

    const quantity = parseFloat(quantityToSell);
    const totalAvailable = goldDetails?.breakdown.find(b => b.type === goldTypeToSell)?.quantity || 0;

    if (isNaN(quantity) || quantity <= 0) {
      setSellError('Geçerli bir miktar girin.');
      return;
    }

    if (quantity > totalAvailable) {
      setSellError(`Satmak için yeterli ${getGoldTypeName(goldTypeToSell)} yok. Mevcut: ${totalAvailable}`);
      return;
    }

    setSellingGold(true);
    setSellError('');

    try {
      await AccountService.sellGold(
        currentUser.uid,
        account.id,
        targetAccountId,
        goldTypeToSell,
        quantity,
        currentGoldPrices.prices[goldTypeToSell]
      );

      // Refresh data after sale
      setSellGoldModalVisible(false);
      setQuantityToSell('');
      loadGoldDetails(true); // Refresh all details
      // Optionally show a success message
    } catch (error) {
      console.error('Altın satılırken hata:', error);
      setSellError((error as Error).message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setSellingGold(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={48} sx={{ color: '#fbbf24' }} />
        <Typography variant="body1" color="text.secondary">
          Altın detayları yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (!goldDetails) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <Alert severity="error">
          Altın detayları yüklenemedi
        </Alert>
        <Button onClick={() => loadGoldDetails()} variant="outlined">
          Tekrar Dene
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', 
      overflow: 'auto', 
      bgcolor: 'background.default' 
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ color: 'text.primary' }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {goldDetails.accountName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={() => {
              // Cache'i temizle ve yeniden yükle
              goldPriceService.clearCache();
              loadGoldDetails(true);
            }}
            disabled={refreshing}
            sx={{ color: '#fbbf24' }}
          >
            {refreshing ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
          <Button
            startIcon={<Sell />}
            onClick={() => setSellGoldModalVisible(true)}
            variant="outlined"
            size="small"
            sx={{
              color: '#ef4444',
              borderColor: '#ef4444',
              '&:hover': {
                backgroundColor: '#ef444410',
                borderColor: '#ef4444',
              },
            }}
          >
            Sat
          </Button>
          <Button
            startIcon={<Add />}
            onClick={() => setAddGoldModalVisible(true)}
            variant="outlined"
            size="small"
            sx={{
              color: '#10b981',
              borderColor: '#10b981',
              '&:hover': {
                backgroundColor: '#10b98110',
                borderColor: '#10b981',
              },
            }}
          >
            Ekle
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Genel Özet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment sx={{ color: '#fbbf24' }} />
                Genel Özet
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Toplam Değer
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#fbbf24' }}>
                    {formatCurrency(goldDetails.currentValue)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Hesap Açılış
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatDate(goldDetails.createdDate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Kar/Zarar Özeti */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card sx={{ 
            mb: 3, 
            bgcolor: `${getProfitLossColor(goldDetails.profitLoss)}10`,
            border: `1px solid ${getProfitLossColor(goldDetails.profitLoss)}30`
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ 
                mb: 3, 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: getProfitLossColor(goldDetails.profitLoss)
              }}>
                {goldDetails.profitLoss >= 0 ? <TrendingUp /> : <TrendingDown />}
                {goldDetails.profitLoss >= 0 ? 'Toplam Kar' : 'Toplam Zarar'}
              </Typography>
              
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700, 
                  color: getProfitLossColor(goldDetails.profitLoss),
                  mb: 1
                }}>
                  {goldDetails.profitLoss >= 0 ? '+' : ''}{formatCurrency(goldDetails.profitLoss)}
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: getProfitLossColor(goldDetails.profitLoss) 
                }}>
                  ({goldDetails.profitLoss >= 0 ? '+' : ''}{goldDetails.profitLossPercentage.toFixed(2)}%)
                </Typography>
              </Box>
              
              {goldDetails.daysSinceCreation > 0 && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Günlük ortalama: {((goldDetails.profitLossPercentage / goldDetails.daysSinceCreation)).toFixed(4)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Altın Türleri Detayı */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Diamond sx={{ color: '#fbbf24' }} />
                Altın Türleri Detayı
              </Typography>
              

              
              {goldDetails.breakdown.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Henüz altın bulunmuyor
                  </Typography>
                </Box>
              ) : (
                goldDetails.breakdown.map((item, index) => (
                <Box key={item.type} sx={{ mb: index === goldDetails.breakdown.length - 1 ? 0 : 3 }}>
                  <Card variant="outlined" sx={{ 
                    border: '1px solid rgba(251,191,36,0.3)',
                    bgcolor: 'rgba(251,191,36,0.05)'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Diamond sx={{ color: '#fbbf24', fontSize: 20 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {item.typeName}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${item.quantity} ${GOLD_TYPES.find(gt => gt.type === item.type)?.unit}`}
                          sx={{ 
                            bgcolor: '#fbbf24', 
                            color: 'white',
                            fontWeight: 600 
                          }}
                        />
                      </Box>
                      
                      {/* Toplam Özet */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Güncel Fiyat
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatCurrency(item.currentPrice)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Toplam Değer
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fbbf24' }}>
                            {formatCurrency(item.currentValue)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Kar/Zarar
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            color: getProfitLossColor(item.profitLoss) 
                          }}>
                            {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Yüzde
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            color: getProfitLossColor(item.profitLoss) 
                          }}>
                            {item.profitLoss >= 0 ? '+' : ''}{item.profitLossPercentage.toFixed(2)}%
                          </Typography>
                        </Box>
                      </Box>

                      {/* Bireysel Alışlar */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
                          Alış Detayları:
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {goldDetails.goldHoldings[item.type]?.map((holding, holdingIndex) => {
                            const currentHoldingValue = holding.quantity * item.currentPrice;
                            const initialHoldingValue = holding.quantity * holding.initialPrice;
                            const holdingProfitLoss = currentHoldingValue - initialHoldingValue;
                            const holdingProfitLossPercentage = initialHoldingValue > 0 ? (holdingProfitLoss / initialHoldingValue) * 100 : 0;
                            
                            return (
                              <Box 
                                key={holdingIndex} 
                                sx={{ 
                                  p: 2, 
                                  bgcolor: 'rgba(255,255,255,0.05)', 
                                  borderRadius: 1,
                                  border: '1px solid rgba(251,191,36,0.2)'
                                }}
                              >
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Miktar
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {holding.quantity} {GOLD_TYPES.find(gt => gt.type === item.type)?.unit}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Alış Fiyatı
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {formatCurrency(holding.initialPrice)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Güncel Değer
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fbbf24' }}>
                                      {formatCurrency(currentHoldingValue)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Kar/Zarar
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 600, 
                                      color: getProfitLossColor(holdingProfitLoss) 
                                    }}>
                                      {holdingProfitLoss >= 0 ? '+' : ''}{formatCurrency(holdingProfitLoss)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Yüzde
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 600, 
                                      color: getProfitLossColor(holdingProfitLoss) 
                                    }}>
                                      {holdingProfitLoss >= 0 ? '+' : ''}{holdingProfitLossPercentage.toFixed(2)}%
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Güncel Fiyatlar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney sx={{ color: '#fbbf24' }} />
                Güncel Fiyatlar
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                {GOLD_TYPES.map((goldType) => (
                  <Card key={goldType.type} variant="outlined" sx={{ 
                    textAlign: 'center',
                    border: '1px solid rgba(251,191,36,0.3)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(251,191,36,0.2)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease'
                    }
                  }}>
                    <CardContent>
                      <Diamond sx={{ color: '#fbbf24', fontSize: 32, mb: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {goldType.label}
                      </Typography>
                                              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          {currentGoldPrices ? formatCurrency(currentGoldPrices.prices[goldType.type]) : '---'}
                        </Typography>
                        {currentGoldPrices && (
                          <Chip
                            size="small"
                            label={`${currentGoldPrices.changes[goldType.type] >= 0 ? '+' : ''}${currentGoldPrices.changes[goldType.type].toFixed(2)}%`}
                            sx={{
                              bgcolor: currentGoldPrices.changes[goldType.type] >= 0 ? '#10b98120' : '#ef444420',
                              color: currentGoldPrices.changes[goldType.type] >= 0 ? '#10b981' : '#ef4444',
                              fontWeight: 600
                            }}
                          />
                        )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                  <Schedule fontSize="small" />
                  Son güncelleme: {lastUpdate ? lastUpdate.toLocaleString('tr-TR') : 'Bilinmiyor'}
                </Typography>
                {priceSource && (
                  <Typography variant="caption" color="text.secondary">
                    📊 Kaynak: {priceSource}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      {/* Altın Ekleme Modal */}
      <Dialog 
        open={addGoldModalVisible} 
        onClose={() => setAddGoldModalVisible(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Altın Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              select
              label="Altın Türü"
              value={selectedGoldType}
              onChange={(e) => setSelectedGoldType(e.target.value as GoldType)}
              sx={{ mb: 3 }}
            >
              {GOLD_TYPES.map((goldType) => (
                <MenuItem key={goldType.type} value={goldType.type}>
                  {goldType.label}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              label="Miktar"
              type="number"
              value={goldQuantity}
              onChange={(e) => setGoldQuantity(e.target.value)}
              placeholder="0"
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="text.secondary">
                    {GOLD_TYPES.find(gt => gt.type === selectedGoldType)?.unit}
                  </Typography>
                )
              }}
              sx={{ mb: 3 }}
            />
            
            <Alert severity="info">
              <Typography variant="body2">
                Güncel fiyat: {currentGoldPrices ? formatCurrency(currentGoldPrices.prices[selectedGoldType]) : '---'} / {GOLD_TYPES.find(gt => gt.type === selectedGoldType)?.unit}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddGoldModalVisible(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleAddGold}
            variant="contained"
            disabled={!goldQuantity.trim() || addingGold}
            sx={{ bgcolor: '#fbbf24', '&:hover': { bgcolor: '#f59e0b' } }}
          >
            {addingGold ? <CircularProgress size={20} /> : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Altın Satma Modal */}
      <Dialog 
        open={sellGoldModalVisible} 
        onClose={() => setSellGoldModalVisible(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Altın Sat</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {sellError && <Alert severity="error" sx={{ mb: 2 }}>{sellError}</Alert>}
            
            <TextField
              fullWidth
              select
              label="Satılacak Altın Türü"
              value={goldTypeToSell}
              onChange={(e) => {
                setGoldTypeToSell(e.target.value as GoldType);
                setSellError('');
              }}
              sx={{ mb: 3 }}
            >
              {GOLD_TYPES.filter(gt => goldDetails?.breakdown.some(b => b.type === gt.type && b.quantity > 0)).map((goldType) => (
                <MenuItem key={goldType.type} value={goldType.type}>
                  {goldType.label} (Mevcut: {goldDetails?.breakdown.find(b => b.type === goldType.type)?.quantity || 0} {goldType.unit})
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              label="Satılacak Miktar"
              type="number"
              value={quantityToSell}
              onChange={(e) => {
                setQuantityToSell(e.target.value);
                setSellError('');
              }}
              placeholder="0"
              error={!!sellError}
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="text.secondary">
                    {GOLD_TYPES.find(gt => gt.type === goldTypeToSell)?.unit}
                  </Typography>
                )
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              select
              label="Aktarılacak Hesap"
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              sx={{ mb: 3 }}
              disabled={userAccounts.length === 0}
            >
              {userAccounts.length === 0 ? (
                <MenuItem value="" disabled>Para aktarılacak başka hesap bulunamadı.</MenuItem>
              ) : (
                userAccounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </MenuItem>
                ))
              )}
            </TextField>
            
            <Alert severity="info">
              <Typography variant="body2">
                Güncel Satış Fiyatı: {currentGoldPrices ? formatCurrency(currentGoldPrices.prices[goldTypeToSell]) : '---'}
              </Typography>
              <Typography variant="body2">
                Toplam Tutar: {currentGoldPrices && quantityToSell && !isNaN(parseFloat(quantityToSell)) ? formatCurrency(currentGoldPrices.prices[goldTypeToSell] * parseFloat(quantityToSell)) : formatCurrency(0)}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellGoldModalVisible(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleSellGold}
            variant="contained"
            color="error"
            disabled={!quantityToSell.trim() || !targetAccountId || sellingGold}
          >
            {sellingGold ? <CircularProgress size={20} /> : 'Satışı Onayla'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoldAccountDetail; 