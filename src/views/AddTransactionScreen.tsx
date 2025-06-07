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
  StatusBar,
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
import { useViewModels } from '../contexts/ViewModelContext';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { RecurringPaymentViewModel } from '../viewmodels/RecurringPaymentViewModel';
import { isWeb } from '../utils/platform';
import { useCurrency, useCategory, useDate } from '../hooks';

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
  const { accountViewModel, transactionViewModel } = useViewModels();
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

  // Custom hooks
  const { formatCurrency: formatCurrencyUtil, currencySymbol, formatInput, parseInput } = useCurrency();
  const { getDetails, getAllCategories } = useCategory({ type: selectedType });
  const { formatSmart } = useDate();
  
  const availableCategories = getAllCategories();

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
    return formatCurrencyUtil(amount);
  };

  // Initialize AccountViewModel when user is available
  useEffect(() => {
    if (user?.id) {
      const recurringVm = new RecurringPaymentViewModel(user.id);
      setRecurringPaymentViewModel(recurringVm);
    } else {
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
      if (!transactionViewModel) {
        Alert.alert('Hata', 'İşlem sistemi hazır değil');
        setLoading(false);
        return;
      }

      const transactionData = {
        userId: user.id,
        amount: numericAmount,
        description: description.trim(),
        type: selectedType,
        category: selectedCategory,
        categoryIcon: availableCategories.find(cat => cat.name === selectedCategory)?.icon || 'help-circle-outline',
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
              { borderColor: '#F44336' }
            ]}
            onPress={() => setSelectedType(TransactionType.EXPENSE)}
          >
            <Ionicons 
              name="remove-circle-outline" 
              size={24} 
              color={selectedType === TransactionType.EXPENSE ? '#FFFFFF' : '#F44336'} 
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
              { borderColor: '#4CAF50' }
            ]}
            onPress={() => setSelectedType(TransactionType.INCOME)}
          >
            <Ionicons 
              name="add-circle-outline" 
              size={24} 
              color={selectedType === TransactionType.INCOME ? '#FFFFFF' : '#4CAF50'} 
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
        <View style={styles.mobileAmountCard}>
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
        </View>
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
                    color={selectedCategory === category.name ? '#FFFFFF' : category.color}
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
            <ActivityIndicator size="small" color="#FFFFFF" />
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
                      color="#FFFFFF" 
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
                    <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyAccountsCard}>
            <View style={styles.emptyAccountsContainer}>
              <Ionicons name="wallet-outline" size={48} color="#666666" />
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
          </View>
        )}
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarih</Text>
        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={20} color="#2196F3" />
            <Text style={styles.dateText}>{selectedDate.toLocaleDateString('tr-TR')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666666" />
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
              trackColor={{ false: '#333333', true: '#2196F3' }}
              thumbColor="#FFFFFF"
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
                    trackColor={{ false: '#333333', true: '#2196F3' }}
                    thumbColor="#FFFFFF"
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
              { borderColor: '#4CAF50' }
            ]}
            onPress={() => setSelectedType(TransactionType.INCOME)}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: selectedType === TransactionType.INCOME ? '#4CAF50' : '#4CAF5020' }
            ]}>
              <Ionicons 
                name="trending-up" 
                size={24} 
                color={selectedType === TransactionType.INCOME ? '#FFFFFF' : '#4CAF50'} 
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
              { borderColor: '#F44336' }
            ]}
            onPress={() => setSelectedType(TransactionType.EXPENSE)}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: selectedType === TransactionType.EXPENSE ? '#F44336' : '#F4433620' }
            ]}>
              <Ionicons 
                name="trending-down" 
                size={24} 
                color={selectedType === TransactionType.EXPENSE ? '#FFFFFF' : '#F44336'} 
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
            <Ionicons name="calendar-outline" size={20} color="#2196F3" />
            <Text style={styles.dateText}>{selectedDate.toLocaleDateString('tr-TR')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Amount and Description Row (Side by Side) */}
      <View style={styles.rowSection}>
        {/* Amount Input */}
        <View style={styles.halfSection}>
          <Text style={styles.sectionTitle}>Tutar</Text>
          <View style={styles.webAmountCard}>
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
          </View>
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
                    color={selectedCategory === category.name ? '#FFFFFF' : category.color}
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
            <ActivityIndicator size="small" color="#FFFFFF" />
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
                      color="#FFFFFF" 
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
                    <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyAccountsCard}>
            <View style={styles.emptyAccountsContainer}>
              <Ionicons name="wallet-outline" size={48} color="#666666" />
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
          </View>
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
              trackColor={{ false: '#333333', true: '#2196F3' }}
              thumbColor="#FFFFFF"
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
                    trackColor={{ false: '#333333', true: '#2196F3' }}
                    thumbColor="#FFFFFF"
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
    backgroundColor: '#000000', // Pure black background
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  headerRight: {
    width: 40, // Same width as back button for centering
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#111111', // Dark background
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#2196F3', // Blue active background
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#FFFFFF', // White active text
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeDescription: {
    fontSize: 12,
    color: '#666666', // Gray text
    textAlign: 'center',
  },
  // Mobile Amount Card
  mobileAmountCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginHorizontal: 0,
    marginBottom: 0,
    alignItems: 'center',
    paddingVertical: 24,
  },
  // Web Amount Card (for side-by-side layout)
  webAmountCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2196F3', // Blue accent
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
  },
  amountInputText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF', // White text
  },
  amountWords: {
    fontSize: 12,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 80,
  },
  categoryItemActive: {
    backgroundColor: '#111111', // Dark active background
    transform: [{ scale: 1.05 }],
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF', // White text
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#2196F3', // Blue active text
    fontWeight: '600',
  },
  accountsContainer: {
    paddingHorizontal: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  accountItemActive: {
    borderColor: '#2196F3', // Blue border
    backgroundColor: '#2196F310', // Blue tint
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
    marginRight: 16,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginTop: 2,
  },
  selectedIndicator: {
    padding: 4,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    marginLeft: 12,
    fontWeight: '500',
  },
  emptyAccountsCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: 32,
  },
  emptyAccountsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyAccountsText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '600',
    marginTop: 12,
  },
  emptyAccountsSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  createAccountButton: {
    backgroundColor: '#2196F3', // Blue button
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginLeft: 12,
  },
  saveButtonContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#000000', // Black background
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3', // Blue button
    paddingVertical: 16,
    borderRadius: 16,
    minHeight: 56,
  },
  saveButtonDisabled: {
    backgroundColor: '#666666', // Gray disabled
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 12,
  },
  // Web-specific styles for side-by-side layout
  rowSection: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 16,
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
    backgroundColor: '#000000', // Black background
  },
  webSaveButtonContainer: {
    padding: 16,
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recurringOptions: {
    backgroundColor: '#111111', // Dark background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    marginTop: 12,
  },
  recurringSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginBottom: 12,
  },
  frequencySection: {
    marginBottom: 16,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#000000', // Black background
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#2196F3', // Blue active
    borderColor: '#2196F3',
  },
  frequencyButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF', // White text
  },
  frequencyButtonTextActive: {
    color: '#FFFFFF', // White active text
  },
  reminderSection: {
    marginBottom: 16,
  },
  reminderInput: {
    width: 100,
  },
  autoTransactionSection: {
    marginBottom: 12,
  },
  autoTransactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoTransactionDescription: {
    fontSize: 12,
    color: '#666666', // Gray text
  },
});

export default AddTransactionScreen; 