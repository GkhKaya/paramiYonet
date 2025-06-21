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
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { Account, AccountType } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import {
  calculateMinPayment,
  calculateMonthlyInterest,
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

  // Son ödeme tarihi hesaplama (sonraki ayın due day'i)
  const calculateDueDate = () => {
    const today = new Date();
    const dueDay = creditCard.dueDay || 15;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    return nextMonth.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Ekstre tarihi hesaplama (sonraki ayın statement day'i)
  const calculateStatementDate = () => {
    const today = new Date();
    const statementDay = creditCard.statementDay || 10;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, statementDay);
    return nextMonth.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long' 
    });
  };

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

  // Kredi kartı bilgilerini gösteren gelişmiş kart
  const CreditCardInfoCard = () => (
    <Card style={styles.section}>
      <View style={styles.cardHeaderSection}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="card" size={24} color="#FF6B6B" />
          <Text style={styles.sectionTitle}>Kredi Kartı Bilgileri</Text>
        </View>
      </View>

      <View style={styles.creditCardMainInfo}>
        <View style={[styles.cardIcon, { backgroundColor: creditCard.color }]}>
          <Ionicons name="card" size={32} color="white" />
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.cardName}>{creditCard.name}</Text>
          <Text style={styles.cardSubtitle}>Kredi Kartı</Text>
        </View>
      </View>

      {/* Borç Durumu - Ana Vurgu */}
      <View style={styles.debtStatusCard}>
        <View style={styles.debtMainInfo}>
          <Text style={styles.debtLabel}>Mevcut Toplam Borç</Text>
          <Text style={[styles.debtAmount, { color: currentDebt > 0 ? COLORS.ERROR : COLORS.SUCCESS }]}>
            {currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
          </Text>
          {currentDebt === 0 ? (
            <View style={styles.noDebtBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
              <Text style={styles.noDebtText}>Borç bulunmuyor</Text>
            </View>
          ) : (
            <View style={styles.debtWarning}>
              <Ionicons name="warning" size={16} color="#FF9500" />
              <Text style={styles.debtWarningText}>Ödeme gerekli</Text>
            </View>
          )}
        </View>
      </View>

      {/* Detaylı Bilgiler Grid */}
      {currentDebt > 0 && (
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Asgari Ödeme</Text>
            <Text style={styles.detailValue}>
              {minPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
            <Text style={styles.detailSubtext}>(%20)</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Aylık Faiz</Text>
            <Text style={styles.detailValue}>
              {monthlyInterest.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
            <Text style={styles.detailSubtext}>(%{interestRates.regular})</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Son Ödeme</Text>
            <Text style={styles.detailValue}>{calculateDueDate()}</Text>
            <Text style={styles.detailSubtext}>Tarihi</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sonraki Ekstre</Text>
            <Text style={styles.detailValue}>{calculateStatementDate()}</Text>
            <Text style={styles.detailSubtext}>Kesim tarihi</Text>
          </View>
        </View>
      )}

      {/* Limit Bilgileri */}
      <View style={styles.limitInfoSection}>
        <View style={styles.limitProgressContainer}>
          <View style={styles.limitLabels}>
            <Text style={styles.limitLabel}>Kredi Limiti</Text>
            <Text style={styles.limitAmount}>
              {(creditCard.limit || 0).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min((currentDebt / (creditCard.limit || 1)) * 100, 100)}%`,
                  backgroundColor: currentDebt > (creditCard.limit || 0) * 0.8 ? COLORS.ERROR : 
                                 currentDebt > (creditCard.limit || 0) * 0.5 ? '#FF9500' : COLORS.SUCCESS
                }
              ]} 
            />
          </View>
          
          <View style={styles.limitLabels}>
            <Text style={styles.availableLabel}>Kullanılabilir</Text>
            <Text style={styles.availableAmount}>
              {Math.max(0, (creditCard.limit || 0) - currentDebt).toLocaleString('tr-TR')} {currencySymbol}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  const PaymentTypeSelector = () => (
    <Card style={styles.section}>
      <View style={styles.cardHeaderSection}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="cash" size={24} color="#4ECDC4" />
          <Text style={styles.sectionTitle}>Ödeme Türü Seçin</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentType === 'minimum' && styles.selectedPaymentOption
        ]}
        onPress={() => setPaymentType('minimum')}
      >
        <View style={styles.paymentOptionContent}>
          <View style={styles.paymentOptionIcon}>
            <Ionicons 
              name="shield-checkmark" 
              size={24} 
              color={paymentType === 'minimum' ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY} 
            />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>Asgari Ödeme</Text>
            <Text style={styles.paymentOptionAmount}>
              {minPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
            <Text style={styles.paymentOptionSubtitle}>
              Yasal minimum ödeme (%20)
            </Text>
          </View>
          {paymentType === 'minimum' && (
            <Ionicons name="checkmark-circle" size={28} color={COLORS.SUCCESS} />
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
        <View style={styles.paymentOptionContent}>
          <View style={styles.paymentOptionIcon}>
            <Ionicons 
              name="star" 
              size={24} 
              color={paymentType === 'full' ? '#FFD700' : COLORS.TEXT_SECONDARY} 
            />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>Tam Ödeme</Text>
            <Text style={styles.paymentOptionAmount}>
              {currentDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
            <Text style={styles.paymentOptionSubtitle}>
              Tüm borcu kapatır (Faiz ödemezsiniz)
            </Text>
          </View>
          {paymentType === 'full' && (
            <Ionicons name="checkmark-circle" size={28} color={COLORS.SUCCESS} />
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
        <View style={styles.paymentOptionContent}>
          <View style={styles.paymentOptionIcon}>
            <Ionicons 
              name="create" 
              size={24} 
              color={paymentType === 'custom' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
            />
          </View>
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionTitle}>İstediğim Kadar</Text>
            <Text style={styles.paymentOptionAmount}>
              {getPaymentAmount() > 0 ? 
                `${getPaymentAmount().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencySymbol}` : 
                'Tutar belirleyin'
              }
            </Text>
            <Text style={styles.paymentOptionSubtitle}>
              Özel tutar belirleyin
            </Text>
          </View>
          {paymentType === 'custom' && (
            <Ionicons name="checkmark-circle" size={28} color={COLORS.SUCCESS} />
          )}
        </View>
      </TouchableOpacity>

      {paymentType === 'custom' && (
        <View style={styles.customAmountContainer}>
          <Text style={styles.inputLabel}>Ödeme Tutarı ({currencySymbol})</Text>
          <View style={styles.customInputWrapper}>
            <TextInput
              style={styles.customAmountInput}
              value={customAmount}
              onChangeText={(value) => setCustomAmount(formatInput(value))}
              placeholder="0,00"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="decimal-pad"
            />
            <View style={styles.inputIconContainer}>
              <Ionicons name="cash" size={20} color={COLORS.PRIMARY} />
            </View>
          </View>
          {parseFloat(customAmount.replace(',', '.')) > 0 && (
            <View style={styles.customAmountInfo}>
              <Text style={styles.customAmountNote}>
                Kalan borç: {(currentDebt - parseFloat(customAmount.replace(',', '.') || '0')).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );

  const PaymentAccountSelector = () => (
    <Card style={styles.section}>
      <View style={styles.cardHeaderSection}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="wallet" size={24} color="#9B59B6" />
          <Text style={styles.sectionTitle}>Ödeme Hesabı Seçin</Text>
        </View>
      </View>

      {paymentAccounts.map((account) => {
        const isSelected = selectedPaymentAccount?.id === account.id;
        const hasEnoughBalance = account.balance >= getPaymentAmount();
        
        return (
          <TouchableOpacity
            key={account.id}
            style={[
              styles.accountOption,
              isSelected && styles.selectedAccountOption,
              !hasEnoughBalance && getPaymentAmount() > 0 && styles.insufficientBalanceOption
            ]}
            onPress={() => setSelectedPaymentAccount(account)}
            disabled={!hasEnoughBalance && getPaymentAmount() > 0}
          >
            <View style={styles.accountOptionContent}>
              <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                <Ionicons name={account.icon as any} size={24} color="white" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, !hasEnoughBalance && getPaymentAmount() > 0 && styles.disabledText]}>
                  {account.name}
                </Text>
                <Text style={[styles.accountBalance, { 
                  color: hasEnoughBalance || getPaymentAmount() === 0 ? COLORS.SUCCESS : COLORS.ERROR 
                }]}>
                  Bakiye: {account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
                </Text>
                {!hasEnoughBalance && getPaymentAmount() > 0 && (
                  <Text style={styles.insufficientText}>Yetersiz bakiye</Text>
                )}
              </View>
              {isSelected && hasEnoughBalance && (
                <Ionicons name="checkmark-circle" size={28} color={COLORS.SUCCESS} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      
      {paymentAccounts.length === 0 && (
        <View style={styles.noAccountsContainer}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.noAccountsText}>Ödeme yapılabilecek hesap bulunamadı</Text>
          <Text style={styles.noAccountsSubtext}>
            Önce bakiyesi olan bir hesap oluşturun
          </Text>
        </View>
      )}
    </Card>
  );

  // Ödeme özeti kartı
  const PaymentSummaryCard = () => {
    if (!selectedPaymentAccount || currentDebt === 0) return null;

    const paymentAmount = getPaymentAmount();
    const remainingDebt = Math.max(0, currentDebt - paymentAmount);
    
    return (
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="receipt" size={24} color="#E74C3C" />
          <Text style={styles.summaryTitle}>Ödeme Özeti</Text>
        </View>

        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ödeme Tutarı:</Text>
            <Text style={styles.summaryValue}>
              {paymentAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ödeme Hesabı:</Text>
            <Text style={styles.summaryValue}>{selectedPaymentAccount.name}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kalan Borç:</Text>
            <Text style={[styles.summaryValue, { 
              color: remainingDebt === 0 ? COLORS.SUCCESS : COLORS.ERROR 
            }]}>
              {remainingDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
            </Text>
          </View>

          {remainingDebt === 0 && (
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} />
              <Text style={styles.successText}>Tüm borç kapatılacak</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

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
        <CreditCardInfoCard />
        
        {currentDebt > 0 ? (
          <>
            <PaymentTypeSelector />
            <PaymentAccountSelector />
            <PaymentSummaryCard />
          </>
        ) : (
          <Card style={styles.noDebtCard}>
            <View style={styles.noDebtContent}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.SUCCESS} />
              <Text style={styles.noDebtTitle}>Harika! 🎉</Text>
              <Text style={styles.noDebtMessage}>
                Bu kredi kartında herhangi bir borcunuz bulunmuyor.
              </Text>
              <TouchableOpacity
                style={styles.goBackButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.goBackButtonText}>Geri Dön</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </ScrollView>

      {selectedPaymentAccount && currentDebt > 0 && getPaymentAmount() > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  Ödeme Yap ({getPaymentAmount().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol})
                </Text>
              </>
            )}
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
    backgroundColor: COLORS.SURFACE,
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
  cardHeaderSection: {
    marginBottom: SPACING.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  creditCardMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  debtStatusCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  debtMainInfo: {
    alignItems: 'center',
  },
  debtLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  debtAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  noDebtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  noDebtText: {
    color: COLORS.SUCCESS,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  debtWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500' + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  debtWarningText: {
    color: '#FF9500',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailItem: {
    width: '48%',
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
    textAlign: 'center',
  },
  detailSubtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  limitInfoSection: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  limitProgressContainer: {
    width: '100%',
  },
  limitLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  limitLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  limitAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    marginVertical: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  availableLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  availableAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.SUCCESS,
    fontWeight: '700',
  },
  paymentOption: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 16,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.SURFACE,
  },
  selectedPaymentOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  paymentOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  paymentOptionAmount: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },
  paymentOptionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  customAmountContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  customInputWrapper: {
    position: 'relative',
  },
  customAmountInput: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.lg,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND,
    textAlign: 'center',
    paddingRight: 50,
  },
  inputIconContainer: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  customAmountInfo: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  customAmountNote: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  accountOption: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 16,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.SURFACE,
  },
  selectedAccountOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  insufficientBalanceOption: {
    borderColor: COLORS.ERROR + '50',
    backgroundColor: COLORS.ERROR + '05',
    opacity: 0.6,
  },
  accountOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  accountIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  insufficientText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
    fontWeight: '500',
  },
  disabledText: {
    color: COLORS.TEXT_SECONDARY,
  },
  noAccountsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noAccountsText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  noAccountsSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  summaryContent: {
    paddingTop: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.sm,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginTop: SPACING.sm,
  },
  successText: {
    color: COLORS.SUCCESS,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  noDebtCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noDebtContent: {
    alignItems: 'center',
  },
  noDebtTitle: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  noDebtMessage: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  goBackButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
});

export default CreditCardPaymentScreen; 