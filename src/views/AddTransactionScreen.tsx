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
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { TransactionType } from '../models/Transaction';
import { Account, AccountType } from '../models/Account';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { useCurrency, useCategory, useDate } from '../hooks';

const { width, height } = Dimensions.get('window');

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
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Hooks
  const { formatCurrency, currencySymbol } = useCurrency();
  const { getAllCategories } = useCategory({ type: selectedType });
  const { formatShort } = useDate();

  const availableCategories = getAllCategories();
  const availableAccounts = accountViewModel?.accounts.filter(acc => 
    acc.isActive && acc.type !== AccountType.GOLD
  ) || [];

  // Sık kullanılan kategoriler (tip bazında)
  const getFrequentCategories = () => {
    if (selectedType === TransactionType.EXPENSE) {
      return availableCategories.filter(cat => 
        ['Yemek', 'Ulaşım', 'Market', 'Yakıt', 'Kafe'].includes(cat.name)
      ).slice(0, 4);
    } else {
      return availableCategories.filter(cat => 
        ['Maaş', 'Freelance', 'Yatırım', 'Diğer'].includes(cat.name)
      ).slice(0, 4);
    }
  };

  const frequentCategories = getFrequentCategories();

  // İlk hesabı otomatik seç (kullanıcı deneyimi için)
  useEffect(() => {
    if (availableAccounts.length > 0 && !selectedCard) {
      setSelectedCard(availableAccounts[0]);
    }
  }, [availableAccounts, selectedCard]);

  // Kategori eklendikten sonra listeyi yenile
  useFocusEffect(
    React.useCallback(() => {
      // Ekran focus olduğunda kategorileri yenile
      // Bu sayede yeni eklenen kategoriler görünür
    }, [])
  );

  // Hesap tipi için Türkçe isimleri
  const getAccountTypeName = (type: AccountType): string => {
    switch (type) {
      case AccountType.CASH:
        return 'Nakit';
      case AccountType.DEBIT_CARD:
        return 'Banka Kartı';
      case AccountType.CREDIT_CARD:
        return 'Kredi Kartı';
      case AccountType.SAVINGS:
        return 'Tasarruf Hesabı';
      case AccountType.INVESTMENT:
        return 'Yatırım Hesabı';
      default:
        return 'Hesap';
    }
  };

  // Amount formatting
  const handleAmountChange = (text: string) => {
    // Sadece sayı ve virgül kabul et
    let filtered = text.replace(/[^0-9,]/g, '');
    
    // Çoklu virgülü engelle
    const commaCount = (filtered.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = filtered.indexOf(',');
      filtered = filtered.substring(0, firstCommaIndex + 1) + filtered.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    // Virgülden sonra max 2 basamak
    if (filtered.includes(',')) {
      const parts = filtered.split(',');
      if (parts[1] && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
      }
      filtered = parts[0] + ',' + (parts[1] || '');
    }
    
    setAmount(filtered);
  };

  const getNumericAmount = (): number => {
    if (!amount || amount.trim() === '') return 0;
    const numericValue = parseFloat(amount.replace(',', '.'));
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const handleSave = async () => {
    const numericAmount = getNumericAmount();
    
    if (!selectedCategory) {
      Alert.alert('Hata', 'Lütfen kategori seçin');
      return;
    }

    if (numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    if (!user || !transactionViewModel) {
      Alert.alert('Hata', 'Sistem hatası');
      return;
    }

    setLoading(true);

    const categoryDetails = availableCategories.find(cat => cat.name === selectedCategory);
    
    if (!selectedCard) {
      Alert.alert('Hata', 'Lütfen hesap seçin');
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
      accountId: selectedCard.id,
      date: selectedDate,
    };

    const success = await transactionViewModel.addTransaction(transactionData);
    
    setLoading(false);

    if (success) {
      Alert.alert('Başarılı', 'İşlem kaydedildi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Hata', 'İşlem kaydedilemedi');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {selectedType === TransactionType.INCOME ? 'Gelir Ekle' : 'Gider Ekle'}
      </Text>
      <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={loading}>
        <Text style={[styles.saveButtonText, loading && styles.saveButtonDisabled]}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.EXPENSE && styles.typeButtonActive,
          { backgroundColor: selectedType === TransactionType.EXPENSE ? '#2196F3' : '#2A2A2A' }
        ]}
        onPress={() => {
          setSelectedType(TransactionType.EXPENSE);
          setSelectedCategory('');
        }}
      >
        <Ionicons 
          name="remove-circle" 
          size={24} 
          color={selectedType === TransactionType.EXPENSE ? '#FFFFFF' : '#888888'} 
        />
        <Text style={[
          styles.typeButtonText,
          { color: selectedType === TransactionType.EXPENSE ? '#FFFFFF' : '#888888' }
        ]}>
          Gider
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.INCOME && styles.typeButtonActive,
          { backgroundColor: selectedType === TransactionType.INCOME ? '#2196F3' : '#2A2A2A' }
        ]}
        onPress={() => {
          setSelectedType(TransactionType.INCOME);
          setSelectedCategory('');
          setSelectedCard(null);
        }}
      >
        <Ionicons 
          name="add-circle" 
          size={24} 
          color={selectedType === TransactionType.INCOME ? '#FFFFFF' : '#888888'} 
        />
        <Text style={[
          styles.typeButtonText,
          { color: selectedType === TransactionType.INCOME ? '#FFFFFF' : '#888888' }
        ]}>
          Gelir
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAmountInput = () => (
    <View style={styles.amountMainSection}>
      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="0,00"
          placeholderTextColor="#666666"
          keyboardType="numeric"
          maxLength={15}
          selectTextOnFocus={true}
          autoFocus={true}
        />
      </View>
    </View>
  );

  const renderQuickAmountButtons = () => {
    const quickAmounts = selectedType === TransactionType.EXPENSE 
      ? ['10', '25', '50', '100', '200', '500']
      : ['100', '500', '1000', '2000', '5000', '10000'];
    
    return (
      <View style={styles.quickAmountSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickAmountContainer}>
          {quickAmounts.map((quickAmount) => (
            <TouchableOpacity
              key={quickAmount}
              style={styles.quickAmountButton}
              onPress={() => setAmount(quickAmount)}
            >
              <Text style={styles.quickAmountText}>{quickAmount}₺</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCategorySelector = () => (
    <View style={styles.categoryFrequentSection}>
      <Text style={styles.sectionTitle}>Kategori</Text>
      
      {/* Sık Kullanılan Kategoriler */}
      <View style={styles.frequentCategoriesContainer}>
        {frequentCategories.map((category) => (
          <TouchableOpacity
            key={category.name}
            style={styles.frequentCategoryItem}
            onPress={() => setSelectedCategory(category.name)}
          >
            <View style={[
              styles.frequentCategoryIcon,
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
              styles.frequentCategoryText,
              selectedCategory === category.name && styles.selectedCategoryText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Tümünü Gör Butonu */}
        <TouchableOpacity
          style={styles.showAllCategoriesButton}
          onPress={() => setShowAllCategories(true)}
        >
          <View style={styles.showAllCategoriesIcon}>
            <Ionicons name="grid-outline" size={24} color="#888888" />
          </View>
          <Text style={styles.showAllCategoriesText}>Tümü</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsSection = () => (
    <View style={styles.detailsCompactSection}>
      <Text style={styles.sectionTitle}>Detaylar</Text>
      
      <View style={styles.detailsRow}>
        <TouchableOpacity style={styles.detailButton} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
          <Text style={styles.detailButtonText}>{formatShort(selectedDate)}</Text>
        </TouchableOpacity>
        
        {availableAccounts.length > 0 && (
          <TouchableOpacity 
            style={styles.detailButton}
            onPress={() => setShowAccountPicker(true)}
          >
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.detailButtonText}>
              {selectedCard ? selectedCard.name : 'Hesap Seç'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#888888" />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.descriptionCompactInput}
        value={description}
        onChangeText={setDescription}
        placeholder="Açıklama (opsiyonel)"
        placeholderTextColor="#666666"
        maxLength={100}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTypeSelector()}
        
        {/* Ana tutar girişi - En üstte ve büyük */}
        {renderAmountInput()}
        
        {/* Hızlı tutar butonları */}
        {renderQuickAmountButtons()}
        
        {/* Kategori seçimi - Kompakt */}
        {renderCategorySelector()}
        
        {/* Detaylar - Kompakt */}
        {renderDetailsSection()}
      </ScrollView>

      {/* All Categories Modal */}
      <Modal
        visible={showAllCategories}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAllCategories(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAllCategories(false)}>
          <Pressable style={styles.categoriesModalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tüm Kategoriler</Text>
              <TouchableOpacity onPress={() => setShowAllCategories(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoriesModalContent}>
              <View style={styles.categoriesModalGrid}>
                {/* Kategori Ekleme Butonu */}
                <TouchableOpacity
                  style={styles.categoryModalItem}
                  onPress={() => {
                    setShowAllCategories(false);
                    navigation.navigate('AddCategory', { 
                      defaultType: selectedType === TransactionType.INCOME ? 'income' : 'expense' 
                    });
                  }}
                >
                  <View style={[styles.categoryModalIcon, { backgroundColor: '#4CAF50' }]}>
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.categoryModalText}>Yeni Ekle</Text>
                </TouchableOpacity>
                
                {/* Mevcut Kategoriler */}
                {availableCategories.map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    style={[
                      styles.categoryModalItem,
                      selectedCategory === category.name && styles.categoryModalItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(category.name);
                      setShowAllCategories(false);
                    }}
                  >
                    <View style={[
                      styles.categoryModalIcon,
                      { backgroundColor: category.color },
                      selectedCategory === category.name && styles.selectedCategoryIcon
                    ]}>
                      <Ionicons 
                        name={category.icon as any} 
                        size={28} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <Text style={[
                      styles.categoryModalText,
                      selectedCategory === category.name && styles.selectedCategoryText
                    ]}>
                      {category.name}
                    </Text>
                    {selectedCategory === category.name && (
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.categoryCheckmark} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAccountPicker(false)}>
          <Pressable style={styles.accountModalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hesap Seç</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.accountModalContent}>
              {/* Kullanıcı hesapları */}
              {availableAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountModalItem,
                    selectedCard?.id === account.id && styles.accountModalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCard(account);
                    setShowAccountPicker(false);
                  }}
                >
                  <View style={styles.accountModalIcon}>
                    <Ionicons 
                      name={account.type === AccountType.CREDIT_CARD ? "card" : 
                            account.type === AccountType.SAVINGS ? "cash" : 
                            account.type === AccountType.CASH ? "wallet" :
                            account.type === AccountType.INVESTMENT ? "trending-up" :
                            "card-outline"} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.accountModalTextContainer}>
                    <Text style={styles.accountModalName}>{account.name}</Text>
                    <Text style={styles.accountModalType}>{getAccountTypeName(account.type)}</Text>
                  </View>
                  {selectedCard?.id === account.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'web' ? (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)}>
              <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tarih Seç</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalContent}>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(new Date(e.target.value));
                      setShowDatePicker(false);
                    }}
                    style={{
                      backgroundColor: '#2A2A2A',
                      border: '1px solid #444444',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      width: '100%',
                    }}
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setSelectedDate(date);
            }}
          />
        )
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
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerButton: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'right',
  },
  saveButtonDisabled: {
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 30,
    gap: 15,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonActive: {
    // Renk dinamik olarak verilecek
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Ana tutar girişi - büyük ve öne çıkan
  amountMainSection: {
    marginTop: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    paddingHorizontal: 25,
    paddingVertical: 20,
    minWidth: '80%',
    justifyContent: 'center',
  },
  // Hızlı tutar butonları
  quickAmountSection: {
    marginBottom: 25,
  },
  quickAmountContainer: {
    paddingHorizontal: 10,
    gap: 10,
  },
  quickAmountButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  amountPreview: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
  },
  // Sık kullanılan kategoriler + Tümü butonu
  categoryFrequentSection: {
    marginBottom: 25,
  },
  frequentCategoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  frequentCategoryItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  frequentCategoryIcon: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  frequentCategoryText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  showAllCategoriesButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  showAllCategoriesIcon: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
  },
  showAllCategoriesText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedCategoryIcon: {
    borderWidth: 3,
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
  // Kompakt detaylar kısmı
  detailsCompactSection: {
    marginBottom: 30,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8,
  },
  detailButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  descriptionCompactInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    gap: 5,
  },
  accountChipWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 10,
    gap: 8,
    minWidth: 120,
  },
  accountChipSelected: {
    backgroundColor: '#4CAF50',
  },
  accountChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  accountChipTextContainer: {
    flex: 1,
  },
  accountChipType: {
    fontSize: 11,
    color: '#CCCCCC',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    width: 300,
    maxWidth: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    padding: 20,
  },
  // Account Modal Styles
  accountModalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  accountModalContent: {
    maxHeight: 400,
  },
  accountModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  accountModalItemSelected: {
    backgroundColor: '#2A2A2A',
  },
  accountModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  accountModalTextContainer: {
    flex: 1,
  },
  accountModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  accountModalType: {
    fontSize: 14,
    color: '#888888',
  },
  // Categories Modal Styles
  categoriesModalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  categoriesModalContent: {
    maxHeight: 500,
    paddingHorizontal: 10,
  },
  categoriesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryModalItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  categoryModalItemSelected: {
    // Seçili item için ek stil
  },
  categoryModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryModalText: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryCheckmark: {
    position: 'absolute',
    top: -5,
    right: 5,
  },
});

export default AddTransactionScreen;