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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { TransactionType } from '../models/Transaction';
import { AccountType, Account } from '../models/Account';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { useAuth } from '../contexts/AuthContext';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { RecurringPaymentViewModel } from '../viewmodels/RecurringPaymentViewModel';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AddTransactionScreenProps {
  route?: {
    params?: {
      defaultType?: 'income' | 'expense';
    };
  };
  navigation: any;
}

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = observer(({ route, navigation }) => {
  const { user } = useAuth();
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [recurringPaymentViewModel, setRecurringPaymentViewModel] = useState<RecurringPaymentViewModel | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType>(
    route?.params?.defaultType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [reminderDays, setReminderDays] = useState('3');
  const [autoCreateTransaction, setAutoCreateTransaction] = useState(true);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';
  
  const availableCategories = selectedType === TransactionType.INCOME 
    ? DEFAULT_INCOME_CATEGORIES 
    : DEFAULT_EXPENSE_CATEGORIES;

  // Helper functions
  const formatAmountToWords = (amount: number): string => {
    if (amount < 1000) return '';
    if (amount < 1000000) return `${(amount / 1000).toFixed(1)} bin`;
    if (amount < 1000000000) return `${(amount / 1000000).toFixed(1)} milyon`;
    return `${(amount / 1000000000).toFixed(1)} milyar`;
  };

  const isFormValid = (): boolean => {
    return (
      parseFloat(amount) > 0 &&
      description.trim().length > 0 &&
      selectedCategory.length > 0 &&
      selectedAccountId.length > 0 &&
      !loading
    );
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Initialize AccountViewModel when user is available
  useEffect(() => {
    if (user?.id) {
      const accountVm = new AccountViewModel(user.id);
      const recurringVm = new RecurringPaymentViewModel(user.id);
      setAccountViewModel(accountVm);
      setRecurringPaymentViewModel(recurringVm);
    } else {
      setAccountViewModel(null);
      setRecurringPaymentViewModel(null);
    }
  }, [user?.id]);

  // Set default account when accounts are loaded
  useEffect(() => {
    if (accountViewModel?.accounts && accountViewModel.accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accountViewModel.accounts[0].id);
    }
  }, [accountViewModel?.accounts, selectedAccountId]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
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

    if (!selectedAccountId) {
      Alert.alert('Hata', 'Lütfen bir hesap seçin');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    // Recurring payment validation
    if (isRecurring) {
      const numericReminderDays = parseInt(reminderDays);
      if (isNaN(numericReminderDays) || numericReminderDays < 0) {
        Alert.alert('Hata', 'Lütfen geçerli bir hatırlatma gün sayısı girin');
        return;
      }
    }

    setLoading(true);

    try {
      const transactionViewModel = new TransactionViewModel(user.id);
      
      // Get selected category details
      const category = availableCategories.find(cat => cat.name === selectedCategory);
      
      const transactionData = {
        userId: user.id,
        amount: numericAmount,
        description: description.trim(),
        type: selectedType,
        category: selectedCategory,
        categoryIcon: category?.icon || 'help-circle-outline',
        accountId: selectedAccountId,
        date: selectedDate,
      };

      const success = await transactionViewModel.addTransaction(transactionData);
      
      if (success) {
        // If recurring payment is enabled and this is an expense, create recurring payment
        if (isRecurring && selectedType === TransactionType.EXPENSE && recurringPaymentViewModel) {
          try {
            const recurringPaymentData = {
              name: description.trim(),
              amount: numericAmount,
              category: selectedCategory,
              accountId: selectedAccountId,
              frequency,
              startDate: selectedDate,
              reminderDays: parseInt(reminderDays),
              autoCreateTransaction,
            };

            await recurringPaymentViewModel.createRecurringPayment(recurringPaymentData);
          } catch (recurringError) {
            console.error('Error creating recurring payment:', recurringError);
            // Don't fail the whole operation if recurring payment fails
            Alert.alert('Uyarı', 'İşlem kaydedildi ancak düzenli ödeme oluşturulamadı');
          }
        }
        
        // Force reload accounts to update balance
        if (accountViewModel) {
          await accountViewModel.loadAccounts();
        }
        
        const successMessage = isRecurring && selectedType === TransactionType.EXPENSE 
          ? 'İşlem kaydedildi ve düzenli ödeme oluşturuldu' 
          : 'İşlem kaydedildi';
        
        Alert.alert('Başarılı', successMessage, [
          { text: 'Tamam', onPress: () => {
            // Reset form
            setAmount('');
            setDescription('');
            setSelectedCategory('');
            setSelectedDate(new Date());
            setIsRecurring(false);
            setFrequency('monthly');
            setReminderDays('3');
            setAutoCreateTransaction(true);
            navigation.goBack();
          }}
        ]);
      } else {
        Alert.alert('Hata', 'İşlem kaydedilemedi');
      }
    } catch (error) {
      console.error('Save transaction error:', error);
      Alert.alert('Hata', 'İşlem kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Layout (Original Design)
  const renderMobileLayout = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Transaction Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İşlem Türü</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === TransactionType.EXPENSE && styles.typeButtonActive,
              { borderColor: COLORS.ERROR }
            ]}
            onPress={() => setSelectedType(TransactionType.EXPENSE)}
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
            onPress={() => setSelectedType(TransactionType.INCOME)}
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
      </View>

      {/* Amount Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tutar</Text>
        <Card style={styles.mobileAmountCard}>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              keyboardType="numeric"
              containerStyle={styles.amountInput}
              inputStyle={styles.amountInputText}
              textAlign="center"
              variant="outlined"
              autoFocus={true}
            />
          </View>
          {parseFloat(amount) > 0 && (
            <Text style={styles.amountWords}>
              {formatAmountToWords(parseFloat(amount))}
            </Text>
          )}
        </Card>
      </View>

      {/* Description Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Açıklama</Text>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="İşlem açıklaması girin"
          variant="outlined"
          leftIcon="document-text-outline"
          multiline={true}
          numberOfLines={3}
        />
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori</Text>
        <View style={styles.categoryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {availableCategories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.name && styles.categoryItemActive
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <View style={[
                  styles.categoryIconContainer,
                  { 
                    backgroundColor: selectedCategory === category.name 
                      ? category.color 
                      : category.color + '20' 
                  }
                ]}>
                  <CategoryIcon
                    iconName={category.icon}
                    color={selectedCategory === category.name ? COLORS.WHITE : category.color}
                    size="medium"
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.name && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Account Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        {accountViewModel?.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Hesaplar yükleniyor...</Text>
          </View>
        ) : (accountViewModel?.accounts.length || 0) > 0 ? (
          <View style={styles.accountsContainer}>
            {accountViewModel?.accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  selectedAccountId === account.id && styles.accountItemActive
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <View style={styles.accountInfo}>
                  <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                    <Ionicons 
                      name={account.icon as any} 
                      size={20} 
                      color={COLORS.WHITE} 
                    />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance)}
                    </Text>
                  </View>
                </View>
                {selectedAccountId === account.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card style={styles.emptyAccountsCard}>
            <View style={styles.emptyAccountsContainer}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.emptyAccountsText}>Henüz hesap yok</Text>
              <Text style={styles.emptyAccountsSubtext}>
                İşlem eklemek için önce bir hesap oluşturmalısınız
              </Text>
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => navigation.navigate('AddAccount')}
              >
                <Text style={styles.createAccountButtonText}>Hesap Oluştur</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarih</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.dateText}>{selectedDate.toLocaleDateString('tr-TR')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Recurring Payment Section - Only for Expenses */}
      {selectedType === TransactionType.EXPENSE && (
        <View style={styles.section}>
          <View style={styles.recurringHeader}>
            <Text style={styles.sectionTitle}>Düzenli Ödeme</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          </View>
          
          {isRecurring && (
            <View style={styles.recurringOptions}>
              {/* Frequency Selection */}
              <View style={styles.frequencySection}>
                <Text style={styles.recurringSubtitle}>Tekrar Sıklığı</Text>
                <View style={styles.frequencyGrid}>
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        frequency === freq && styles.frequencyButtonActive
                      ]}
                      onPress={() => setFrequency(freq)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        frequency === freq && styles.frequencyButtonTextActive
                      ]}>
                        {freq === 'daily' ? 'Günlük' : 
                         freq === 'weekly' ? 'Haftalık' : 
                         freq === 'monthly' ? 'Aylık' : 'Yıllık'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reminder Days */}
              <View style={styles.reminderSection}>
                <Text style={styles.recurringSubtitle}>Kaç Gün Önce Hatırlat</Text>
                <Input
                  value={reminderDays}
                  onChangeText={setReminderDays}
                  placeholder="3"
                  keyboardType="numeric"
                  variant="outlined"
                  containerStyle={styles.reminderInput}
                />
              </View>

              {/* Auto Create Transaction */}
              <View style={styles.autoTransactionSection}>
                <View style={styles.autoTransactionHeader}>
                  <Text style={styles.recurringSubtitle}>Otomatik İşlem Oluştur</Text>
                  <Switch
                    value={autoCreateTransaction}
                    onValueChange={setAutoCreateTransaction}
                    trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                    thumbColor={COLORS.WHITE}
                  />
                </View>
                <Text style={styles.autoTransactionDescription}>
                  Ödeme yapıldığında otomatik olarak gider işlemi oluşturulsun
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  // Web Layout (New Side-by-Side Design)
  const renderWebLayout = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Transaction Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İşlem Türü</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === TransactionType.INCOME && styles.typeButtonActive,
              { borderColor: COLORS.SUCCESS }
            ]}
            onPress={() => setSelectedType(TransactionType.INCOME)}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: selectedType === TransactionType.INCOME ? COLORS.SUCCESS : COLORS.SUCCESS + '20' }
            ]}>
              <Ionicons 
                name="trending-up" 
                size={24} 
                color={selectedType === TransactionType.INCOME ? COLORS.WHITE : COLORS.SUCCESS} 
              />
            </View>
            <Text style={[
              styles.typeButtonText,
              selectedType === TransactionType.INCOME && styles.typeButtonTextActive
            ]}>
              Gelir
            </Text>
            <Text style={styles.typeDescription}>Para girişi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === TransactionType.EXPENSE && styles.typeButtonActive,
              { borderColor: COLORS.ERROR }
            ]}
            onPress={() => setSelectedType(TransactionType.EXPENSE)}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: selectedType === TransactionType.EXPENSE ? COLORS.ERROR : COLORS.ERROR + '20' }
            ]}>
              <Ionicons 
                name="trending-down" 
                size={24} 
                color={selectedType === TransactionType.EXPENSE ? COLORS.WHITE : COLORS.ERROR} 
              />
            </View>
            <Text style={[
              styles.typeButtonText,
              selectedType === TransactionType.EXPENSE && styles.typeButtonTextActive
            ]}>
              Gider
            </Text>
            <Text style={styles.typeDescription}>Para çıkışı</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarih</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.dateText}>{selectedDate.toLocaleDateString('tr-TR')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Amount and Description Row (Side by Side) */}
      <View style={styles.rowSection}>
        {/* Amount Input */}
        <View style={styles.halfSection}>
          <Text style={styles.sectionTitle}>Tutar</Text>
          <Card style={styles.webAmountCard}>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                keyboardType="numeric"
                containerStyle={styles.amountInput}
                inputStyle={styles.amountInputText}
                textAlign="center"
                variant="outlined"
                autoFocus={true}
              />
            </View>
            {parseFloat(amount) > 0 && (
              <Text style={styles.amountWords}>
                {formatAmountToWords(parseFloat(amount))}
              </Text>
            )}
          </Card>
        </View>

        {/* Description Input */}
        <View style={styles.halfSection}>
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <View style={styles.descriptionContainer}>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="İşlem açıklaması girin"
              variant="outlined"
              leftIcon="document-text-outline"
              multiline={true}
              numberOfLines={4}
              containerStyle={styles.descriptionInput}
            />
          </View>
        </View>
      </View>

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori</Text>
        <View style={styles.categoryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {availableCategories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.name && styles.categoryItemActive
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <View style={[
                  styles.categoryIconContainer,
                  { 
                    backgroundColor: selectedCategory === category.name 
                      ? category.color 
                      : category.color + '20' 
                  }
                ]}>
                  <CategoryIcon
                    iconName={category.icon}
                    color={selectedCategory === category.name ? COLORS.WHITE : category.color}
                    size="medium"
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.name && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Account Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        {accountViewModel?.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Hesaplar yükleniyor...</Text>
          </View>
        ) : (accountViewModel?.accounts.length || 0) > 0 ? (
          <View style={styles.accountsContainer}>
            {accountViewModel?.accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountItem,
                  selectedAccountId === account.id && styles.accountItemActive
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <View style={styles.accountInfo}>
                  <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                    <Ionicons 
                      name={account.icon as any} 
                      size={20} 
                      color={COLORS.WHITE} 
                    />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(typeof account.balance === 'string' ? parseFloat(account.balance) : account.balance)}
                    </Text>
                  </View>
                </View>
                {selectedAccountId === account.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Card style={styles.emptyAccountsCard}>
            <View style={styles.emptyAccountsContainer}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.emptyAccountsText}>Henüz hesap yok</Text>
              <Text style={styles.emptyAccountsSubtext}>
                İşlem eklemek için önce bir hesap oluşturmalısınız
              </Text>
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => navigation.navigate('AddAccount')}
              >
                <Text style={styles.createAccountButtonText}>Hesap Oluştur</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>

      {/* Recurring Payment Section - Only for Expenses */}
      {selectedType === TransactionType.EXPENSE && (
        <View style={styles.section}>
          <View style={styles.recurringHeader}>
            <Text style={styles.sectionTitle}>Düzenli Ödeme</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
              thumbColor={COLORS.WHITE}
            />
          </View>
          
          {isRecurring && (
            <View style={styles.recurringOptions}>
              {/* Frequency Selection */}
              <View style={styles.frequencySection}>
                <Text style={styles.recurringSubtitle}>Tekrar Sıklığı</Text>
                <View style={styles.frequencyGrid}>
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        frequency === freq && styles.frequencyButtonActive
                      ]}
                      onPress={() => setFrequency(freq)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        frequency === freq && styles.frequencyButtonTextActive
                      ]}>
                        {freq === 'daily' ? 'Günlük' : 
                         freq === 'weekly' ? 'Haftalık' : 
                         freq === 'monthly' ? 'Aylık' : 'Yıllık'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reminder Days */}
              <View style={styles.reminderSection}>
                <Text style={styles.recurringSubtitle}>Kaç Gün Önce Hatırlat</Text>
                <Input
                  value={reminderDays}
                  onChangeText={setReminderDays}
                  placeholder="3"
                  keyboardType="numeric"
                  variant="outlined"
                  containerStyle={styles.reminderInput}
                />
              </View>

              {/* Auto Create Transaction */}
              <View style={styles.autoTransactionSection}>
                <View style={styles.autoTransactionHeader}>
                  <Text style={styles.recurringSubtitle}>Otomatik İşlem Oluştur</Text>
                  <Switch
                    value={autoCreateTransaction}
                    onValueChange={setAutoCreateTransaction}
                    trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                    thumbColor={COLORS.WHITE}
                  />
                </View>
                <Text style={styles.autoTransactionDescription}>
                  Ödeme yapıldığında otomatik olarak gider işlemi oluşturulsun
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  return (
    <>
      {isWeb ? (
        // Web Layout
        <WebLayout title="Yeni İşlem" activeRoute="addTransaction" navigation={navigation}>
          <View style={styles.webContainer}>
            {renderWebLayout()}
            
            {/* Save Button for Web */}
            <View style={styles.webSaveButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !isFormValid() && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!isFormValid() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                    <Text style={styles.saveButtonText}>İşlemi Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </WebLayout>
      ) : (
        // Mobile Layout
        <SafeAreaView style={styles.container} edges={['bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Yeni İşlem</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Mobile Content */}
          {renderMobileLayout()}

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !isFormValid() && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                  <Text style={styles.saveButtonText}>İşlemi Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Date Picker Modal (for both platforms) */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerRight: {
    width: 40, // Same width as back button for centering
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
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: COLORS.SURFACE,
    gap: SPACING.xs,
  },
  typeButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: COLORS.WHITE,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  // Mobile Amount Card
  mobileAmountCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  // Web Amount Card (for side-by-side layout)
  webAmountCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
  },
  amountContainer: {
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
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.TEXT_PRIMARY,
  },
  amountWords: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 16,
    minWidth: 80,
  },
  categoryItemActive: {
    backgroundColor: COLORS.SURFACE,
    transform: [{ scale: 1.05 }],
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  accountsContainer: {
    paddingHorizontal: SPACING.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountItemActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  accountInfo: {
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
    marginRight: SPACING.md,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  selectedIndicator: {
    padding: SPACING.xs,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
    fontWeight: '500',
  },
  emptyAccountsCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: SPACING.xl,
  },
  emptyAccountsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyAccountsText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  emptyAccountsSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  createAccountButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  createAccountButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.sm,
  },
  saveButtonContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    minHeight: 56,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.TEXT_TERTIARY,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: SPACING.sm,
  },
  // Web-specific styles for side-by-side layout
  rowSection: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  halfSection: {
    flex: 1,
  },
  descriptionContainer: {
    flex: 1,
    height: 120,
  },
  descriptionInput: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
  },
  webSaveButtonContainer: {
    padding: SPACING.md,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  recurringOptions: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  recurringSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  frequencySection: {
    marginBottom: SPACING.md,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  frequencyButtonText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
  frequencyButtonTextActive: {
    color: COLORS.WHITE,
  },
  reminderSection: {
    marginBottom: SPACING.md,
  },
  reminderInput: {
    width: 100,
  },
  autoTransactionSection: {
    marginBottom: SPACING.sm,
  },
  autoTransactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  autoTransactionDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AddTransactionScreen; 