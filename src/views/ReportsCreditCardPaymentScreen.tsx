import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  Dimensions,
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

const { width } = Dimensions.get('window');

interface ReportsCreditCardPaymentScreenProps {
  navigation: any;
  route?: {
    params?: {
      creditCard: Account;
    };
  };
}

const ReportsCreditCardPaymentScreen: React.FC<ReportsCreditCardPaymentScreenProps> = observer(({ 
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
          `${creditCard.name} borç ödemesi (Raporlar)`
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
            <Text style={styles.paymentOptionTitle}>Özel Tutar</Text>
            <Text style={styles.paymentOptionSubtitle}>
              İstediğiniz tutarı belirleyin
            </Text>
          </View>
          {paymentType === 'custom' && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
          )}
        </View>
        
        {paymentType === 'custom' && (
          <View style={styles.customAmountContainer}>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={(value) => {
                const formatted = formatInput(value);
                setCustomAmount(formatted);
              }}
              placeholder="Ödeme tutarını girin"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="decimal-pad"
            />
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );

  const PaymentAccountSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Ödeme Hesabı</Text>
      {paymentAccounts.length === 0 ? (
        <View style={styles.noAccountsContainer}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.noAccountsText}>
            Ödeme yapabileceğiniz hesap bulunmuyor
          </Text>
          <Text style={styles.noAccountsSubtext}>
            Aktif hesabınızda yeterli bakiye bulunmuyor
          </Text>
        </View>
      ) : (
        <View style={styles.accountsList}>
          {paymentAccounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountOption,
                selectedPaymentAccount?.id === account.id && styles.selectedAccountOption
              ]}
              onPress={() => setSelectedPaymentAccount(account)}
            >
              <View style={styles.accountOptionLeft}>
                <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                  <Ionicons 
                    name={account.icon as any} 
                    size={20} 
                    color="white" 
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountBalance}>
                    Bakiye: {account.balance.toFixed(2)} {currencySymbol}
                  </Text>
                </View>
              </View>
              {selectedPaymentAccount?.id === account.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );

  const CreditCardInfo = () => (
    <Card style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: creditCard.color }]}>
          <Ionicons name={creditCard.icon as any} size={24} color="white" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{creditCard.name}</Text>
          <Text style={styles.cardSubtitle}>Kredi Kartı Ödeme (Raporlar)</Text>
        </View>
      </View>

      <View style={styles.debtInfoContainer}>
        <View style={styles.debtInfoRow}>
          <Text style={styles.debtLabel}>Mevcut Borç:</Text>
          <Text style={styles.debtAmount}>
            {currentDebt.toFixed(2)} {currencySymbol}
          </Text>
        </View>
        
        {currentDebt === 0 ? (
          <View style={styles.noDebtContainer}>
            <Text style={styles.noDebtMessage}>
              ✅ Herhangi bir borcunuz bulunmuyor
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.debtInfoRow}>
              <Text style={styles.debtLabel}>Asgari Ödeme:</Text>
              <Text style={styles.minPaymentAmount}>
                {minPayment.toFixed(2)} {currencySymbol}
              </Text>
            </View>

            <View style={styles.debtInfoRow}>
              <Text style={styles.debtLabel}>Aylık Faiz:</Text>
              <Text style={styles.interestAmount}>
                ~{monthlyInterest.toFixed(2)} {currencySymbol}
              </Text>
            </View>

            <View style={styles.debtInfoRow}>
              <Text style={styles.debtLabel}>Faiz Oranı:</Text>
              <Text style={styles.interestRate}>
                %{((creditCard.interestRate || 0) * 100).toFixed(2)}
              </Text>
            </View>
          </>
        )}
        
        {/* Kredi kartı limit bilgisi */}
        <View style={styles.limitInfoContainer}>
          <View style={styles.debtInfoRow}>
            <Text style={styles.debtLabel}>Limit:</Text>
            <Text style={styles.limitAmount}>
              {(creditCard.limit || 0).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
          </View>
          <View style={styles.debtInfoRow}>
            <Text style={styles.debtLabel}>Kullanılabilir:</Text>
            <Text style={styles.availableAmount}>
              {((creditCard.limit || 0) - currentDebt).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
          </View>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Kredi Kartı Ödeme</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreditCardInfo />
        
        {/* Ödeme seçenekleri sadece borç varsa göster */}
        {currentDebt > 0 && (
          <>
            <PaymentTypeSelector />
            <PaymentAccountSelector />

            {/* Payment Summary */}
            {selectedPaymentAccount && getPaymentAmount() > 0 && (
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Ödeme Özeti</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ödeme Tutarı:</Text>
                  <Text style={styles.summaryValue}>
                    {getPaymentAmount().toFixed(2)} {currencySymbol}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ödeme Hesabı:</Text>
                  <Text style={styles.summaryValue}>{selectedPaymentAccount.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kalan Borç:</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.SUCCESS }]}>
                    {Math.max(0, currentDebt - getPaymentAmount()).toFixed(2)} {currencySymbol}
                  </Text>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      {/* Pay Button */}
      {currentDebt > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (!selectedPaymentAccount || getPaymentAmount() <= 0 || loading) && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={!selectedPaymentAccount || getPaymentAmount() <= 0 || loading}
          >
            <Text style={styles.payButtonText}>
              {loading ? 'Ödeme Yapılıyor...' : 'Ödeme Yap'}
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
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  debtInfoContainer: {
    gap: SPACING.xs,
  },
  debtInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  debtLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  debtAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.ERROR,
  },
  minPaymentAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.WARNING,
  },
  interestAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_TERTIARY,
  },
  interestRate: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  selectedPaymentOption: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  paymentOptionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
  },
  customAmountInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.sm,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
  },
  noAccountsContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noAccountsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  noAccountsSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  accountsList: {
    gap: SPACING.xs,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
  },
  selectedAccountOption: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  accountOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  summaryCard: {
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  payButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#666666',
  },
  payButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  noDebtContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noDebtMessage: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  limitInfoContainer: {
    gap: SPACING.xs,
  },
  limitAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  availableAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
});

export default ReportsCreditCardPaymentScreen; 