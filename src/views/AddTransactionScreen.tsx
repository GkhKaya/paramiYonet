import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { observer } from 'mobx-react-lite';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { TransactionType } from '../models/Transaction';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { useCurrency, useCategory, useDate } from '../hooks';

const { width, height } = Dimensions.get('window');
const CATEGORY_ITEM_SIZE = (width - 60) / 4; // 4 columns with padding

interface AddTransactionScreenProps {
  route?: {
    params?: {
      defaultType?: 'income' | 'expense';
    };
  };
  navigation: any;
}

interface WebDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (event: any, date?: Date) => void;
}

const WebDatePickerModal: React.FC<WebDatePickerModalProps> = ({ visible, onClose, value, onChange }) => {
  const [tempDate, setTempDate] = useState(value.toISOString().split('T')[0]);

  const handleDateChange = (dateString: string) => {
    setTempDate(dateString);
  };

  const handleConfirm = () => {
    const selectedDate = new Date(tempDate);
    onChange({ type: 'set' } as any, selectedDate);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.webDatePickerBackdrop} onPress={onClose}>
        <Pressable style={styles.webDatePickerContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.webDatePickerHeader}>
            <Text style={styles.webDatePickerTitle}>Tarih Seç</Text>
            <TouchableOpacity onPress={onClose} style={styles.webDatePickerClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.webDatePickerContent}>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                backgroundColor: '#333333',
                border: '1px solid #555555',
                borderRadius: '8px',
                padding: '12px',
                color: '#FFFFFF',
                fontSize: '16px',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
            <View style={styles.webDatePickerButtons}>
              <TouchableOpacity style={styles.webDatePickerCancelButton} onPress={onClose}>
                <Text style={styles.webDatePickerCancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.webDatePickerConfirmButton} onPress={handleConfirm}>
                <Text style={styles.webDatePickerConfirmButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = observer(({ route, navigation }) => {
  const { user } = useAuth();
  const { accountViewModel, transactionViewModel } = useViewModels();
  
  const isWeb = Platform.OS === 'web';

  // States
  const [selectedType, setSelectedType] = useState<TransactionType>(
    route?.params?.defaultType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hooks
  const { formatCurrency, currencySymbol } = useCurrency();
  const { getAllCategories } = useCategory({ type: selectedType });
  const { formatShort } = useDate();

  const availableCategories = getAllCategories();

  // Web amount input handler
  const handleAmountChange = (text: string) => {
    if (text.length > 15) return;

    let filteredText = text.replace(/[^0-9,]/g, '');
    const parts = filteredText.split(',');
    if (parts.length > 2) {
      filteredText = parts[0] + ',' + parts.slice(1).join('');
    }
    
    if (filteredText.length > 1 && filteredText.startsWith('0') && !filteredText.startsWith('0,')) {
      filteredText = filteredText.substring(1);
    }
    
    if (filteredText === '') {
        setAmount('0');
    } else {
        setAmount(filteredText);
    }
  };

  // Numpad handlers
  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleDecimalPress = () => {
    if (!amount.includes(',')) {
      setAmount(amount + ',');
    }
  };

  const handleDeletePress = () => {
    if (amount.length > 1) {
      setAmount(amount.slice(0, -1));
    } else {
      setAmount('0');
    }
  };

  const handleClearPress = () => {
    setAmount('0');
  };

  // Transaction save
  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert('Hata', 'Lütfen kategori seçin');
      return;
    }

    if (amount === '0' || !amount) {
      Alert.alert('Hata', 'Lütfen tutar girin');
      return;
    }

    if (!user || !transactionViewModel) {
      Alert.alert('Hata', 'Sistem hatası');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    setLoading(true);

    const categoryDetails = availableCategories.find(cat => cat.name === selectedCategory);
    const defaultAccount = accountViewModel?.accounts?.[0];

    if (!defaultAccount) {
      Alert.alert('Hata', 'Varsayılan hesap bulunamadı');
      setLoading(false);
      return;
    }

    const transactionData = {
      userId: user.id,
      amount: numericAmount,
      description: description || selectedCategory,
      type: selectedType,
      category: selectedCategory,
      categoryIcon: categoryDetails?.icon || 'help-circle-outline',
      accountId: defaultAccount.id,
      date: selectedDate,
    };

    const success = await transactionViewModel.addTransaction(transactionData);
    
    setLoading(false);

    if (success) {
      // Reset form
      setAmount('0');
      setSelectedCategory('');
      setDescription('');
      setSelectedDate(new Date());
      
      Alert.alert('Başarılı', 'İşlem kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Hata', 'İşlem kaydedilemedi');
    }
  };

  // Transaction Type Tabs
  const TransactionTypeTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedType === TransactionType.EXPENSE && styles.activeTab
        ]}
        onPress={() => {
          setSelectedType(TransactionType.EXPENSE);
          setSelectedCategory(''); // Kategori seçimini resetle
        }}
      >
        <Text style={[
          styles.tabText,
          selectedType === TransactionType.EXPENSE && styles.activeTabText
        ]}>
          Gider
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          selectedType === TransactionType.INCOME && styles.activeTab
        ]}
        onPress={() => {
          setSelectedType(TransactionType.INCOME);
          setSelectedCategory(''); // Kategori seçimini resetle
        }}
      >
        <Text style={[
          styles.tabText,
          selectedType === TransactionType.INCOME && styles.activeTabText
        ]}>
          Gelir
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Category grid
  const CategoryGrid = () => (
    <View style={styles.categoryContainer}>
      <ScrollView 
        style={styles.categoryScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <View style={styles.categoryGrid}>
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={[
                styles.categoryItem,
                selectedCategory === category.name && styles.selectedCategoryItem
              ]}
              onPress={() => setSelectedCategory(category.name)}
            >
              <View style={[
                styles.categoryIcon,
                { backgroundColor: category.color },
                selectedCategory === category.name && styles.selectedCategoryIcon
              ]}>
                <Ionicons 
                  name={category.icon as any} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.name && styles.selectedCategoryText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Amount Display
  const AmountDisplay = () => (
    <View style={styles.amountContainer}>
      <Text style={styles.amountText}>
        {currencySymbol}{formatCurrency(parseFloat(amount.replace(',', '.')) || 0)}
      </Text>
    </View>
  );

  // Numpad
  const Numpad = () => (
    <View style={styles.numpadContainer}>
      {/* Description Input */}
      <View style={styles.descriptionContainer}>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Açıklama (isteğe bağlı)"
          placeholderTextColor="#666666"
          value={description}
          onChangeText={setDescription}
          multiline={false}
        />
      </View>

      {/* Numpad Grid */}
      <View style={styles.numpadGrid}>
        <View style={styles.numpadRow}>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('1')}>
            <Text style={styles.numpadButtonText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('2')}>
            <Text style={styles.numpadButtonText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('3')}>
            <Text style={styles.numpadButtonText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={handleDeletePress}>
            <Ionicons name="backspace-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.numpadRow}>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('4')}>
            <Text style={styles.numpadButtonText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('5')}>
            <Text style={styles.numpadButtonText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('6')}>
            <Text style={styles.numpadButtonText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={handleClearPress}>
            <Text style={styles.numpadOperatorText}>C</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.numpadRow}>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('7')}>
            <Text style={styles.numpadButtonText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('8')}>
            <Text style={styles.numpadButtonText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('9')}>
            <Text style={styles.numpadButtonText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={handleDecimalPress}>
            <Text style={styles.numpadOperatorText}>,</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.numpadRow}>
          <TouchableOpacity style={styles.numpadButton} onPress={() => setShowDatePicker(true)}>
            <View style={styles.todayButton}>
              <Ionicons name="calendar-outline" size={12} color="#2196F3" />
              <Text style={styles.todayButtonText}>{formatShort(selectedDate)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.numpadButton} onPress={() => handleNumberPress('0')}>
            <Text style={styles.numpadButtonText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.numpadButton, styles.saveButton]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Ionicons 
              name={loading ? "hourglass-outline" : "checkmark-outline"} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const WebLayout = () => (
    <View style={styles.webContent}>
      <View style={styles.webCategoriesContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <View style={[styles.categoryGrid, styles.webCategoryGrid]}>
            {availableCategories.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.categoryItem,
                  styles.webCategoryItem,
                  selectedCategory === category.name && styles.selectedCategoryItem
                ]}
                onPress={() => setSelectedCategory(category.name)}
              >
                <View style={[
                  styles.categoryIcon,
                  { backgroundColor: category.color },
                  selectedCategory === category.name && styles.selectedCategoryIcon
                ]}>
                  <Ionicons 
                    name={category.icon as any} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.name && styles.selectedCategoryText
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.webFormSection}>
        <ScrollView>
            <View style={styles.webFormContainer}>
            <View style={styles.webInputGroup}>
                <Text style={styles.webLabel}>Tutar</Text>
                <View style={styles.webAmountInputContainer}>
                <TextInput
                    style={styles.webAmountInput}
                    value={amount === '0' ? '' : amount}
                    onChangeText={handleAmountChange}
                    placeholder="0,00"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={15}
                />
                <Text style={styles.webCurrencySymbol}>{currencySymbol}</Text>
                </View>
            </View>

            <View style={styles.webInputGroup}>
                <Text style={styles.webLabel}>Açıklama</Text>
                <TextInput
                style={styles.webDescriptionInput}
                placeholder="Açıklama ekle"
                placeholderTextColor="#666"
                value={description}
                onChangeText={setDescription}
                maxLength={100}
                multiline
                />
            </View>

            <View style={styles.webInputGroup}>
                <Text style={styles.webLabel}>Tarih</Text>
                <TouchableOpacity style={styles.webDateButton} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.webDateButtonText}>{formatShort(selectedDate)}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={[styles.webSaveButton, (loading || amount === '0' || !selectedCategory) && styles.webSaveButtonDisabled]} 
                onPress={handleSave}
                disabled={loading || amount === '0' || !selectedCategory}
            >
                <Text style={styles.webSaveButtonText}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
                </Text>
            </TouchableOpacity>
            </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ekle</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Transaction Type Tabs */}
      <TransactionTypeTabs />

      {isWeb ? (
        <WebLayout />
      ) : (
        <>
          <CategoryGrid />
          <AmountDisplay />
          <Numpad />
        </>
      )}

      {/* Date Picker for Native */}
      {showDatePicker && !isWeb && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}
      
      {/* Date Picker for Web */}
      {isWeb &&
        <WebDatePickerModal
            visible={showDatePicker}
            onClose={() => setShowDatePicker(false)}
            value={selectedDate}
            onChange={(event, date) => {
              if (date) setSelectedDate(date);
            }}
        />
      }
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  cancelText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryContainer: {
    flex: 1,
    backgroundColor: '#000000',
    maxHeight: Platform.OS === 'web' ? undefined : height * 0.45,
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryScrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: CATEGORY_ITEM_SIZE,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedCategoryItem: {
    // Seçili durumda ikon çevresinde ring efekti
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedCategoryIcon: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#000000',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  numpadContainer: {
    backgroundColor: '#000000',
    paddingBottom: 15,
    maxHeight: height * 0.35,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
  },
  numpadGrid: {
    paddingHorizontal: 20,
  },
  numpadRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  numpadButton: {
    flex: 1,
    height: 42,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  numpadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  numpadOperatorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 3,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  // Web Layout Styles
  webContent: {
    flexDirection: 'row',
    flex: 1,
  },
  webCategoriesContainer: {
    flex: 2,
    borderRightWidth: 1,
    borderColor: '#1A1A1A',
  },
  webFormSection: {
    flex: 1,
  },
  webFormContainer: {
    padding: 20,
  },
  webInputGroup: {
    marginBottom: 20,
  },
  webLabel: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 8,
  },
  webAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  webAmountInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  webCurrencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  webDescriptionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  webDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
    justifyContent: 'center',
  },
  webDateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
  },
  webSaveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  webSaveButtonDisabled: {
    backgroundColor: '#4A5568',
  },
  webSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webCategoryGrid: {
    justifyContent: 'flex-start',
  },
  webCategoryItem: {
    width: '14%',
  },
  webDatePickerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  webDatePickerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    width: 350,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  webDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webDatePickerClose: {
    padding: 4,
  },
  webDatePicker: {
    backgroundColor: '#1A1A1A',
  },
  webDatePickerContent: {
    padding: 20,
  },
  webDatePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  webDatePickerCancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  webDatePickerCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  webDatePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  webDatePickerConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddTransactionScreen;