import React, { useState, useEffect, useMemo } from 'react';
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
  LayoutAnimation,
  UIManager,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useThemeColors } from '../hooks/useThemeColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const ACCOUNT_TYPES_CONFIG: { [key in AccountType]: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string } } = {
  [AccountType.CASH]: { label: 'Nakit', icon: 'wallet-outline', color: '#2ecc71' },
  [AccountType.DEBIT_CARD]: { label: 'Banka Kartı', icon: 'card-outline', color: '#3498db' },
  [AccountType.CREDIT_CARD]: { label: 'Kredi Kartı', icon: 'card', color: '#e74c3c' },
  [AccountType.SAVINGS]: { label: 'Tasarruf', icon: 'business-outline', color: '#f1c40f' },
  [AccountType.INVESTMENT]: { label: 'Yatırım', icon: 'analytics-outline', color: '#9b59b6' },
  [AccountType.GOLD]: { label: 'Altın', icon: 'diamond-outline', color: '#f39c12' },
};

const GOLD_TYPES_CONFIG: { [key in GoldType]: { label: string; unit: string; } } = {
  [GoldType.GRAM]: { label: 'Gram Altın', unit: 'gr' },
  [GoldType.QUARTER]: { label: 'Çeyrek Altın', unit: 'adet' },
  [GoldType.HALF]: { label: 'Yarım Altın', unit: 'adet' },
  [GoldType.FULL]: { label: 'Tam Altın', unit: 'adet' },
};

const ACCOUNT_COLORS = [
  '#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c', 
  '#e67e22', '#34495e', '#d35400', '#27ae60', '#c0392b', '#8e44ad'
];

const AddAccountScreen: React.FC<AddAccountScreenProps> = observer(({ navigation, route }) => {
  const { user } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { currencySymbol, formatInput, parseInput } = useCurrency();
  const [viewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);

  const editAccount = route?.params?.editAccount;
  const isEditMode = !!editAccount;

  const [step, setStep] = useState<'selectType' | 'details'>(isEditMode ? 'details' : 'selectType');
  const [selectedType, setSelectedType] = useState<AccountType>(editAccount?.type || AccountType.DEBIT_CARD);
  
  // Form State
  const [accountName, setAccountName] = useState(editAccount?.name || '');
  const [initialBalance, setInitialBalance] = useState(editAccount ? formatInput(String(Math.abs(editAccount.balance))) : '');
  const [selectedColor, setSelectedColor] = useState(editAccount?.color || ACCOUNT_TYPES_CONFIG[AccountType.DEBIT_CARD].color);
  const [includeInTotal, setIncludeInTotal] = useState(editAccount?.includeInTotalBalance ?? true);

  // Credit Card State
  const [creditLimit, setCreditLimit] = useState(editAccount?.limit ? formatInput(String(editAccount.limit)) : '');
  const [currentDebt, setCurrentDebt] = useState(editAccount?.currentDebt ? formatInput(String(editAccount.currentDebt)) : '0');
  const [statementDay, setStatementDay] = useState(editAccount?.statementDay?.toString() || '1');
  const [dueDay, setDueDay] = useState(editAccount?.dueDay?.toString() || '10');
  const [interestRate, setInterestRate] = useState(editAccount?.interestRate?.toString() || '');

  // Gold State
  const [goldQuantities, setGoldQuantities] = useState<{[key in GoldType]: string}>({
    [GoldType.GRAM]: '', [GoldType.QUARTER]: '', [GoldType.HALF]: '', [GoldType.FULL]: ''
  });
  const [goldPrices, setGoldPrices] = useState<AllGoldPricesData | null>(null);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({ visible: false, type: 'error', title: '', message: '' });

  useEffect(() => {
    if (selectedType === AccountType.GOLD && !goldPrices) {
      const goldService = GoldPriceService.getInstance();
      goldService.getAllGoldPrices().then(setGoldPrices).catch(err => {
        console.error("Altın fiyatları alınamadı:", err);
        showAlert('error', 'Hata', 'Altın fiyatları alınırken bir sorun oluştu.');
      });
    }
  }, [selectedType, goldPrices]);

  useEffect(() => {
    if (isEditMode && editAccount?.type === AccountType.GOLD && editAccount.goldHoldings) {
        const initialQuantities = { ...goldQuantities };
        for (const key in editAccount.goldHoldings) {
            const goldType = key as GoldType;
            const holding = editAccount.goldHoldings[goldType];
            if(holding && holding.length > 0) {
              initialQuantities[goldType] = formatInput(String(holding[0].quantity));
            }
        }
        setGoldQuantities(initialQuantities);
    }
  }, [isEditMode, editAccount]);
  
  const totalGoldValue = useMemo(() => {
    if (selectedType !== AccountType.GOLD || !goldPrices) return 0;
    return Object.entries(goldQuantities).reduce((total, [key, quantityStr]) => {
      const quantity = parseInput(quantityStr);
      const price = goldPrices.prices[key as GoldType] || 0;
      return total + (quantity * price);
    }, 0);
  }, [goldQuantities, goldPrices, selectedType]);

  useEffect(() => {
    if (selectedType === AccountType.CREDIT_CARD && creditLimit) {
      const limitNum = parseInput(creditLimit);
      if (limitNum > 0) {
        const rates = getCreditCardInterestRatesByLimit(limitNum);
        setInterestRate(rates.regular.toString());
      }
    }
  }, [creditLimit, selectedType]);

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
  };

  const handleTypeSelect = (type: AccountType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedType(type);
    setStep('details');
    if (!isEditMode) {
      setAccountName('');
      setInitialBalance('');
      setCreditLimit('');
      setCurrentDebt('0');
      setGoldQuantities({ [GoldType.GRAM]: '', [GoldType.QUARTER]: '', [GoldType.HALF]: '', [GoldType.FULL]: '' });
      setSelectedColor(ACCOUNT_TYPES_CONFIG[type].color);
    }
  };

  const handleSave = async () => {
    if (!user || !viewModel) return showAlert('error', 'Hata', 'Kullanıcı bilgisi bulunamadı.');
    if (!accountName.trim()) return showAlert('warning', 'Eksik Bilgi', 'Lütfen hesap adını girin.');
    
    setLoading(true);

    const commonData = {
      name: accountName.trim(),
      type: selectedType,
      color: selectedColor,
      includeInTotalBalance: includeInTotal,
      icon: ACCOUNT_TYPES_CONFIG[selectedType].icon,
    };

    let data: CreateAccountRequest;

    if (selectedType === AccountType.CREDIT_CARD) {
      const limit = parseInput(creditLimit);
      if (limit <= 0) {
        setLoading(false);
        return showAlert('warning', 'Geçersiz Değer', 'Kredi kartı limiti pozitif bir değer olmalıdır.');
      }
      const validStatementDay = validateAndAdjustCreditCardDay(parseInt(statementDay, 10));
      const validDueDay = validateAndAdjustCreditCardDay(parseInt(dueDay, 10));

      if (validStatementDay >= validDueDay) {
        showAlert('info', 'Bilgilendirme', 'Son ödeme günü, hesap kesim gününden sonra olmalıdır.');
      }
      
      data = {
        ...commonData,
        initialBalance: -Math.abs(parseInput(currentDebt)),
        limit: limit,
        currentDebt: parseInput(currentDebt),
        statementDay: validStatementDay,
        dueDay: validDueDay,
        interestRate: parseFloat(interestRate) || getCreditCardInterestRatesByLimit(limit).regular,
        minPaymentRate: getMinPaymentRate(),
      };
    } else if (selectedType === AccountType.GOLD) {
        if (totalGoldValue <= 0) {
            setLoading(false);
            return showAlert('warning', 'Geçersiz Değer', 'Lütfen en az bir altın türü için miktar girin.');
        }
        const goldHoldings: GoldHoldings = {};
        Object.entries(goldQuantities).forEach(([key, quantityStr]) => {
            const quantity = parseInput(quantityStr);
            if (quantity > 0 && goldPrices) {
                goldHoldings[key as GoldType] = [{
                    type: key as GoldType,
                    quantity: quantity,
                    initialPrice: goldPrices.prices[key as GoldType],
                    purchaseDate: new Date()
                }];
            }
        });
        data = {
            ...commonData,
            initialBalance: totalGoldValue,
            goldHoldings: goldHoldings
        }

    } else {
      data = {
        ...commonData,
        initialBalance: parseInput(initialBalance),
      };
    }
    
    try {
      if (isEditMode) {
        await viewModel.updateAccount({ ...editAccount, ...data, id: editAccount.id });
      } else {
        await viewModel.createAccount(data);
      }
      showAlert('success', 'Başarılı', `Hesap başarıyla ${isEditMode ? 'güncellendi' : 'oluşturuldu'}.`);
    } catch (error) {
      console.error("Hesap kaydetme hatası:", error);
      showAlert('error', 'Hata', 'İşlem sırasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (text: string) => {
    setter(formatInput(text));
  };

  const handleGoldQuantityChange = (type: GoldType) => (text: string) => {
    setGoldQuantities(prev => ({...prev, [type]: formatInput(text)}));
  }
  
  const headerTitle = useMemo(() => {
    if (step === 'selectType') return 'Hesap Türü Seçin';
    return isEditMode ? 'Hesabı Düzenle' : 'Hesap Detayları';
  }, [step, isEditMode]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 15 }]}>
      {step === 'details' && !isEditMode ? (
        <TouchableOpacity style={styles.backButton} onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setStep('selectType');
        }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <Text style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderSelectTypeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Hangi türde hesap eklemek istersiniz?</Text>
      <View style={styles.typeGrid}>
        {Object.entries(ACCOUNT_TYPES_CONFIG).map(([key, config]) => (
          <TouchableOpacity key={key} style={styles.typeCard} onPress={() => handleTypeSelect(key as AccountType)}>
            <View style={[styles.typeIconContainer, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon} size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.typeLabel, { color: colors.text }]}>{config.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGoldInputs = () => (
    <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>Altın Miktarları</Text>
        {Object.entries(GOLD_TYPES_CONFIG).map(([key, config]) => {
            const type = key as GoldType;
            const price = goldPrices?.prices[type] || 0;
            return (
                <View key={type} style={styles.goldInputRow}>
                    <Text style={[styles.goldLabel, { color: colors.textSecondary }]}>{config.label}</Text>
                    <View style={[styles.goldInputContainer, {backgroundColor: colors.card, borderColor: colors.border}]}>
                        <TextInput
                            style={[styles.input, styles.goldInput, { color: colors.text }]}
                            value={goldQuantities[type]}
                            onChangeText={handleGoldQuantityChange(type)}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                        />
                        <Text style={[styles.goldUnit, { color: colors.textSecondary }]}>{config.unit}</Text>
                    </View>
                    <Text style={[styles.goldPrice, { color: colors.primary }]}>{formatInput(String(price))}{currencySymbol}</Text>
                </View>
            )
        })}
        {totalGoldValue > 0 && (
            <View style={styles.totalGoldContainer}>
                <Text style={[styles.totalGoldLabel, { color: colors.text }]}>Toplam Değer:</Text>
                <Text style={[styles.totalGoldValue, { color: colors.primary }]}>{currencySymbol}{formatInput(String(totalGoldValue))}</Text>
            </View>
        )}
    </View>
  );

  const renderDetailsStep = () => {
    const config = ACCOUNT_TYPES_CONFIG[selectedType];
    return (
      <View style={styles.stepContainer}>
        <View style={styles.detailsHeader}>
          <View style={[styles.typeIconContainer, { backgroundColor: config.color, marginRight: 15 }]}>
            <Ionicons name={config.icon} size={28} color="#FFFFFF" />
          </View>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>{config.label} Hesabı</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Hesap Adı</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Örn: Maaş Hesabım, Cüzdanım"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {selectedType === AccountType.CREDIT_CARD ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Kart Limiti</Text>
              <TextInput
                style={[styles.input, styles.amountInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={creditLimit}
                onChangeText={handleAmountChange(setCreditLimit)}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Güncel Borç</Text>
              <TextInput
                style={[styles.input, styles.amountInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                value={currentDebt}
                onChangeText={handleAmountChange(setCurrentDebt)}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
             <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Hesap Kesim Günü</Text>
                 <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={statementDay}
                  onChangeText={setStatementDay}
                  placeholder="Ayın Günü (1-28)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Son Ödeme Günü</Text>
                 <TextInput
                  style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={dueDay}
                  onChangeText={setDueDay}
                  placeholder="Ayın Günü (1-28)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          </>
        ) : selectedType === AccountType.GOLD ? (
            renderGoldInputs()
        ) : (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Başlangıç Bakiyesi</Text>
            <View style={[styles.balanceInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.currencySymbol, {color: colors.text}]}>{currencySymbol}</Text>
               <TextInput
                style={[styles.input, styles.balanceInput, { color: colors.text }]}
                value={initialBalance}
                onChangeText={handleAmountChange(setInitialBalance)}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 10 }]}>Hesap Rengi</Text>
          <View style={styles.colorGrid}>
            {ACCOUNT_COLORS.map(color => (
              <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }]} onPress={() => setSelectedColor(color)}>
                {selectedColor === color && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Toplam bakiyede göster</Text>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background ? colors.background : "#fff"}
            ios_backgroundColor={colors.border}
            onValueChange={setIncludeInTotal}
            value={includeInTotal}
          />
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {renderHeader()}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'selectType' ? renderSelectTypeStep() : renderDetailsStep()}
      </ScrollView>

       {step === 'details' && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{isEditMode ? 'Güncelle' : 'Hesabı Oluştur'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onPrimaryPress={() => {
          setAlert({ ...alert, visible: false });
          if (alert.type === 'success') {
            navigation.goBack();
          }
        }}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: (width - 60) / 2,
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  typeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  balanceInput: {
    flex: 1,
    height: '100%',
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  goldInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
  },
  goldLabel: {
      flex: 2,
      fontSize: 15,
      fontWeight: '500',
  },
  goldInputContainer: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      height: 45,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
  },
  goldInput: {
      flex: 1,
      height: '100%',
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      borderWidth: 0,
      paddingHorizontal: 0,
  },
  goldUnit: {
      fontSize: 14,
      marginLeft: 5,
  },
  goldPrice: {
      flex: 2,
      textAlign: 'right',
      fontSize: 14,
      fontWeight: '600',
  },
  totalGoldContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderColor: '#e0e0e0'
  },
  totalGoldLabel: {
      fontSize: 16,
      fontWeight: 'bold',
  },
  totalGoldValue: {
      fontSize: 16,
      fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddAccountScreen; 