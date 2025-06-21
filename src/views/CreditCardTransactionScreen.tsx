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
import { calculateAvailableLimit } from '../utils/creditCard';

interface CreditCardTransactionScreenProps {
  navigation: any;
  route?: {
    params?: {
      selectedCreditCard?: Account;
    };
  };
}

const CreditCardTransactionScreen: React.FC<CreditCardTransactionScreenProps> = observer(({ 
  navigation, 
  route 
}) => {
  const { user } = useAuth();
  const [accountViewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);


  const preSelectedCard = route?.params?.selectedCreditCard;

  // Form state
  const [selectedCreditCard, setSelectedCreditCard] = useState<Account | null>(preSelectedCard || null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Genel');
  const [loading, setLoading] = useState(false);

  const { currencySymbol, formatInput } = useCurrency();

  // Load credit cards
  useEffect(() => {
    if (accountViewModel) {
      accountViewModel.loadAccounts();
    }
  }, [accountViewModel]);

  const creditCards = accountViewModel?.accounts.filter(acc => 
    acc.type === AccountType.CREDIT_CARD && acc.isActive
  ) || [];

  const handleAddTransaction = async () => {
    if (!selectedCreditCard) {
      Alert.alert('Hata', 'Lütfen bir kredi kartı seçin');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Hata', 'Lütfen tutar girin');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen açıklama girin');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    // Kredi limiti kontrolü
    const availableLimit = calculateAvailableLimit(
      selectedCreditCard.limit || 0, 
      selectedCreditCard.currentDebt || 0
    );

    if (amountNum > availableLimit) {
      Alert.alert(
        'Limit Aşımı', 
        `Bu harcama kredi limitinizi aşacak.\nKullanılabilir limit: ${availableLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencySymbol}`
      );
      return;
    }

    setLoading(true);

    try {
      if (accountViewModel) {
        await accountViewModel.addCreditCardTransaction(
          selectedCreditCard.id,
          amountNum,
          description,
          category
        );

        Alert.alert('Başarılı', 'Kredi kartı harcaması eklendi', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Kredi kartı harcaması eklenirken hata:', error);
      Alert.alert('Hata', 'Harcama eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const CreditCardSelector = () => (
    <Card style={styles.section}>
      <View style={styles.cardHeaderSection}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="card" size={24} color="#E74C3C" />
          <Text style={styles.sectionTitle}>Kredi Kartı Seçin</Text>
        </View>
      </View>

      {creditCards.map((card) => {
        const availableLimit = calculateAvailableLimit(card.limit || 0, card.currentDebt || 0);
        const isSelected = selectedCreditCard?.id === card.id;
        const usagePercentage = ((card.currentDebt || 0) / (card.limit || 1)) * 100;
        
        return (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.cardOption,
              isSelected && styles.selectedCardOption
            ]}
            onPress={() => setSelectedCreditCard(card)}
          >
            <View style={styles.cardOptionContent}>
              <View style={[styles.cardIcon, { backgroundColor: card.color }]}>
                <Ionicons name="card" size={24} color="white" />
              </View>
              
              <View style={styles.cardInfo}>
                <View style={styles.cardMainInfo}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
                  )}
                </View>
                
                <View style={styles.cardStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Kullanılabilir</Text>
                    <Text style={[styles.statValue, { 
                      color: availableLimit > 0 ? COLORS.SUCCESS : COLORS.ERROR 
                    }]}>
                      {availableLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Mevcut Borç</Text>
                    <Text style={[styles.statValue, { color: COLORS.ERROR }]}>
                      {(card.currentDebt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.usageProgressContainer}>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(usagePercentage, 100)}%`,
                            backgroundColor: usagePercentage > 80 ? COLORS.ERROR : 
                                           usagePercentage > 50 ? '#FF9500' : COLORS.SUCCESS
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.usagePercentage}>
                      %{usagePercentage.toFixed(0)} kullanım
                    </Text>
                  </View>
                </View>

                <View style={styles.limitInfo}>
                  <Text style={styles.limitText}>
                    Limit: {(card.limit || 0).toLocaleString('tr-TR')} {currencySymbol}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
      
      {creditCards.length === 0 && (
        <View style={styles.noCardsContainer}>
          <Ionicons name="card-outline" size={64} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.noCardsText}>Henüz kredi kartınız yok</Text>
          <Text style={styles.noCardsSubtext}>
            Önce bir kredi kartı hesabı oluşturun
          </Text>
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => navigation.navigate('AddAccountScreen')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addCardButtonText}>Kredi Kartı Ekle</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  const TransactionDetailsCard = () => {
    if (!selectedCreditCard) return null;

    const amountNum = parseFloat(amount.replace(',', '.')) || 0;
    const availableLimit = calculateAvailableLimit(
      selectedCreditCard.limit || 0, 
      selectedCreditCard.currentDebt || 0
    );
    const newDebt = (selectedCreditCard.currentDebt || 0) + amountNum;
    const newAvailableLimit = Math.max(0, (selectedCreditCard.limit || 0) - newDebt);

    return (
      <Card style={styles.section}>
        <View style={styles.cardHeaderSection}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="receipt" size={24} color="#3498DB" />
            <Text style={styles.sectionTitle}>Harcama Detayları</Text>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>💰 Tutar ({currencySymbol})</Text>
          <View style={styles.amountInputWrapper}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(value) => setAmount(formatInput(value))}
              placeholder="0,00"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="decimal-pad"
            />
            <View style={styles.inputIconContainer}>
              <Ionicons name="cash" size={20} color={COLORS.PRIMARY} />
            </View>
          </View>
          
          {/* Limit Kontrolü */}
          {amountNum > 0 && (
            <View style={[
              styles.limitCheckContainer,
              { backgroundColor: amountNum > availableLimit ? COLORS.ERROR + '10' : COLORS.SUCCESS + '10' }
            ]}>
              {amountNum > availableLimit ? (
                <>
                  <Ionicons name="warning" size={16} color={COLORS.ERROR} />
                  <Text style={[styles.limitCheckText, { color: COLORS.ERROR }]}>
                    Limit aşımı! Kullanılabilir limit: {availableLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
                  <Text style={[styles.limitCheckText, { color: COLORS.SUCCESS }]}>
                    ✓ Kullanılabilir limit yeterli
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>📝 Açıklama</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Harcama açıklaması girin..."
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>🏷️ Kategori</Text>
          <TouchableOpacity style={styles.categorySelector}>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Kategori seçin..."
              placeholderTextColor={COLORS.TEXT_SECONDARY}
            />
            <Ionicons name="chevron-down" size={20} color={COLORS.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* Harcama Özeti */}
        {amountNum > 0 && (
          <View style={styles.transactionSummary}>
            <Text style={styles.summaryTitle}>📊 Harcama Özeti</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Harcama Tutarı:</Text>
              <Text style={styles.summaryValue}>
                {amountNum.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mevcut Borç:</Text>
              <Text style={styles.summaryValue}>
                {(selectedCreditCard.currentDebt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Yeni Borç:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.ERROR, fontWeight: '700' }]}>
                {newDebt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Kalan Limit:</Text>
              <Text style={[styles.summaryValue, { 
                color: newAvailableLimit > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                fontWeight: '700'
              }]}>
                {newAvailableLimit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currencySymbol}
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const selectedCardInfo = selectedCreditCard ? {
    availableLimit: calculateAvailableLimit(
      selectedCreditCard.limit || 0, 
      selectedCreditCard.currentDebt || 0
    ),
    amountNum: parseFloat(amount.replace(',', '.')) || 0
  } : null;

  const canSubmit = selectedCreditCard && 
                   amount.trim() && 
                   description.trim() && 
                   selectedCardInfo &&
                   selectedCardInfo.amountNum > 0 && 
                   selectedCardInfo.amountNum <= selectedCardInfo.availableLimit;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kredi Kartı Harcaması</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreditCardSelector />
        <TransactionDetailsCard />
      </ScrollView>

      {selectedCreditCard && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || !canSubmit) && styles.submitButtonDisabled
            ]}
            onPress={handleAddTransaction}
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  {selectedCardInfo && selectedCardInfo.amountNum > 0 
                    ? `Harcama Ekle (${selectedCardInfo.amountNum.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencySymbol})`
                    : 'Harcama Ekle'
                  }
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
  cardOption: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 16,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.SURFACE,
  },
  selectedCardOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  cardOptionContent: {
    padding: SPACING.lg,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
  },
  cardMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardName: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
  usageProgressContainer: {
    marginBottom: SPACING.md,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  usagePercentage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  limitInfo: {
    alignItems: 'center',
  },
  limitText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  noCardsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noCardsText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  noCardsSubtext: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 25,
  },
  addCardButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  amountInputWrapper: {
    position: 'relative',
  },
  amountInput: {
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
  limitCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  limitCheckText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    marginLeft: SPACING.xs,
    flex: 1,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.lg,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND,
    minHeight: 56,
  },
  categorySelector: {
    position: 'relative',
  },
  transactionSummary: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER,
    marginVertical: SPACING.md,
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
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
});

export default CreditCardTransactionScreen; 