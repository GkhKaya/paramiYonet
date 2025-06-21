import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { Account, GoldAccountDetails, GoldType, GoldHolding, GoldHoldings, GoldBreakdown } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import GoldPriceService, { AllGoldPricesData } from '../services/GoldPriceService';
import useWebAmountInput from '../hooks/useWebAmountInput';

interface GoldAccountDetailScreenProps {
  navigation: any;
  route: {
    params: {
      account: Account;
    };
  };
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

const GoldAccountDetailScreen: React.FC<GoldAccountDetailScreenProps> = observer(({ navigation, route }) => {
  const { user } = useAuth();
  const { account } = route.params;
  const [viewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);

  const amountInput = useWebAmountInput();
  const [goldDetails, setGoldDetails] = useState<GoldAccountDetails | null>(null);
  const [currentGoldPrices, setCurrentGoldPrices] = useState<AllGoldPricesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addGoldModalVisible, setAddGoldModalVisible] = useState(false);
  const [selectedGoldType, setSelectedGoldType] = useState<GoldType>(GoldType.GRAM);
  const [addingGold, setAddingGold] = useState(false);
  const [priceSource, setPriceSource] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  const goldService = GoldPriceService.getInstance();

  useEffect(() => {
    loadGoldDetails();
  }, []);

  const loadGoldDetails = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Güncel altın fiyatlarını al
      const pricesData = await goldService.getAllGoldPrices();
      setCurrentGoldPrices(pricesData);
      setPriceSource(pricesData.source || 'Bilinmeyen Kaynak');
      setLastUpdate(pricesData.lastUpdate);

      // Altın hesap detaylarını hesapla
      const details = calculateGoldDetails(account, pricesData);
      setGoldDetails(details);
    } catch (error) {
      console.error('Altın detayları yüklenirken hata:', error);
      Alert.alert('Hata', 'Altın detayları yüklenirken bir hata oluştu');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    // Cache'i temizle ve yeniden yükle
    goldService.clearCache();
    loadGoldDetails(true);
  };

  const calculateGoldDetails = (acc: Account, pricesData: AllGoldPricesData): GoldAccountDetails => {
    const goldHoldings = acc.goldHoldings || {};
    const currentPrices = pricesData.prices;
    
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
          typeName: goldService.getGoldTypeName(typeKey),
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

    // İlk altın satın alma tarihini bul
    let earliestPurchaseDate = new Date(acc.createdAt);
         Object.values(goldHoldings).forEach((holdings: GoldHolding[] | undefined) => {
       if (holdings) {
         holdings.forEach((holding: GoldHolding) => {
           const purchaseDate = new Date(holding.purchaseDate);
           if (purchaseDate < earliestPurchaseDate) {
             earliestPurchaseDate = purchaseDate;
           }
         });
       }
     });

    return {
      accountId: acc.id,
      accountName: acc.name,
      goldHoldings,
      currentGoldPrices: currentPrices,
      initialGoldPrices: currentPrices, // Bu gerçek uygulamada initial price'lar olmalı
      createdDate: earliestPurchaseDate,
      currentValue: totalCurrentValue,
      initialValue: totalInitialValue,
      profitLoss: totalProfitLoss,
      profitLossPercentage: Math.round(totalProfitLossPercentage * 100) / 100,
      daysSinceCreation,
      breakdown,
    };
  };

  const handleAddGold = async () => {
    if (!amountInput.value.trim()) {
      Alert.alert('Hata', 'Miktar girin');
      return;
    }

    const quantityToAdd = parseFloat(amountInput.value);
    if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
      Alert.alert('Hata', 'Geçerli bir miktar girin');
      return;
    }

    if (!viewModel || !currentGoldPrices) {
      Alert.alert('Hata', 'Hesap güncellenemiyor');
      return;
    }

    setAddingGold(true);
    try {
      const currentPrice = currentGoldPrices.prices[selectedGoldType];
      const now = new Date();
      
      // Mevcut goldHoldings'i kopyala
      const currentHoldings = { ...(account.goldHoldings || {}) };
      
      // Yeni holding ekle
      if (!currentHoldings[selectedGoldType]) {
        currentHoldings[selectedGoldType] = [];
      }
      
      currentHoldings[selectedGoldType]!.push({
        type: selectedGoldType,
        quantity: quantityToAdd,
        initialPrice: currentPrice,
        purchaseDate: now
      });

      // Hesabı güncelle
      const updateData = {
        id: account.id,
        goldHoldings: currentHoldings,
      };

      const success = await viewModel.updateAccountInfo(updateData);
      if (success) {
        // Local state'i güncelle
        account.goldHoldings = currentHoldings;
        
        // Detayları yeniden hesapla
        if (currentGoldPrices) {
          const updatedDetails = calculateGoldDetails(account, currentGoldPrices);
          setGoldDetails(updatedDetails);
        }
        
        setAddGoldModalVisible(false);
        amountInput.clear();
        
        const goldTypeName = goldService.getGoldTypeName(selectedGoldType);
        const unit = GOLD_TYPES.find(gt => gt.type === selectedGoldType)?.unit || 'adet';
        Alert.alert('Başarılı', `${quantityToAdd} ${unit} ${goldTypeName} eklendi`);
      } else {
        Alert.alert('Hata', 'Altın eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Altın ekleme hatası:', error);
      Alert.alert('Hata', 'Altın eklenirken hata oluştu');
    } finally {
      setAddingGold(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProfitLossColor = (amount: number) => {
    if (amount > 0) return COLORS.SUCCESS;
    if (amount < 0) return COLORS.ERROR;
    return COLORS.TEXT_SECONDARY;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Altın Detayları</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goldDetails) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Altın Detayları</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>Veriler yüklenemedi</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{goldDetails.accountName}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, refreshing && styles.headerButtonDisabled]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons name={refreshing ? "hourglass-outline" : "refresh"} size={20} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setAddGoldModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Genel Özet */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Genel Özet</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Toplam Değer</Text>
              <Text style={[styles.summaryValue, { color: '#FFD700' }]}>
                {formatCurrency(goldDetails.currentValue)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Hesap Açılış</Text>
              <Text style={styles.summaryValue}>{formatDate(goldDetails.createdDate)}</Text>
            </View>
          </View>
        </Card>

        {/* Kar/Zarar Özeti */}
        <Card style={StyleSheet.flatten([styles.section, { backgroundColor: getProfitLossColor(goldDetails.profitLoss) + '10' }])}>
          <Text style={styles.sectionTitle}>
            {goldDetails.profitLoss >= 0 ? '📈 Toplam Kar' : '📉 Toplam Zarar'}
          </Text>
          <View style={styles.profitLossContainer}>
            <Text style={[styles.profitLossAmount, { color: getProfitLossColor(goldDetails.profitLoss) }]}>
              {goldDetails.profitLoss >= 0 ? '+' : ''}{formatCurrency(goldDetails.profitLoss)}
            </Text>
            <Text style={[styles.profitLossPercentage, { color: getProfitLossColor(goldDetails.profitLoss) }]}>
              ({goldDetails.profitLoss >= 0 ? '+' : ''}{goldDetails.profitLossPercentage.toFixed(2)}%)
            </Text>
          </View>
          
          {goldDetails.daysSinceCreation > 0 && (
            <Text style={styles.dailyReturn}>
              Günlük ortalama: {((goldDetails.profitLossPercentage / goldDetails.daysSinceCreation)).toFixed(4)}%
            </Text>
          )}
        </Card>

        {/* Altın Türleri Detayı */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Altın Türleri Detayı</Text>
          {goldDetails.breakdown.map((item, index) => (
            <View key={item.type} style={[
              styles.goldTypeDetailCard, 
              index === goldDetails.breakdown.length - 1 && styles.lastGoldTypeDetail
            ]}>
              <View style={styles.goldTypeDetailHeader}>
                <View style={styles.goldTypeDetailTitle}>
                  <Ionicons name="diamond" size={20} color="#FFD700" />
                  <Text style={styles.goldTypeDetailName}>{item.typeName}</Text>
                </View>
                <View style={styles.goldTypeDetailQuantityContainer}>
                  <Text style={styles.goldTypeDetailQuantity}>
                    {item.quantity} {GOLD_TYPES.find(gt => gt.type === item.type)?.unit}
                  </Text>
                </View>
              </View>
              
              <View style={styles.goldTypeDetailStats}>
                <View style={styles.goldTypeDetailStat}>
                  <Text style={styles.goldTypeDetailStatLabel}>Güncel Fiyat</Text>
                  <Text style={styles.goldTypeDetailStatValue}>{formatCurrency(item.currentPrice)}</Text>
                </View>
                <View style={styles.goldTypeDetailStat}>
                  <Text style={styles.goldTypeDetailStatLabel}>Toplam Değer</Text>
                  <Text style={[styles.goldTypeDetailStatValue, { color: '#FFD700' }]}>{formatCurrency(item.currentValue)}</Text>
                </View>
                <View style={styles.goldTypeDetailStat}>
                  <Text style={styles.goldTypeDetailStatLabel}>Kar/Zarar</Text>
                  <Text style={[styles.goldTypeDetailStatValue, { color: getProfitLossColor(item.profitLoss) }]}>
                    {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)}
                  </Text>
                  <Text style={[styles.goldTypeDetailStatPercentage, { color: getProfitLossColor(item.profitLoss) }]}>
                    ({item.profitLoss >= 0 ? '+' : ''}{item.profitLossPercentage.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Güncel Fiyatlar */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Güncel Fiyatlar</Text>
          <ScrollView 
            horizontal={true} 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pricesScrollContainer}
            style={styles.pricesScrollView}
          >
            {GOLD_TYPES.map((goldType, index) => (
              <View key={goldType.type} style={styles.priceCard}>
                <View style={styles.priceCardHeader}>
                  <Ionicons name={goldType.icon as any} size={24} color="#FFD700" />
                  <Text style={styles.priceCardTitle}>{goldType.label}</Text>
                </View>
                
                <View style={styles.priceCardContent}>
                  <Text style={styles.priceCardValue}>
                    {currentGoldPrices ? formatCurrency(currentGoldPrices.prices[goldType.type]) : '---'}
                  </Text>
                  
                  {currentGoldPrices && (
                    <View style={[
                      styles.priceChangeContainer,
                      { backgroundColor: currentGoldPrices.changes[goldType.type] >= 0 ? COLORS.SUCCESS + '20' : COLORS.ERROR + '20' }
                    ]}>
                      <Ionicons 
                        name={currentGoldPrices.changes[goldType.type] >= 0 ? "trending-up" : "trending-down"} 
                        size={12} 
                        color={currentGoldPrices.changes[goldType.type] >= 0 ? COLORS.SUCCESS : COLORS.ERROR} 
                      />
                      <Text style={[
                        styles.priceChangeText,
                        { color: currentGoldPrices.changes[goldType.type] >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
                      ]}>
                        {currentGoldPrices.changes[goldType.type] >= 0 ? '+' : ''}{currentGoldPrices.changes[goldType.type].toFixed(2)}%
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          
          {/* Fiyat Kaynağı ve Son Güncelleme */}
          <View style={styles.priceInfo}>
            <Text style={styles.priceSource}>
              📊 Kaynak: {priceSource}
            </Text>
            {lastUpdate && (
              <Text style={styles.lastUpdate}>
                🕒 Son güncelleme: {lastUpdate.toLocaleString('tr-TR')}
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* Altın Ekleme Modal */}
      <Modal
        visible={addGoldModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddGoldModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Altın Ekle</Text>
            
            {/* Altın Türü Seçimi */}
            <Text style={styles.modalLabel}>Altın Türü</Text>
            <View style={styles.goldTypeSelector}>
              {GOLD_TYPES.map((goldType) => (
                <TouchableOpacity
                  key={goldType.type}
                  style={[
                    styles.goldTypeOption,
                    selectedGoldType === goldType.type && styles.goldTypeOptionSelected
                  ]}
                  onPress={() => setSelectedGoldType(goldType.type)}
                >
                  <Ionicons 
                    name={goldType.icon as any} 
                    size={16} 
                    color={selectedGoldType === goldType.type ? '#FFD700' : COLORS.TEXT_SECONDARY} 
                  />
                  <Text style={[
                    styles.goldTypeOptionText,
                    selectedGoldType === goldType.type && styles.goldTypeOptionTextSelected
                  ]}>
                    {goldType.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Miktar Girişi */}
            <Text style={styles.modalLabel}>
              Miktar ({GOLD_TYPES.find(gt => gt.type === selectedGoldType)?.unit})
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={amountInput.value}
                onChangeText={amountInput.onChangeText}
                placeholder="0"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="decimal-pad"
                autoFocus={true}
                selectTextOnFocus={true}
                returnKeyType="done"
                blurOnSubmit={true}
              />
              <Text style={styles.inputUnit}>
                {GOLD_TYPES.find(gt => gt.type === selectedGoldType)?.unit}
              </Text>
            </View>

            {/* Tahmini Değer */}
            {amountInput.value && currentGoldPrices && (
              <Text style={styles.estimatedValue}>
                Tahmini değer: {formatCurrency(parseFloat(amountInput.value) * currentGoldPrices.prices[selectedGoldType])}
              </Text>
            )}

            {/* Modal Butonları */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddGoldModalVisible(false);
                  amountInput.clear();
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddGold}
                disabled={addingGold || !amountInput.value.trim()}
              >
                {addingGold ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.addButtonText}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerButton: {
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.ERROR,
    textAlign: 'center',
  },
  section: {
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    gap: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  profitLossContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  profitLossAmount: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  profitLossPercentage: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
  },
  dailyReturn: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  goldTypeDetailCard: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  goldTypeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  goldTypeDetailTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldTypeDetailName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  goldTypeDetailQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldTypeDetailQuantity: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  goldTypeDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goldTypeDetailStat: {
    flex: 1,
    alignItems: 'center',
  },
  goldTypeDetailStatLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  goldTypeDetailStatValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.TEXT_PRIMARY,
  },
  goldTypeDetailStatPercentage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  pricesScrollContainer: {
    paddingHorizontal: SPACING.md,
  },
  pricesScrollView: {
    flexGrow: 0,
  },
  priceCard: {
    width: 160,
    marginRight: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  priceCardTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  priceCardContent: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  priceCardValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    minWidth: 60,
  },
  priceChangeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  priceInfo: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  priceSource: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  lastUpdate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  lastGoldTypeDetail: {
    borderBottomWidth: 0,
  },
  goldTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  goldTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  goldTypeOptionSelected: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  goldTypeOptionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  goldTypeOptionTextSelected: {
    color: COLORS.BLACK,
  },
  valueLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  valueAmount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.lg,
    margin: SPACING.lg,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.BACKGROUND,
    minHeight: 56,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.xl,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 44,
  },
  inputUnit: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  estimatedValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.BORDER,
  },
  cancelButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#FFD700',
  },
  addButtonText: {
    color: COLORS.BLACK,
    fontWeight: '700',
  },
});

export default GoldAccountDetailScreen; 