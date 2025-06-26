import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import CustomAlert, { AlertType } from '../components/common/CustomAlert';

import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/ui';
import { Account, AccountType } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import {
  calculateMinPayment,
  getCreditCardInterestRates,
} from '../utils/creditCard';

interface CreditCardPaymentScreenProps {
  navigation: any;
  route?: {
    params?: {
      creditCard: Account;
    };
  };
}

const CreditCardPaymentScreen: React.FC<CreditCardPaymentScreenProps> = observer(({ 
  navigation, 
  route 
}) => {
  const { user } = useAuth();
  const [accountViewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);
  const { currencySymbol } = useCurrency();

  const creditCard = route?.params?.creditCard;
  
  if (!creditCard || creditCard.type !== AccountType.CREDIT_CARD) {
    navigation.goBack();
    return null;
  }

  // State
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [paymentType, setPaymentType] = useState<'minimum' | 'full' | 'custom'>('minimum');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Custom Alert helper
  const showAlert = (type: AlertType, title: string, message: string, action?: () => void) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setConfirmAction(action ? () => action : null);
    setAlertVisible(true);
  };

  // Load accounts
  useEffect(() => {
    if (accountViewModel) {
      accountViewModel.loadAccounts();
    }
  }, [accountViewModel]);

  // Hesaplamalar
  const currentDebt = creditCard.currentDebt || 0;
  const minPayment = calculateMinPayment(currentDebt);
  
  // Ödeme hesapları
  const paymentAccounts = accountViewModel?.accounts.filter(acc => 
    acc.type !== AccountType.CREDIT_CARD && 
    acc.isActive && 
    acc.balance > 0
  ) || [];

  // Ödeme tutarını al
  const getAmount = () => {
    if (paymentType === 'minimum') return minPayment;
    if (paymentType === 'full') return currentDebt;
    return parseFloat(amount.replace(',', '.')) || 0;
  };

  // Validation kontrolü
  const isFormValid = () => {
    if (!selectedAccount) return false;
    if (paymentType === 'custom' && (!amount || parseFloat(amount.replace(',', '.')) <= 0)) return false;
    const paymentAmount = getAmount();
    if (paymentAmount <= 0) return false;
    if (paymentAmount > (selectedAccount?.balance || 0)) return false;
    return true;
  };

  // Ödeme yap veya validation uyarısı göster
  const handlePayment = async () => {
    // Validation kontrolleri
    if (!selectedAccount) {
      showAlert('warning', 'Eksik Bilgi', 'Lütfen ödeme yapılacak hesabı seçin');
      return;
    }

    const paymentAmount = getAmount();
    
    if (paymentType === 'custom' && (!amount || parseFloat(amount.replace(',', '.')) <= 0)) {
      showAlert('warning', 'Eksik Bilgi', 'Lütfen geçerli bir ödeme tutarı girin');
      return;
    }
    
    if (paymentAmount <= 0) {
      showAlert('error', 'Hata', 'Geçerli tutar girin');
      return;
    }

    if (paymentAmount > selectedAccount.balance) {
      showAlert('error', 'Yetersiz Bakiye', `Bu hesapta yeterli bakiye bulunmuyor.\n\nMevcut bakiye: ${selectedAccount.balance.toFixed(2)} ${currencySymbol}\nÖdeme tutarı: ${paymentAmount.toFixed(2)} ${currencySymbol}`);
      return;
    }

    setLoading(true);
    
    try {
      if (accountViewModel) {
        await accountViewModel.addCreditCardPayment(
          creditCard.id,
          selectedAccount.id,
          paymentAmount,
          paymentType,
          `${creditCard.name} ödeme`
        );

        showAlert('success', 'Başarılı', 'Ödeme başarıyla yapıldı', () => navigation.goBack());
      }
    } catch (error) {
      showAlert('error', 'Hata', 'Ödeme yapılamadı. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  if (currentDebt === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kredi Kartı Ödemesi</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.noDebtContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.SUCCESS} />
          <Text style={styles.noDebtTitle}>Borç Yok!</Text>
          <Text style={styles.noDebtText}>Bu kredi kartında borç bulunmuyor.</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kredi Kartı Ödemesi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kredi Kartı Bilgisi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kredi Kartı</Text>
          <View style={styles.cardInfo}>
            <View style={[styles.cardIcon, { backgroundColor: creditCard.color }]}>
              <Ionicons name="card" size={24} color="white" />
            </View>
            <View>
              <Text style={styles.cardName}>{creditCard.name}</Text>
              <Text style={styles.debtAmount}>
                Borç: {currentDebt.toFixed(2)} {currencySymbol}
              </Text>
            </View>
          </View>
        </View>

        {/* Ödeme Türü */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ödeme Türü</Text>
          
          {/* Asgari Ödeme */}
          <TouchableOpacity 
            style={[styles.option, paymentType === 'minimum' && styles.selectedOption]}
            onPress={() => setPaymentType('minimum')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Asgari Ödeme</Text>
              <Text style={styles.optionAmount}>{minPayment.toFixed(2)} {currencySymbol}</Text>
            </View>
            {paymentType === 'minimum' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
            )}
          </TouchableOpacity>

          {/* Tam Ödeme */}
          <TouchableOpacity 
            style={[styles.option, paymentType === 'full' && styles.selectedOption]}
            onPress={() => setPaymentType('full')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Tam Ödeme</Text>
              <Text style={styles.optionAmount}>{currentDebt.toFixed(2)} {currencySymbol}</Text>
            </View>
            {paymentType === 'full' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
            )}
          </TouchableOpacity>

          {/* Özel Tutar */}
          <TouchableOpacity 
            style={[styles.option, paymentType === 'custom' && styles.selectedOption]}
            onPress={() => setPaymentType('custom')}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Özel Tutar</Text>
              <Text style={styles.optionAmount}>
                {paymentType === 'custom' && amount ? 
                  `${parseFloat(amount.replace(',', '.')).toFixed(2)} ${currencySymbol}` : 
                  'Tutar girin'
                }
              </Text>
            </View>
            {paymentType === 'custom' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
            )}
          </TouchableOpacity>

          {/* Custom Amount Input */}
          {paymentType === 'custom' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ödeme Tutarı</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="decimal-pad"
              />
            </View>
          )}
        </View>

        {/* Ödeme Hesabı Seçimi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ödeme Hesabı</Text>
          {paymentAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountOption,
                selectedAccount?.id === account.id && styles.selectedAccount
              ]}
              onPress={() => setSelectedAccount(account)}
            >
              <View style={styles.accountContent}>
                <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                  <Ionicons name={account.icon as any} size={20} color="white" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountBalance}>
                    {account.balance.toFixed(2)} {currencySymbol}
                  </Text>
                </View>
                {selectedAccount?.id === account.id && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                )}
              </View>
            </TouchableOpacity>
          ))}
          
          {paymentAccounts.length === 0 && (
            <Text style={styles.noAccountText}>Ödeme yapılabilecek hesap yok</Text>
          )}
        </View>
      </ScrollView>

      {/* Ödeme Butonu - Her zaman görünür */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.payButton, 
            (loading || !isFormValid()) && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={[
              styles.payButtonText,
              !isFormValid() && styles.payButtonTextDisabled
            ]}>
              {isFormValid() ? 
                `Ödeme Yap - ${getAmount().toFixed(2)} ${currencySymbol}` : 
                'Ödeme Yap'
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        primaryButtonText="Tamam"
        onPrimaryPress={() => {
          setAlertVisible(false);
          if (confirmAction) {
            confirmAction();
            setConfirmAction(null);
          }
        }}
        onClose={() => {
          setAlertVisible(false);
          setConfirmAction(null);
        }}
      />
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
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  debtAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: SPACING.xs,
  },
  selectedOption: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  optionAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  inputContainer: {
    marginTop: SPACING.sm,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  accountOption: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: SPACING.xs,
  },
  selectedAccount: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  noAccountText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    padding: SPACING.lg,
  },
  buttonContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  payButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  payButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
  payButtonTextDisabled: {
    color: '#999',
  },
  noDebtContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  noDebtTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  noDebtText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
});

export default CreditCardPaymentScreen; 