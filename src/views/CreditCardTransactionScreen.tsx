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
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { useAuth } from '../contexts/AuthContext';
import { calculateAvailableLimit } from '../utils/creditCard';
import { useCurrency } from '../hooks';

const { width } = Dimensions.get('window');

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
  const [transactionViewModel] = useState(() => user?.id ? new TransactionViewModel(user.id) : null);

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
        `Bu harcama kredi limitinizi aşacak.\nKullanılabilir limit: ${availableLimit.toFixed(2)} ${currencySymbol}`
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
      <Text style={styles.sectionTitle}>Kredi Kartı Seçin</Text>
      {creditCards.map((card) => {
        const availableLimit = calculateAvailableLimit(card.limit || 0, card.currentDebt || 0);
        const isSelected = selectedCreditCard?.id === card.id;
        
        return (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.cardOption,
              isSelected && styles.selectedCardOption
            ]}
            onPress={() => setSelectedCreditCard(card)}
          >
            <View style={styles.cardOptionHeader}>
              <View style={[styles.cardIcon, { backgroundColor: card.color }]}>
                <Ionicons name="card" size={20} color="white" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{card.name}</Text>
                <Text style={styles.cardLimit}>
                  Kullanılabilir: {availableLimit.toFixed(2)} {currencySymbol}
                </Text>
                <Text style={styles.cardDebt}>
                  Mevcut Borç: {(card.currentDebt || 0).toFixed(2)} {currencySymbol}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.SUCCESS} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      
      {creditCards.length === 0 && (
        <View style={styles.noCardsContainer}>
          <Text style={styles.noCardsText}>Henüz kredi kartınız yok</Text>
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => navigation.navigate('AddAccountScreen')}
          >
            <Text style={styles.addCardButtonText}>Kredi Kartı Ekle</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Kredi Kartı Harcaması</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <CreditCardSelector />

        {selectedCreditCard && (
          <>
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Harcama Detayları</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Tutar ({currencySymbol})</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(value) => setAmount(formatInput(value))}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Açıklama</Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Harcama açıklaması..."
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  multiline
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Kategori</Text>
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Kategori..."
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {selectedCreditCard && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled
            ]}
            onPress={handleAddTransaction}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Ekleniyor...' : 'Harcama Ekle'}
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
  cardOption: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  selectedCardOption: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: COLORS.SUCCESS + '10',
  },
  cardOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardLimit: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.SUCCESS,
    marginBottom: 2,
  },
  cardDebt: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.ERROR,
  },
  noCardsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  noCardsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.md,
  },
  addCardButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addCardButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.SURFACE,
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
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
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
});

export default CreditCardTransactionScreen; 