import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { AccountType, Account } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { 
  calculateMinPayment, 
  getCreditCardInterestRates,
  calculateMonthlyInterest 
} from '../utils/creditCard';
import { useCurrency } from '../hooks';

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

  const creditCard = route?.params?.creditCard;
  
  if (!creditCard || creditCard.type !== AccountType.CREDIT_CARD) {
    navigation.goBack();
    return null;
  }

  // Form state
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<Account | null>(null);
  const [paymentType, setPaymentType] = useState<'minimum' | 'full' | 'custom'>('minimum');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { currencySymbol, formatInput } = useCurrency();

  // Load accounts
  useEffect(() => {
    if (accountViewModel) {
      accountViewModel.loadAccounts();
    }
  }, [accountViewModel]);

  // Kredi kartı dışındaki diğer hesaplar (ödeme yapılabilecek hesaplar)
  const paymentAccounts = accountViewModel?.accounts.filter(acc => 
    acc.type !== AccountType.CREDIT_CARD && 
    acc.isActive && 
    acc.balance > 0
  ) || [];

  // Hesaplamalar
  const currentDebt = creditCard.currentDebt || 0;
  const minPayment = calculateMinPayment(currentDebt);
  const interestRates = getCreditCardInterestRates(currentDebt);
  const monthlyInterest = calculateMonthlyInterest(currentDebt);



  // Ödeme tutarını hesapla
  const getPaymentAmount = (): number => {
    switch (paymentType) {
      case 'minimum':
        return minPayment;
      case 'full':
        return currentDebt;
      case 'custom':
        return parseFloat(customAmount.replace(',', '.')) || 0;
      default:
        return 0;
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentAccount) {
      Alert.alert('Hata', 'Lütfen ödeme hesabı seçin');
      return;
    }

    const paymentAmount = getPaymentAmount();

    if (paymentAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir ödeme tutarı girin');
      return;
    }

    if (paymentAmount > currentDebt) {
      Alert.alert('Hata', 'Ödeme tutarı mevcut borçtan fazla olamaz');
      return;
    }

    if (paymentAmount > selectedPaymentAccount.balance) {
      Alert.alert('Hata', 'Ödeme hesabında yetersiz bakiye');
      return;
    }

    // Asgari ödeme kontrolü
    if (paymentType === 'custom' && paymentAmount < minPayment && paymentAmount < currentDebt) {
      Alert.alert(
        'Uyarı',
        `Asgari ödeme tutarı ${minPayment.toFixed(2)} ${currencySymbol}. Bu tutardan az ödeme yapmak faiz uygulanmasına neden olabilir. Devam etmek istiyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Devam Et', onPress: () => processPayment(paymentAmount) }
        ]
      );
      return;
    }

    processPayment(paymentAmount);
  };

  const processPayment = async (amount: number) => {
    setLoading(true);

    try {
      if (accountViewModel) {
        await accountViewModel.addCreditCardPayment(
          creditCard.id,
          selectedPaymentAccount!.id,
          amount,
          paymentType,
          `${creditCard.name} borç ödemesi`
        );

        Alert.alert('Başarılı', 'Kredi kartı ödemesi yapıldı', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Kredi kartı ödemesi yapılırken hata:', error);
      Alert.alert('Hata', 'Ödeme yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const PaymentTypeSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Ödeme Türü</Text>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentType === 'minimum' && styles.selectedPaymentOption
        ]}
        onPress={() => setPaymentType('minimum')}
      >
        <View style={styles.paymentOptionHeader}>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>Asgari Ödeme</Text>
            <Text style={styles.paymentOptionSubtitle}>
              {minPayment.toFixed(2)} {currencySymbol} (%{(creditCard.minPaymentRate || 0.20) * 100})
            </Text>
          </View>
          {paymentType === 'minimum' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentType === 'full' && styles.selectedPaymentOption
        ]}
        onPress={() => setPaymentType('full')}
      >
        <View style={styles.paymentOptionHeader}>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>Tüm Borç</Text>
            <Text style={styles.paymentOptionSubtitle}>
              {currentDebt.toFixed(2)} {currencySymbol}
            </Text>
          </View>
          {paymentType === 'full' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentType === 'custom' && styles.selectedPaymentOption
        ]}
        onPress={() => setPaymentType('custom')}
      >
        <View style={styles.paymentOptionHeader}>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>İstediğim Kadar</Text>
            <Text style={styles.paymentOptionSubtitle}>Özel tutar belirle</Text>
          </View>
          {paymentType === 'custom' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
          )}
        </View>
      </TouchableOpacity>

      {paymentType === 'custom' && (
        <View style={styles.customAmountContainer}>
          <Text style={styles.inputLabel}>Ödeme Tutarı ({currencySymbol})</Text>
          <TextInput
            style={styles.amountInput}
            value={customAmount}
            onChangeText={(value) => setCustomAmount(formatInput(value))}
            placeholder="0,00"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            keyboardType="decimal-pad"
          />
        </View>
      )}
    </Card>
  );

  const PaymentAccountSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Ödeme Hesabı Seçin</Text>
      {paymentAccounts.map((account) => {
        const isSelected = selectedPaymentAccount?.id === account.id;
        
        return (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountOption,
              isSelected && styles.selectedAccountOption
            ]}
            onPress={() => setSelectedPaymentAccount(account)}
          >
            <View style={styles.accountOptionHeader}>
              <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                <Ionicons name={account.icon as any} size={20} color="white" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountBalance}>
                  Bakiye: {account.balance.toFixed(2)} {currencySymbol}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      
      {paymentAccounts.length === 0 && (
        <View style={styles.noAccountsContainer}>
          <Text style={styles.noAccountsText}>Ödeme yapılabilecek hesap bulunamadı</Text>
        </View>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kredi Kartı Ödemesi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kredi Kartı Bilgisi */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Kredi Kartı</Text>
          <View style={styles.creditCardInfo}>
            <View style={[styles.cardIcon, { backgroundColor: creditCard.color }]}>
              <Ionicons name="card" size={24} color="white" />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardName}>{creditCard.name}</Text>
              <Text style={styles.cardDebt}>
                Mevcut Borç: {currentDebt.toFixed(2)} {currencySymbol}
              </Text>
              {currentDebt === 0 ? (
                <Text style={styles.noDebtMessage}>
                  ✅ Herhangi bir borcunuz bulunmuyor
                </Text>
              ) : (
                <Text style={styles.cardInterest}>
                  Aylık Faiz: %{interestRates.regular} ({monthlyInterest.toFixed(2)} {currencySymbol})
                </Text>
              )}
            </View>
          </View>
          
          {/* Kredi kartı limit bilgisi */}
          <View style={styles.creditLimitInfo}>
            <Text style={styles.limitText}>
              Limit: {(creditCard.limit || 0).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
            <Text style={styles.availableText}>
              Kullanılabilir: {((creditCard.limit || 0) - currentDebt).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
          </View>
        </Card>

        {/* Ödeme seçenekleri sadece borç varsa göster */}
        {currentDebt > 0 && (
          <>
            <PaymentTypeSelector />
            <PaymentAccountSelector />
          </>
        )}
      </ScrollView>

      {selectedPaymentAccount && currentDebt > 0 && (
        <View style={styles.footer}>
          <View style={styles.paymentSummary}>
            <Text style={styles.summaryText}>
              Ödenecek: {getPaymentAmount().toFixed(2)} {currencySymbol}
            </Text>
            <Text style={styles.summarySubtext}>
              Kalan Borç: {(currentDebt - getPaymentAmount()).toFixed(2)} {currencySymbol}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Ödeniyor...' : 'Ödeme Yap'}
            </Text>
          </TouchableOpacity>
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
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 40,
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
    marginBottom: SPACING.md,
  },
  creditCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardDebt: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
    marginBottom: 2,
  },
  cardInterest: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectedPaymentOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  customAmountContainer: {
    marginTop: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
    textAlign: 'center',
  },
  accountOption: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectedAccountOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  accountOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.SUCCESS,
  },
  noAccountsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  noAccountsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  paymentSummary: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  submitButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  creditLimitInfo: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
  },
  limitText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  availableText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  noDebtMessage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.SUCCESS,
    marginBottom: SPACING.xs,
  },
});

export default CreditCardPaymentScreen; 