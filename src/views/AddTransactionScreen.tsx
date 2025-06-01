import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { TransactionType } from '../models/Transaction';
import { AccountType, Account } from '../models/Account';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { useAuth } from '../contexts/AuthContext';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AddTransactionScreenProps {
  route?: {
    params?: {
      defaultType?: 'income' | 'expense';
    };
  };
}

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = observer(({ route }) => {
  const { user } = useAuth();
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType>(
    route?.params?.defaultType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  
  const categories = selectedType === TransactionType.INCOME 
    ? DEFAULT_INCOME_CATEGORIES 
    : DEFAULT_EXPENSE_CATEGORIES;

  // Initialize AccountViewModel when user is available
  useEffect(() => {
    if (user?.id) {
      const accountVm = new AccountViewModel(user.id);
      setAccountViewModel(accountVm);
    } else {
      setAccountViewModel(null);
    }
  }, [user?.id]);

  // Set default account when accounts are loaded
  useEffect(() => {
    if (accountViewModel?.accounts && accountViewModel.accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accountViewModel.accounts[0].id);
    }
  }, [accountViewModel?.accounts, selectedAccount]);

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatCurrency(value);
    setAmount(formatted);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    if (!amount || !description || !selectedCategory) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Hata', 'Lütfen bir hesap seçin');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    setSaving(true);

    try {
      const transactionViewModel = new TransactionViewModel(user.id);
      
      // Get selected category details
      const category = categories.find(cat => cat.name === selectedCategory);
      
      const transactionData = {
        userId: user.id,
        amount: numericAmount,
        description: description.trim(),
        type: selectedType,
        category: selectedCategory,
        categoryIcon: category?.icon || 'help-circle-outline',
        accountId: selectedAccount,
        date: selectedDate,
      };

      const success = await transactionViewModel.addTransaction(transactionData);
      
      if (success) {
        Alert.alert('Başarılı', 'İşlem kaydedildi', [
          { text: 'Tamam', onPress: () => {
            // Reset form
            setAmount('');
            setDescription('');
            setSelectedCategory('');
            setSelectedDate(new Date());
          }}
        ]);
      } else {
        Alert.alert('Hata', 'İşlem kaydedilemedi');
      }
    } catch (error) {
      console.error('Save transaction error:', error);
      Alert.alert('Hata', 'İşlem kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const TypeSelector = () => (
    <View style={styles.typeSelector}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.EXPENSE && styles.typeButtonActive,
          { borderColor: COLORS.ERROR }
        ]}
        onPress={() => {
          setSelectedType(TransactionType.EXPENSE);
          setSelectedCategory('');
        }}
      >
        <Ionicons 
          name="remove-circle-outline" 
          size={24} 
          color={selectedType === TransactionType.EXPENSE ? COLORS.WHITE : COLORS.ERROR} 
        />
        <Text style={[
          styles.typeButtonText,
          selectedType === TransactionType.EXPENSE && styles.typeButtonTextActive
        ]}>
          Gider
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.INCOME && styles.typeButtonActive,
          { borderColor: COLORS.SUCCESS }
        ]}
        onPress={() => {
          setSelectedType(TransactionType.INCOME);
          setSelectedCategory('');
        }}
      >
        <Ionicons 
          name="add-circle-outline" 
          size={24} 
          color={selectedType === TransactionType.INCOME ? COLORS.WHITE : COLORS.SUCCESS} 
        />
        <Text style={[
          styles.typeButtonText,
          selectedType === TransactionType.INCOME && styles.typeButtonTextActive
        ]}>
          Gelir
        </Text>
      </TouchableOpacity>
    </View>
  );

  const CategorySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kategori</Text>
      <View style={styles.categoryScrollContainer}>
        {/* Sol Scroll Indicator */}
        <View style={styles.scrollIndicatorLeft}>
          <Ionicons name="chevron-back" size={16} color={COLORS.TEXT_TERTIARY} />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <View style={styles.categoriesContainer}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.name && styles.categoryItemActive
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <CategoryIcon
                  iconName={category.icon}
                  color={selectedCategory === category.name ? COLORS.PRIMARY : category.color}
                  size="medium"
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.name && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        {/* Sağ Scroll Indicator */}
        <View style={styles.scrollIndicatorRight}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
        </View>
      </View>
    </View>
  );

  const AccountSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hesap</Text>
      {accountViewModel?.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Hesaplar yükleniyor...</Text>
        </View>
      ) : (
        <View>
          {(accountViewModel?.accounts?.length || 0) > 0 ? (
            <View style={styles.accountsContainer}>
              {accountViewModel?.accounts?.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountItem,
                    selectedAccount === account.id && styles.accountItemActive
                  ]}
                  onPress={() => setSelectedAccount(account.id)}
                >
                  <View style={styles.accountInfo}>
                    <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                      <Ionicons name={account.icon as any} size={16} color={COLORS.WHITE} />
                    </View>
                    <Text style={styles.accountName}>{account.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyAccountsContainer}>
              <Text style={styles.emptyAccountsText}>Henüz hesap eklemediniz</Text>
              <Text style={styles.emptyAccountsSubtext}>İşlem eklemek için önce bir hesap oluşturun</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const DateSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tarih</Text>
      <TouchableOpacity style={styles.dateSelector} onPress={showDatepicker}>
        <View style={styles.dateInfo}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_TERTIARY} />
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İşlem Ekle</Text>
        </View>

        {/* Type Selector */}
        <TypeSelector />

        {/* Amount Input */}
        <Card style={styles.amountCard}>
          <Text style={styles.amountLabel}>Tutar</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <Input
              placeholder="0,00"
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              variant="filled"
              containerStyle={styles.amountInput}
              inputStyle={styles.amountInputText}
            />
          </View>
        </Card>

        {/* Description Input */}
        <View style={styles.section}>
          <Input
            label="Açıklama"
            placeholder="İşlem açıklaması..."
            value={description}
            onChangeText={setDescription}
            variant="outlined"
          />
        </View>

        {/* Date Selector */}
        <DateSelector />

        {/* Category Selector */}
        <CategorySelector />

        {/* Account Selector */}
        <AccountSelector />

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <Button
            title="İşlemi Kaydet"
            onPress={handleSave}
            variant="primary"
            size="large"
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: COLORS.SURFACE,
    gap: SPACING.xs,
  },
  typeButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  typeButtonTextActive: {
    color: COLORS.WHITE,
  },
  amountCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
  },
  amountInputText: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  categoryScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicatorLeft: {
    padding: SPACING.sm,
  },
  scrollIndicatorRight: {
    padding: SPACING.sm,
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryScrollContent: {
    padding: SPACING.sm,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 12,
    minWidth: 80,
  },
  categoryItemActive: {
    backgroundColor: COLORS.SURFACE,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  categoryTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  accountsContainer: {
    gap: SPACING.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountItemActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.CARD,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  saveButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  emptyAccountsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  emptyAccountsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  emptyAccountsSubtext: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AddTransactionScreen; 