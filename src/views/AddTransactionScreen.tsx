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

const AddTransactionScreen: React.FC<AddTransactionScreenProps> = observer(({ route, navigation }) => {
  const { user } = useAuth();
  const { accountViewModel, transactionViewModel } = useViewModels();
  
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
        {currencySymbol}{formatCurrency(amount)}
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

      {/* Category Grid */}
      <CategoryGrid />

      {/* Amount Display */}
      <AmountDisplay />

      {/* Numpad */}
      <Numpad />

      {/* Date Picker */}
      {showDatePicker && (
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
    maxHeight: height * 0.45,
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
    gap: 3,
  },
  todayButtonText: {
    fontSize: 10,
    color: '#2196F3',
    fontWeight: '500',
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
});

export default AddTransactionScreen;