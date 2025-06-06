import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { AccountType, CreateAccountRequest } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import GoldPriceService from '../services/GoldPriceService';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AddAccountScreenProps {
  navigation: any;
  route?: {
    params?: {
      editAccount?: any; // Account to edit
    };
  };
}

const ACCOUNT_TYPES = [
  { 
    type: AccountType.CASH, 
    label: 'Nakit', 
    icon: 'wallet',
    color: COLORS.SUCCESS,
    description: 'Cüzdanınızdaki nakit para'
  },
  { 
    type: AccountType.DEBIT_CARD, 
    label: 'Banka Kartı', 
    icon: 'card',
    color: COLORS.PRIMARY,
    description: 'Vadesiz hesap ve banka kartı'
  },
  { 
    type: AccountType.CREDIT_CARD, 
    label: 'Kredi Kartı', 
    icon: 'card',
    color: COLORS.ERROR,
    description: 'Kredi kartı hesabı'
  },
  { 
    type: AccountType.SAVINGS, 
    label: 'Tasarruf', 
    icon: 'home',
    color: COLORS.WARNING,
    description: 'Tasarruf hesabı'
  },
  { 
    type: AccountType.INVESTMENT, 
    label: 'Yatırım', 
    icon: 'stats-chart',
    color: COLORS.SECONDARY,
    description: 'Yatırım hesabı'
  },
  { 
    type: AccountType.GOLD, 
    label: 'Altın', 
    icon: 'diamond',
    color: '#FFD700',
    description: 'Fiziki altın varlığınız'
  },
];

const ACCOUNT_COLORS = [
  COLORS.PRIMARY,
  COLORS.SUCCESS,
  COLORS.ERROR,
  COLORS.WARNING,
  COLORS.SECONDARY,
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
];

const AddAccountScreen: React.FC<AddAccountScreenProps> = observer(({ navigation, route }) => {
  const { user } = useAuth();
  const [viewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);

  const editAccount = route?.params?.editAccount;
  const isEditMode = !!editAccount;

  const [accountName, setAccountName] = useState(editAccount?.name || '');
  const [selectedType, setSelectedType] = useState<AccountType>(editAccount?.type || AccountType.DEBIT_CARD);
  const [initialBalance, setInitialBalance] = useState(editAccount?.balance ? Math.abs(editAccount.balance).toString() : '');
  const [isPositiveBalance, setIsPositiveBalance] = useState(
    editAccount?.balance 
      ? editAccount.balance >= 0 
      : (editAccount?.type || AccountType.DEBIT_CARD) !== AccountType.CREDIT_CARD
  );
  const [selectedColor, setSelectedColor] = useState(editAccount?.color || COLORS.PRIMARY);
  const [goldGrams, setGoldGrams] = useState(editAccount?.goldGrams ? editAccount.goldGrams.toString() : '');
  const [currentGoldPrice, setCurrentGoldPrice] = useState(4250); // Default fiyat
  const [loading, setLoading] = useState(false);
  const [includeInTotalBalance, setIncludeInTotalBalance] = useState(
    editAccount?.includeInTotalBalance !== undefined ? editAccount.includeInTotalBalance : true
  );

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  const goldService = GoldPriceService.getInstance();

  // Güncel altın fiyatını çek
  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const priceData = await goldService.getCurrentGoldPrices();
        setCurrentGoldPrice(priceData.gramPrice || priceData.buyPrice);
      } catch (error) {
        console.error('Altın fiyatı alınamadı:', error);
        // Default fiyat zaten set edilmiş
      }
    };

    if (selectedType === AccountType.GOLD) {
      fetchGoldPrice();
    }
  }, [selectedType]);

  // Auto-update balance sign when account type changes
  useEffect(() => {
    // For new accounts (not editing), auto-set credit cards to negative
    if (!isEditMode && selectedType === AccountType.CREDIT_CARD) {
      setIsPositiveBalance(false);
    }
  }, [selectedType, isEditMode]);

  // Helper function to format balance input
  const formatBalanceInput = (value: string) => {
    // Only allow numbers, commas and dots (no minus sign since we have toggle)
    const cleanValue = value.replace(/[^0-9,\.]/g, '');
    return cleanValue;
  };

  // Get the final balance value (with sign)
  const getFinalBalance = () => {
    const absValue = parseFloat(initialBalance.replace(',', '.')) || 0;
    return isPositiveBalance ? absValue : -absValue;
  };

  // Helper function to get balance description based on account type
  const getBalanceDescription = () => {
    switch (selectedType) {
      case AccountType.CREDIT_CARD:
        return 'Kredi kartı borç tutarını girin (sol taraftaki - butonuna basın)';
      case AccountType.CASH:
        return 'Nakit paranızın miktarını giriniz';
      case AccountType.DEBIT_CARD:
      case AccountType.SAVINGS:
        return 'Hesabınızdaki mevcut tutarı giriniz';
      case AccountType.INVESTMENT:
        return 'Yatırımınızın güncel değerini giriniz';
      case AccountType.GOLD:
        return 'Altın hesabı için gram miktarını giriniz (değer otomatik hesaplanacak)';
      default:
        return 'Hesabın başlangıç bakiyesini giriniz (+ / - butonunu kullanın)';
    }
  };

  // Auto-set positive/negative based on account type when creating new account
  const handleTypeChange = (type: AccountType) => {
    setSelectedType(type);
    
    // Credit cards are always negative (debt), others start positive
    if (type === AccountType.CREDIT_CARD) {
      setIsPositiveBalance(false);
    } else if (!isEditMode) {
      // Only auto-set for new accounts, not when editing non-credit cards
      setIsPositiveBalance(true);
    }
  };

  // Check if current selection allows positive values
  const canBePositive = () => {
    return selectedType !== AccountType.CREDIT_CARD;
  };

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      Alert.alert('Hata', 'Hesap adı gereklidir');
      return;
    }

    // Altın hesabı için gram kontrolü
    if (selectedType === AccountType.GOLD) {
      if (!goldGrams.trim()) {
        Alert.alert('Hata', 'Altın gram miktarı gereklidir');
        return;
      }
      const grams = parseFloat(goldGrams.replace(',', '.'));
      if (isNaN(grams) || grams <= 0) {
        Alert.alert('Hata', 'Geçerli bir gram miktarı giriniz');
        return;
      }
    } else {
      if (!initialBalance.trim()) {
        Alert.alert('Hata', 'Başlangıç bakiyesi gereklidir');
        return;
      }
      const balance = parseFloat(initialBalance.replace(',', '.'));
      if (isNaN(balance)) {
        Alert.alert('Hata', 'Geçerli bir bakiye giriniz');
        return;
      }
    }

    if (!viewModel) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setLoading(true);

    const selectedTypeData = ACCOUNT_TYPES.find(type => type.type === selectedType);
    
    let success = false;

    // Altın hesabı için balance'ı gram * güncel fiyat olarak hesapla
    let finalBalance = 0;
    let goldGramsValue = 0;
    
    if (selectedType === AccountType.GOLD) {
      goldGramsValue = parseFloat(goldGrams.replace(',', '.'));
      // Altın hesapları için balance'ı 0 olarak kaydet, runtime'da hesaplanacak
      finalBalance = 0;
    } else {
      finalBalance = getFinalBalance();
    }

    if (isEditMode) {
      // Update existing account
      const updateData = {
        id: editAccount.id,
        name: accountName.trim(),
        type: selectedType,
        color: selectedColor,
        icon: selectedTypeData?.icon || 'wallet',
        goldGrams: selectedType === AccountType.GOLD ? goldGramsValue : undefined,
        initialGoldPrice: selectedType === AccountType.GOLD ? currentGoldPrice : undefined,
        includeInTotalBalance,
      };

      success = await viewModel.updateAccountInfo(updateData);
      
      // Altın hesabı değilse balance'ı güncelle
      if (selectedType !== AccountType.GOLD && editAccount.balance !== finalBalance) {
        await viewModel.updateAccountBalance(editAccount.id, finalBalance);
      }
    } else {
      // Create new account
      const accountData: CreateAccountRequest = {
        name: accountName.trim(),
        type: selectedType,
        initialBalance: finalBalance,
        color: selectedColor,
        icon: selectedTypeData?.icon || 'wallet',
        goldGrams: selectedType === AccountType.GOLD ? goldGramsValue : undefined,
        initialGoldPrice: selectedType === AccountType.GOLD ? currentGoldPrice : undefined,
        includeInTotalBalance,
      };

      success = await viewModel.createAccount(accountData);
    }
    
    setLoading(false);

    if (success) {
      // Başarı mesajı göster ve ana sayfaya yönlendir
      Alert.alert(
        'Başarılı',
        isEditMode ? 'Hesap başarıyla güncellendi' : 'Hesap başarıyla oluşturuldu',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Kısa bir gecikme ekle ki Firestore real-time listener güncellensin
              setTimeout(() => {
                if (isEditMode) {
                  navigation.goBack();
                } else {
                  // Yeni hesap oluşturulduğunda ana sayfaya dön
                  navigation.navigate('MainTabs', { screen: 'Dashboard' });
                }
              }, 100);
            }
          }
        ]
      );
    } else {
      Alert.alert('Hata', viewModel.error || (isEditMode ? 'Hesap güncellenirken hata oluştu' : 'Hesap oluşturulurken hata oluştu'));
    }
  };

  const AccountTypeCard = ({ type, label, icon, color, description }: any) => (
    <TouchableOpacity
      style={[
        styles.typeCard,
        selectedType === type && styles.selectedTypeCard
      ]}
      onPress={() => handleTypeChange(type)}
    >
      <View style={[styles.typeIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <View style={styles.typeInfo}>
        <Text style={styles.typeLabel}>{label}</Text>
        <Text style={styles.typeDescription}>{description}</Text>
      </View>
      {selectedType === type && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
      )}
    </TouchableOpacity>
  );

  const ColorOption = ({ color }: { color: string }) => (
    <TouchableOpacity
      style={[
        styles.colorOption,
        { backgroundColor: color },
        selectedColor === color && styles.selectedColorOption
      ]}
      onPress={() => setSelectedColor(color)}
    >
      {selectedColor === color && (
        <Ionicons name="checkmark" size={16} color="white" />
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>{isEditMode ? 'Hesabı Düzenle' : 'Yeni Hesap'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Name */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Adı</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Örn: Ana Hesap, Nakit Para"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
          />
        </Card>

        {/* Account Type */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Türü</Text>
          {ACCOUNT_TYPES.map((type) => (
            <AccountTypeCard key={type.type} {...type} />
          ))}
        </Card>

        {/* Initial Balance / Gold Grams */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedType === AccountType.GOLD ? 'Altın Miktarı' : 'Başlangıç Bakiyesi'}
          </Text>
          <Text style={styles.balanceDescription}>{getBalanceDescription()}</Text>
          
          {selectedType === AccountType.GOLD ? (
            // Altın hesabı için gram input
            <View style={styles.balanceInputContainer}>
              <TextInput
                style={[styles.balanceInput, { textAlign: 'center' }]}
                value={goldGrams}
                onChangeText={(value) => setGoldGrams(formatBalanceInput(value))}
                placeholder="0,00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencySymbol}>gram</Text>
            </View>
          ) : (
            // Diğer hesaplar için normal balance input
            <View style={styles.balanceInputContainer}>
              {/* Toggle Button for Positive/Negative */}
              <TouchableOpacity
                style={[
                  styles.signToggleButton,
                  { backgroundColor: isPositiveBalance ? COLORS.SUCCESS : COLORS.ERROR },
                  !canBePositive() && styles.signToggleButtonDisabled
                ]}
                onPress={() => canBePositive() && setIsPositiveBalance(!isPositiveBalance)}
                disabled={!canBePositive()}
              >
                <Text style={styles.signToggleText}>
                  {isPositiveBalance ? '+' : '-'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <TextInput
                style={styles.balanceInput}
                value={initialBalance}
                onChangeText={(value) => setInitialBalance(formatBalanceInput(value))}
                placeholder="0,00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="decimal-pad"
              />
            </View>
          )}
          
          {/* Balance Preview */}
          {selectedType === AccountType.GOLD && goldGrams && (
            <Text style={[styles.balancePreview, { color: COLORS.WARNING }]}>
              Güncel Değer: {currencySymbol}{(parseFloat(goldGrams.replace(',', '.')) * currentGoldPrice).toLocaleString('tr-TR')} 
              {'\n'}(İlk alış: {(currentGoldPrice).toLocaleString('tr-TR')} ₺/gram)
            </Text>
          )}
          
          {selectedType !== AccountType.GOLD && initialBalance && (
            <Text style={[
              styles.balancePreview,
              { color: isPositiveBalance ? COLORS.SUCCESS : COLORS.ERROR }
            ]}>
              {selectedType === AccountType.CREDIT_CARD 
                ? `Kredi Kartı Borcu: ${currencySymbol}${Math.abs(parseFloat(initialBalance.replace(',', '.')) || 0).toLocaleString('tr-TR')}`
                : `${isPositiveBalance ? 'Bakiye: +' : 'Borç: -'}${currencySymbol}${Math.abs(parseFloat(initialBalance.replace(',', '.')) || 0).toLocaleString('tr-TR')}`
              }
            </Text>
          )}
        </Card>

        {/* Account Color */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Rengi</Text>
          <View style={styles.colorGrid}>
            {ACCOUNT_COLORS.map((color) => (
              <ColorOption key={color} color={color} />
            ))}
          </View>
        </Card>

        {/* Include in Total Balance */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Bütçe Ayarları</Text>
          <View style={styles.includeBalanceContainer}>
            <View style={styles.includeBalanceLeft}>
              <Text style={styles.includeBalanceLabel}>Toplam Bakiyeye Dahil Et</Text>
              <Text style={styles.includeBalanceDescription}>
                Bu hesap ana sayfadaki toplam bakiye hesaplamasına dahil edilsin mi?
              </Text>
            </View>
            <Switch
              value={includeInTotalBalance}
              onValueChange={setIncludeInTotalBalance}
              trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '40' }}
              thumbColor={includeInTotalBalance ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
              ios_backgroundColor={COLORS.SURFACE}
            />
          </View>
        </Card>

        {/* Preview */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Önizleme</Text>
          <View style={[styles.previewCard, { backgroundColor: selectedColor }]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIconContainer}>
                <Ionicons 
                  name={ACCOUNT_TYPES.find(t => t.type === selectedType)?.icon as any || 'wallet'}
                  size={20} 
                  color="white" 
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {accountName || 'Hesap Adı'}
                </Text>
                <Text style={styles.previewType}>
                  {ACCOUNT_TYPES.find(t => t.type === selectedType)?.label}
                </Text>
              </View>
            </View>
            
            {selectedType === AccountType.GOLD ? (
              <View style={styles.previewGoldInfo}>
                <Text style={styles.previewBalance}>
                  {goldGrams ? `${parseFloat(goldGrams.replace(',', '.')).toLocaleString('tr-TR')} gram` : '0 gram'}
                </Text>
                <Text style={styles.previewGoldValue}>
                  {goldGrams 
                    ? `${currencySymbol}${(parseFloat(goldGrams.replace(',', '.')) * currentGoldPrice).toLocaleString('tr-TR')}`
                    : `${currencySymbol}0`
                  }
                </Text>
              </View>
            ) : (
              <Text style={styles.previewBalance}>
                {(() => {
                  const balance = getFinalBalance();
                  if (balance < 0) {
                    return `-${currencySymbol}${Math.abs(balance).toLocaleString('tr-TR')}`;
                  } else {
                    return `${currencySymbol}${balance.toLocaleString('tr-TR')}`;
                  }
                })()}
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (
              !accountName.trim() || 
              (selectedType === AccountType.GOLD ? !goldGrams.trim() : !initialBalance.trim()) || 
              loading
            ) && styles.createButtonDisabled
          ]}
          onPress={handleCreateAccount}
          disabled={
            !accountName.trim() || 
            (selectedType === AccountType.GOLD ? !goldGrams.trim() : !initialBalance.trim()) || 
            loading
          }
        >
          <Text style={styles.createButtonText}>
            {loading 
              ? (isEditMode ? 'Güncelleniyor...' : 'Oluşturuluyor...') 
              : (isEditMode ? 'Hesabı Güncelle' : 'Hesap Oluştur')
            }
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  selectedTypeCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}10`,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  balanceInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewCard: {
    padding: SPACING.md,
    borderRadius: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  previewType: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewGoldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBalance: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.WHITE,
    textAlign: 'right',
  },
  previewGoldValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  balanceDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
  },
  balancePreview: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'right',
  },
  signToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  signToggleText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  signToggleButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  includeBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  includeBalanceLeft: {
    flex: 1,
  },
  includeBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  includeBalanceDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AddAccountScreen; 