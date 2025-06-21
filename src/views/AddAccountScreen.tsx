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
import CustomAlert from '../components/common/CustomAlert';
import type { AlertType } from '../components/common/CustomAlert';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { AccountType, CreateAccountRequest, GoldType, GoldHoldings, GoldHolding } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import GoldPriceService, { AllGoldPricesData } from '../services/GoldPriceService';
import { useCurrency } from '../hooks';
import useWebAmountInput from '../hooks/useWebAmountInput';
import { getCreditCardInterestRates, getCreditCardInterestRatesByLimit, getMinPaymentRate, validateAndAdjustCreditCardDay, getDayValidationMessage, getInterestRateDescription } from '../utils/creditCard';

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
    description: 'Fiziki altın varlığınız (Gram, Çeyrek, Yarım, Tam)'
  },
];

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

  // Altın türleri için state'ler
  const [selectedGoldType, setSelectedGoldType] = useState<GoldType>(GoldType.GRAM);
  const [goldQuantities, setGoldQuantities] = useState<{[key in GoldType]: string}>({
    [GoldType.GRAM]: '',
    [GoldType.QUARTER]: '',
    [GoldType.HALF]: '',
    [GoldType.FULL]: ''
  });
  
  const [currentGoldPrices, setCurrentGoldPrices] = useState<AllGoldPricesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeInTotalBalance, setIncludeInTotalBalance] = useState(
    editAccount?.includeInTotalBalance !== undefined ? editAccount.includeInTotalBalance : true
  );
  
  // Kredi kartı alanları
  const [creditLimit, setCreditLimit] = useState(editAccount?.limit?.toString() || '');
  const [currentDebt, setCurrentDebt] = useState(editAccount?.currentDebt?.toString() || '0');
  const [statementDay, setStatementDay] = useState(editAccount?.statementDay?.toString() || '1');
  const [dueDay, setDueDay] = useState(editAccount?.dueDay?.toString() || '10');
  const [interestRate, setInterestRate] = useState(
    editAccount?.interestRate?.toString() || (selectedType === AccountType.CREDIT_CARD ? '' : '')
  );
  const [minPaymentRate, setMinPaymentRate] = useState(editAccount?.minPaymentRate ? (editAccount.minPaymentRate * 100).toString() : '');

  // Custom Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Custom hooks
  const { currencySymbol, formatInput } = useCurrency();
  const goldService = GoldPriceService.getInstance();

  useEffect(() => {
    const fetchGoldPrices = async () => {
      try {
        const pricesData = await goldService.getAllGoldPrices();
        setCurrentGoldPrices(pricesData);
      } catch (error) {
        console.error('Altın fiyatları alınamadı:', error);
      }
    };

    if (selectedType === AccountType.GOLD) {
      fetchGoldPrices();
    }
  }, [selectedType]);

  // Düzenleme modundaysa mevcut altın verilerini yükle
  useEffect(() => {
    if (isEditMode && editAccount?.goldHoldings) {
      const holdings = editAccount.goldHoldings;
      Object.keys(holdings).forEach((goldType: string) => {
        const typeHoldings = holdings[goldType as GoldType];
        if (typeHoldings && typeHoldings.length > 0) {
          const totalQuantity = typeHoldings.reduce((sum: number, holding: GoldHolding) => sum + holding.quantity, 0);
          setGoldQuantities(prev => ({
            ...prev,
            [goldType as GoldType]: totalQuantity.toString()
          }));
        }
      });
    }
  }, [isEditMode, editAccount]);

  useEffect(() => {
    if (!isEditMode && selectedType === AccountType.CREDIT_CARD) {
      setIsPositiveBalance(false);
      setInterestRate('');
    }
  }, [selectedType, isEditMode]);

  useEffect(() => {
    if (selectedType === AccountType.CREDIT_CARD && creditLimit) {
      const limitNum = parseFloat(creditLimit.replace(',', '.'));
      if (!isNaN(limitNum)) {
        const rates = getCreditCardInterestRatesByLimit(limitNum);
        setInterestRate(rates.regular.toString());
        setMinPaymentRate((getMinPaymentRate() * 100).toString());
      }
    } else if (selectedType === AccountType.CREDIT_CARD && !creditLimit) {
      setInterestRate('');
    } else if (selectedType !== AccountType.CREDIT_CARD) {
      setInterestRate('');
      setMinPaymentRate('');
    }
  }, [creditLimit, selectedType]);

  const formatBalanceInput = (value: string) => {
    return formatInput(value);
  };

  const getFinalBalance = () => {
    const absValue = parseFloat(initialBalance.replace(',', '.')) || 0;
    return isPositiveBalance ? absValue : -absValue;
  };

  const getBalanceDescription = () => {
    switch (selectedType) {
      case AccountType.GOLD:
        return 'Sahip olduğunuz altın miktarlarını türlerine göre girin.';
      default:
        return 'Hesabın başlangıç bakiyesini giriniz.';
    }
  };

  const handleTypeChange = (type: AccountType) => {
    setSelectedType(type);
    if (type === AccountType.CREDIT_CARD) {
      setIsPositiveBalance(false);
    } else if (!isEditMode) {
      setIsPositiveBalance(true);
    }
  };

  const canBePositive = () => {
    return selectedType !== AccountType.CREDIT_CARD;
  };

  const getTotalGoldValue = () => {
    if (!currentGoldPrices) return 0;
    
    let totalValue = 0;
    Object.entries(goldQuantities).forEach(([goldType, quantity]) => {
      if (quantity && parseFloat(quantity) > 0) {
        const price = currentGoldPrices.prices[goldType as GoldType];
        totalValue += parseFloat(quantity) * price;
      }
    });
    
    return totalValue;
  };

  const hasValidGoldQuantities = () => {
    return Object.values(goldQuantities).some(quantity => 
      quantity.trim() !== '' && parseFloat(quantity) > 0
    );
  };

  // Validation helper functions
  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const getValidationError = (): { title: string; message: string } | null => {
    // Hesap adı kontrolü
    if (!accountName.trim()) {
      return {
        title: 'Hesap Adı Gerekli',
        message: 'Lütfen hesabınız için bir ad giriniz. Bu isim hesaplarınız arasında ayırt etmenizi sağlayacak.'
      };
    }

    // Hesap türüne göre validasyon
    if (selectedType === AccountType.GOLD) {
      if (!hasValidGoldQuantities()) {
        return {
          title: 'Altın Miktarı Gerekli',
          message: 'En az bir altın türü için geçerli bir miktar giriniz. Gram altın, çeyrek, yarım veya tam altın miktarlarından birini belirtmelisiniz.'
        };
      }
      if (!currentGoldPrices) {
        return {
          title: 'Altın Fiyatları Yükleniyor',
          message: 'Altın fiyatları henüz yüklenmedi. Lütfen birkaç saniye bekleyip tekrar deneyiniz.'
        };
      }
    } else if (selectedType === AccountType.CREDIT_CARD) {
      if (!creditLimit.trim() || parseFloat(creditLimit) <= 0) {
        return {
          title: 'Kredi Kartı Limiti Gerekli',
          message: 'Kredi kartınızın limitini giriniz. Bu limit bankanızın size verdiği maksimum harcama tutarıdır.'
        };
      }
      const limit = parseFloat(creditLimit);
      const debt = parseFloat(currentDebt) || 0;
      if (debt > limit) {
        return {
          title: 'Borç Limitten Fazla',
          message: `Mevcut borç (${currencySymbol}${debt.toLocaleString('tr-TR')}) kredi kartı limitinden (${currencySymbol}${limit.toLocaleString('tr-TR')}) fazla olamaz.`
        };
      }
    } else {
      // Diğer hesap türleri için bakiye kontrolü
      if (!initialBalance.trim()) {
        return {
          title: 'Başlangıç Bakiyesi Gerekli',
          message: 'Hesabınızın başlangıç bakiyesini giriniz. Bu tutarı daha sonra işlemler ekleyerek değiştirebilirsiniz.'
        };
      }
    }

    return null;
  };

  const isFormValid = (): boolean => {
    return getValidationError() === null;
  };

  const handleCreateOrUpdateAccount = async () => {
    // Validasyon kontrolü
    const validationError = getValidationError();
    if (validationError) {
      showAlert('error', validationError.title, validationError.message);
      return;
    }

    setLoading(true);

    try {
      let finalBalance = 0;
      let goldHoldings: GoldHoldings | undefined = undefined;

      if (selectedType === AccountType.GOLD && currentGoldPrices) {
        goldHoldings = {};
        const now = new Date();
        
        Object.entries(goldQuantities).forEach(([goldType, quantity]) => {
          if (quantity && parseFloat(quantity) > 0) {
            const goldTypeKey = goldType as GoldType;
            const currentPrice = currentGoldPrices.prices[goldTypeKey];
            
            goldHoldings![goldTypeKey] = [{
              type: goldTypeKey,
              quantity: parseFloat(quantity),
              initialPrice: currentPrice,
              purchaseDate: now
            }];
          }
        });
        
        finalBalance = getTotalGoldValue(); // Altın hesapları için toplam değer
      } else if (selectedType === AccountType.CREDIT_CARD) {
        // Kredi kartı için balance = -currentDebt (borç negatif bakiye olarak)
        finalBalance = -(parseFloat(currentDebt) || 0);
      } else {
        // Diğer hesap türleri için normal balance calculation
        finalBalance = getFinalBalance();
      }

      const accountTypeDetails = ACCOUNT_TYPES.find(t => t.type === selectedType);

      const accountData = {
        name: accountName,
        type: selectedType,
        balance: finalBalance,
        initialBalance: finalBalance, // Tüm hesap türleri için aynı olacak
        color: selectedColor,
        icon: accountTypeDetails?.icon || 'wallet',
        includeInTotalBalance,
        goldHoldings,
        // Kredi kartı alanları
        ...(selectedType === AccountType.CREDIT_CARD && {
          limit: parseFloat(creditLimit) || 0,
          currentDebt: parseFloat(currentDebt) || 0,
          statementDay: parseInt(statementDay) || 1,
          dueDay: parseInt(dueDay) || 10,
          interestRate: parseFloat(interestRate) || 0,
          minPaymentRate: parseFloat(minPaymentRate) / 100 || 0.20,
        }),
      };

      if (isEditMode && editAccount) {
        const updateData = {
          ...accountData,
          id: editAccount.id,
        };
        await viewModel?.updateAccountInfo(updateData);
      } else {
        await viewModel?.createAccount(accountData as CreateAccountRequest);
      }

      setLoading(false);
      showAlert('success', 
        isEditMode ? 'Hesap Güncellendi' : 'Hesap Oluşturuldu', 
        isEditMode ? 'Hesap bilgileri başarıyla güncellendi.' : 'Yeni hesap başarıyla oluşturuldu.'
      );
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setLoading(false);
      console.error('Hesap işlemi başarısız:', error);
      showAlert('error', 
        'İşlem Başarısız', 
        isEditMode ? 'Hesap güncellenirken bir hata oluştu. Lütfen tekrar deneyiniz.' : 'Hesap oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.'
      );
    }
  };

  const renderGoldTypeInput = (goldTypeInfo: typeof GOLD_TYPES[0]) => {
    const quantity = goldQuantities[goldTypeInfo.type];
    const currentPrice = currentGoldPrices?.prices[goldTypeInfo.type] || 0;
    const value = quantity && parseFloat(quantity) > 0 ? parseFloat(quantity) * currentPrice : 0;

    return (
      <View key={goldTypeInfo.type} style={styles.goldTypeContainer}>
        <View style={styles.goldTypeHeader}>
          <Ionicons name={goldTypeInfo.icon as any} size={20} color="#FFD700" />
          <Text style={styles.goldTypeLabel}>{goldTypeInfo.label}</Text>
          {currentPrice > 0 && (
            <Text style={styles.goldTypePrice}>
              {currencySymbol}{currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>
        
        <View style={styles.goldInputRow}>
          <View style={styles.goldInputContainer}>
            <TextInput
              style={styles.goldInput}
              value={quantity}
              onChangeText={(value) => {
                setGoldQuantities(prev => ({
                  ...prev,
                  [goldTypeInfo.type]: value
                }));
              }}
              placeholder="0"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.goldUnit}>{goldTypeInfo.unit}</Text>
          </View>
          
          {value > 0 && (
            <Text style={styles.goldValue}>
              = {currencySymbol}{value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderBalanceInput = () => {
    if (selectedType === AccountType.GOLD) {
      return (
        <View>
          <Text style={styles.label}>Altın Miktarları</Text>
          <Text style={styles.goldDescription}>
            Sahip olduğunuz altınları türlerine göre ayrı ayrı giriniz
          </Text>
          
          {GOLD_TYPES.map(goldTypeInfo => renderGoldTypeInput(goldTypeInfo))}
          
          {currentGoldPrices && getTotalGoldValue() > 0 && (
            <View style={styles.totalValueContainer}>
              <Text style={styles.totalValueLabel}>Toplam Değer:</Text>
              <Text style={styles.totalValueAmount}>
                {currencySymbol}{getTotalGoldValue().toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    return (
      <View>
        <Text style={styles.label}>Bakiye</Text>
        <View style={styles.balanceInputContainer}>
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
            placeholder="0.00"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
    );
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
    <>
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

        {/* Initial Balance / Gold Grams - Kredi kartı için gösterilmez */}
        {selectedType !== AccountType.CREDIT_CARD && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedType === AccountType.GOLD ? 'Altın Miktarı' : 'Başlangıç Bakiyesi'}
            </Text>
            <Text style={styles.balanceDescription}>{getBalanceDescription()}</Text>
            
            {renderBalanceInput()}
          </Card>
        )}

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

        {/* Kredi kartı için ek alanlar */}
        {selectedType === AccountType.CREDIT_CARD && (
          <>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Kredi Kartı Bilgileri</Text>
              
              {/* Kart Limiti */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="card" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.fieldTitle}>Kart Limiti</Text>
                </View>
                <Text style={styles.fieldDescription}>
                  Bankanızın size verdiği maksimum harcama limiti (faiz oranı buna göre belirlenir)
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.modernInput}
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    placeholder="Örnek: 50000"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>₺</Text>
                </View>
              </View>

              {/* Mevcut Borç */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="wallet" size={20} color={COLORS.ERROR} />
                  <Text style={styles.fieldTitle}>Mevcut Borç</Text>
                </View>
                <Text style={styles.fieldDescription}>
                  Şu anda kredi kartınızda ödenecek borç tutarı
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.modernInput}
                    value={currentDebt}
                    onChangeText={(value) => {
                      const clean = value.replace(/[^0-9.,]/g, '');
                      setCurrentDebt(clean);
                    }}
                    placeholder="Örnek: 5000"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputSuffix}>₺</Text>
                </View>
              </View>

              {/* Ekstre Günü */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="calendar" size={20} color={COLORS.WARNING} />
                  <Text style={styles.fieldTitle}>Ekstre Kesim Günü</Text>
                </View>
                <Text style={styles.fieldDescription}>
                  Her ay hangi gün ekstreniz kesiliyor? (1-30 arası)
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.modernInput}
                    value={statementDay}
                    onChangeText={setStatementDay}
                    placeholder="Örnek: 15"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>. gün</Text>
                </View>
              </View>

              {/* Son Ödeme Günü */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="alarm" size={20} color={COLORS.ERROR} />
                  <Text style={styles.fieldTitle}>Son Ödeme Günü</Text>
                </View>
                <Text style={styles.fieldDescription}>
                  Her ay hangi güne kadar borcunuzu ödemeniz gerek? (1-30 arası)
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.modernInput}
                    value={dueDay}
                    onChangeText={setDueDay}
                    placeholder="Örnek: 10"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>. gün</Text>
                </View>
              </View>

              {/* Faiz Oranı - Otomatik */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="trending-up" size={20} color={COLORS.SUCCESS} />
                  <Text style={styles.fieldTitle}>Aylık Faiz Oranı</Text>
                  <View style={styles.autoTag}>
                    <Text style={styles.autoTagText}>Otomatik</Text>
                  </View>
                </View>
                <Text style={styles.fieldDescription}>
                  {getInterestRateDescription()}
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.modernInput, styles.disabledInput]}
                    value={interestRate}
                    editable={false}
                    placeholder={creditLimit ? `${interestRate || 'Hesaplanıyor...'}` : 'Önce limit girin'}
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
              </View>

              {/* Asgari Ödeme Oranı - Otomatik */}
              <View style={styles.creditCardField}>
                <View style={styles.fieldHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.SUCCESS} />
                  <Text style={styles.fieldTitle}>Asgari Ödeme Oranı</Text>
                  <View style={styles.autoTag}>
                    <Text style={styles.autoTagText}>Sabit</Text>
                  </View>
                </View>
                <Text style={styles.fieldDescription}>
                  Yasal olarak minimum %20 (değiştirilemez)
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.modernInput, styles.disabledInput]}
                    value={minPaymentRate}
                    editable={false}
                    placeholder="20"
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
              </View>
            </Card>
          </>
        )}

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
                  {goldQuantities[GoldType.GRAM] ? `${parseFloat(goldQuantities[GoldType.GRAM])} gram` : '0 gram'}
                </Text>
                <Text style={styles.previewGoldValue}>
                  {goldQuantities[GoldType.GRAM] 
                    ? `${currencySymbol}${getTotalGoldValue().toLocaleString('tr-TR')}`
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
            (!isFormValid() || loading) && styles.createButtonDisabled
          ]}
          onPress={() => {
            // Validation kontrolü ve alert gösterimi
            const validationError = getValidationError();
            if (validationError) {
              showAlert('warning', validationError.title, validationError.message);
            } else {
              handleCreateOrUpdateAccount();
            }
          }}
          disabled={loading}
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

    {/* Custom Alert */}
    <CustomAlert
      visible={alertVisible}
      type={alertType}
      title={alertTitle}
      message={alertMessage}
      onPrimaryPress={() => setAlertVisible(false)}
      onClose={() => setAlertVisible(false)}
    />
    </>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.BACKGROUND,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginVertical: SPACING.md,
    backgroundColor: 'transparent',
    padding: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  creditCardInput: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  creditCardField: {
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE + '80',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  fieldTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  fieldDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  modernInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  inputSuffix: {
    paddingHorizontal: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  autoTag: {
    backgroundColor: COLORS.SUCCESS + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
  },
  autoTagText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.SUCCESS,
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#2A2A2A',
    color: COLORS.TEXT_SECONDARY,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 0,
    borderRadius: 16,
    marginBottom: SPACING.sm,
  },
  selectedTypeCard: {
    backgroundColor: COLORS.PRIMARY + '20',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  typeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.BORDER,
    paddingBottom: SPACING.sm,
  },
  balanceInput: {
    flex: 1,
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.sm,
  },
  currencySymbol: {
    fontSize: isSmallDevice ? 28 : 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.sm,
  },
  balancePreview: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectedColorOption: {
    borderWidth: 4,
    borderColor: COLORS.WHITE,
    transform: [{ scale: 1.1 }],
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  previewCard: {
    padding: SPACING.lg,
    borderRadius: 20,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  previewIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  previewType: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  previewGoldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBalance: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.WHITE,
    textAlign: 'right',
  },
  previewGoldValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.BACKGROUND,
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY + '40',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.WHITE,
    letterSpacing: 0.5,
  },
  balanceDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
    fontWeight: '500',
    lineHeight: 20,
  },
  signToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  signToggleText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '800',
    color: COLORS.WHITE,
  },
  signToggleButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  includeBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
  },
  includeBalanceLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  includeBalanceLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  includeBalanceDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
    padding: SPACING.md,
  },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryItem: {
    marginBottom: SPACING.md,
  },
  oldGoldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  goldIcon: {
    marginRight: SPACING.sm,
  },
  oldGoldInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.md,
  },
  oldGoldUnit: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  valuePreviewContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    alignItems: 'center',
  },
  valuePreviewText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  valuePreviewAmount: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  goldTypeContainer: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  goldTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  goldTypeLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  goldTypePrice: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#FFD700',
    fontWeight: '600',
  },
  goldInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    flex: 1,
    marginRight: SPACING.md,
  },
  goldInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 40,
  },
  goldUnit: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  goldValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: '#FFD700',
    fontWeight: '600',
  },
  goldDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  totalValueContainer: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: '#FFD700',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  totalValueLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.BLACK,
    marginBottom: SPACING.xs,
  },
  totalValueAmount: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '800',
    color: COLORS.BLACK,
  },
});

export default AddAccountScreen; 