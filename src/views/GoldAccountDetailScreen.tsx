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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { Account, GoldAccountDetails } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import GoldPriceService from '../services/GoldPriceService';

interface GoldAccountDetailScreenProps {
  navigation: any;
  route: {
    params: {
      account: Account;
    };
  };
}

const GoldAccountDetailScreen: React.FC<GoldAccountDetailScreenProps> = observer(({ navigation, route }) => {
  const { user } = useAuth();
  const { account } = route.params;
  const [viewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);

  const [goldDetails, setGoldDetails] = useState<GoldAccountDetails | null>(null);
  const [currentGoldPrice, setCurrentGoldPrice] = useState(4250);
  const [loading, setLoading] = useState(true);
  const [addGramsModalVisible, setAddGramsModalVisible] = useState(false);
  const [newGrams, setNewGrams] = useState('');
  const [addingGrams, setAddingGrams] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  const goldService = GoldPriceService.getInstance();

  useEffect(() => {
    loadGoldDetails();
  }, []);

  const loadGoldDetails = async () => {
    setLoading(true);
    try {
      // Güncel altın fiyatını al
      const priceData = await goldService.getCurrentGoldPrices();
      const currentPrice = priceData.gramPrice || priceData.buyPrice;
      setCurrentGoldPrice(currentPrice);

      // Altın hesap detaylarını hesapla
      const details = calculateGoldDetails(account, currentPrice);
      setGoldDetails(details);
    } catch (error) {
      console.error('Altın detayları yüklenirken hata:', error);
      Alert.alert('Hata', 'Altın detayları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculateGoldDetails = (acc: Account, currentPrice: number): GoldAccountDetails => {
    const totalGrams = acc.goldGrams || 0;
    const initialPrice = acc.initialGoldPrice || 4250;
    const createdDate = new Date(acc.createdAt);
    const currentValue = totalGrams * currentPrice;
    const initialValue = totalGrams * initialPrice;
    const profitLoss = currentValue - initialValue;
    const profitLossPercentage = initialValue > 0 ? (profitLoss / initialValue) * 100 : 0;
    const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      accountId: acc.id,
      accountName: acc.name,
      totalGrams,
      currentGoldPrice: currentPrice,
      initialGoldPrice: initialPrice,
      createdDate,
      currentValue,
      initialValue,
      profitLoss,
      profitLossPercentage,
      daysSinceCreation,
    };
  };

  const handleAddGrams = async () => {
    if (!newGrams.trim()) {
      Alert.alert('Hata', 'Gram miktarı girin');
      return;
    }

    const gramsToAdd = parseFloat(newGrams.replace(',', '.'));
    if (isNaN(gramsToAdd) || gramsToAdd <= 0) {
      Alert.alert('Hata', 'Geçerli bir gram miktarı girin');
      return;
    }

    if (!viewModel) {
      Alert.alert('Hata', 'Hesap güncellenemiyor');
      return;
    }

    setAddingGrams(true);
    try {
      // Yeni toplam gram
      const newTotalGrams = (account.goldGrams || 0) + gramsToAdd;

      // Hesabı güncelle - sadece goldGrams'ı güncelle, balance otomatik hesaplanacak
      const updateData = {
        id: account.id,
        goldGrams: newTotalGrams,
      };

      const success = await viewModel.updateAccountInfo(updateData);
      if (success) {
        // Local state'i güncelle
        account.goldGrams = newTotalGrams;
        account.balance = newTotalGrams * currentGoldPrice; // UI için local güncelleme
        
        // Detayları yeniden hesapla
        const updatedDetails = calculateGoldDetails(account, currentGoldPrice);
        setGoldDetails(updatedDetails);
        
        setAddGramsModalVisible(false);
        setNewGrams('');
        
        Alert.alert('Başarılı', `${gramsToAdd} gram altın eklendi`);
      } else {
        Alert.alert('Hata', 'Altın eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Altın ekleme hatası:', error);
      Alert.alert('Hata', 'Altın eklenirken hata oluştu');
    } finally {
      setAddingGrams(false);
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
        <TouchableOpacity
          style={styles.addGramsButton}
          onPress={() => setAddGramsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Genel Bilgiler */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Genel Bilgiler</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Toplam Altın</Text>
              <Text style={styles.infoValue}>{goldDetails.totalGrams.toLocaleString('tr-TR')} gram</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Hesap Açılış Tarihi</Text>
              <Text style={styles.infoValue}>{formatDate(goldDetails.createdDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Geçen Gün Sayısı</Text>
              <Text style={styles.infoValue}>{goldDetails.daysSinceCreation} gün</Text>
            </View>
          </View>
        </Card>

        {/* Fiyat Bilgileri */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Fiyat Bilgileri</Text>
          <View style={styles.priceGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>İlk Alış Fiyatı</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(goldDetails.initialGoldPrice)}/gram
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Güncel Fiyat</Text>
              <Text style={[styles.priceValue, { color: '#FFD700' }]}>
                {formatCurrency(goldDetails.currentGoldPrice)}/gram
              </Text>
            </View>
          </View>
        </Card>

        {/* Değer Analizi */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Değer Analizi</Text>
          <View style={styles.valueGrid}>
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>İlk Değer</Text>
              <Text style={styles.valueAmount}>
                {formatCurrency(goldDetails.initialValue)}
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text style={styles.valueLabel}>Güncel Değer</Text>
              <Text style={[styles.valueAmount, { color: '#FFD700' }]}>
                {formatCurrency(goldDetails.currentValue)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Kar/Zarar */}
        <Card style={StyleSheet.flatten([styles.section, { backgroundColor: getProfitLossColor(goldDetails.profitLoss) + '10' }])}>
          <Text style={styles.sectionTitle}>
            {goldDetails.profitLoss >= 0 ? '📈 Kar' : '📉 Zarar'}
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

        {/* İstatistikler */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Toplam Getiri</Text>
              <Text style={[styles.statValue, { color: getProfitLossColor(goldDetails.profitLoss) }]}>
                %{goldDetails.profitLossPercentage.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Fiyat Değişimi</Text>
              <Text style={[styles.statValue, { color: getProfitLossColor(goldDetails.currentGoldPrice - goldDetails.initialGoldPrice) }]}>
                {formatCurrency(goldDetails.currentGoldPrice - goldDetails.initialGoldPrice)} TL/gram
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Gram Ekleme Modal */}
      {addGramsModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Altın Ekle</Text>
            
            <Text style={styles.modalLabel}>Eklenecek Gram Miktarı</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newGrams}
                onChangeText={setNewGrams}
                placeholder="0,00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputUnit}>gram</Text>
            </View>

            {newGrams && (
              <Text style={styles.estimatedValue}>
                Tahmini değer: {formatCurrency(parseFloat(newGrams.replace(',', '.')) * currentGoldPrice)}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddGramsModalVisible(false);
                  setNewGrams('');
                }}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddGrams}
                disabled={addingGrams || !newGrams.trim()}
              >
                {addingGrams ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.addButtonText}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  addGramsButton: {
    padding: SPACING.xs,
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
  infoGrid: {
    gap: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  priceLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  priceValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  valueGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
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
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: SPACING.lg,
    margin: SPACING.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
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
    backgroundColor: COLORS.SURFACE,
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
    fontWeight: '600',
  },
});

export default GoldAccountDetailScreen; 