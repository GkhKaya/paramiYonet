import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Transaction, TransactionType } from '../models/Transaction';
import { useViewModels } from '../contexts/ViewModelContext';
import { useCurrency, useCategory, useDate } from '../hooks';
import { COLORS } from '../constants';
import CustomAlert, { AlertType } from '../components/common/CustomAlert';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../models/Category';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface TransactionDetailScreenProps {
  route: {
    params: {
      transactionId: string;
    };
  };
  navigation: any;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = observer(({ route, navigation }) => {
  const { transactionId } = route.params;
  const { transactionViewModel, accountViewModel } = useViewModels();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Modal States
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date(),
    accountId: '',
  });

  const { formatCurrency } = useCurrency();
  const { getDetails } = useCategory();
  const { formatLong, formatTime, formatShort } = useDate();

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const formatDate = (date: Date) => {
    return formatShort(date);
  };

  useEffect(() => {
    if (transaction) {
      setSelectedTransaction(transaction);
    }
  }, [transaction]);

  useEffect(() => {
    if (selectedTransaction) {
      setEditForm({
        amount: selectedTransaction.amount.toString(),
        description: selectedTransaction.description,
        category: selectedTransaction.category,
        date: selectedTransaction.date,
        accountId: selectedTransaction.accountId,
      });
    }
  }, [selectedTransaction, modalVisible]);

  const getFrequentCategories = () => {
    const availableCategories = selectedTransaction?.type === TransactionType.INCOME 
      ? DEFAULT_INCOME_CATEGORIES 
      : DEFAULT_EXPENSE_CATEGORIES;
    return availableCategories.slice(0, 4);
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction || !transactionViewModel) return;
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }
    if (!editForm.description.trim()) {
      Alert.alert('Hata', 'Açıklama gereklidir');
      return;
    }
    const updates = {
      amount,
      description: editForm.description.trim(),
      category: editForm.category,
      date: editForm.date,
      accountId: editForm.accountId,
    };
    const success = await transactionViewModel.updateTransaction(selectedTransaction.id, updates);
    if (success) {
      closeModal();
      Alert.alert('Başarılı', 'İşlem güncellendi');
      const updatedTx = await transactionViewModel.getTransactionById(selectedTransaction.id);
      if(updatedTx) setTransaction(updatedTx);
    } else {
      Alert.alert('Hata', 'İşlem güncellenemedi');
    }
  };

  const handleDeleteTransaction = () => {
    if (!selectedTransaction || !transactionViewModel) return;
    closeModal(); // Close the detail modal before showing the alert
    setTimeout(() => {
        Alert.alert(
          'İşlemi Sil',
          'Bu işlemi silmek istediğinizden emin misiniz?',
          [
            { text: 'İptal', style: 'cancel', onPress: () => setModalVisible(true) }, // Re-open modal if cancelled
            {
              text: 'Sil',
              style: 'destructive',
              onPress: async () => {
                const success = await transactionViewModel.deleteTransaction(selectedTransaction.id);
                if (success) {
                  Alert.alert('Başarılı', 'İşlem silindi');
                  navigation.goBack();
                } else {
                  Alert.alert('Hata', 'İşlem silinemedi');
                }
              },
            },
          ]
        );
    }, 500);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowDatePicker(false);
    setShowCategoriesModal(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditForm(prev => ({ ...prev, date: selectedDate }));
    }
  };
  
  const handleEdit = () => {
    setModalVisible(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'İşlemi Sil',
      'Bu işlemi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (transaction) {
              const success = await transactionViewModel?.deleteTransaction(transaction.id);
              if (success) {
                Alert.alert('Başarılı', 'İşlem silindi');
                navigation.goBack();
              } else {
                Alert.alert('Hata', 'İşlem silinemedi');
              }
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true);
        const foundTransaction = await transactionViewModel?.getTransactionById(transactionId);
        
        if (foundTransaction) {
          setTransaction(foundTransaction);
        } else {
          showAlert('error', 'Hata', 'İşlem bulunamadı');
          setTimeout(() => navigation.goBack(), 2000);
        }
      } catch (error) {
        console.error('Error loading transaction:', error);
        showAlert('error', 'Hata', 'İşlem yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    loadTransaction();
  }, [transactionId, transactionViewModel]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>İşlem Detayları Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
          <Text style={styles.loadingText}>İşlem bulunamadı.</Text>
        </View>
        <CustomAlert
          visible={alertVisible}
          type={alertType}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
          onPrimaryPress={() => setAlertVisible(false)}
        />
      </SafeAreaView>
    );
  }
  
  const TransactionModal = () => {
    if (!selectedTransaction) return null;

    const isIncome = selectedTransaction.type === TransactionType.INCOME;
    const availableCategories = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          <View style={styles.modernModalHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={closeModal} style={styles.headerButton}>
                <View style={styles.headerButtonBackground}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
            </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modernModalTitle}>Düzenle</Text>
                <Text style={styles.modalSubtitle}>
                  {formatDate(selectedTransaction.date)}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={handleEditTransaction} 
                style={styles.headerButton}
              >
                <View style={[styles.headerButtonBackground, styles.saveButton]}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.minimalistContent} showsVerticalScrollIndicator={false}>
              <>
                <View style={styles.topRowContainer}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.compactLabel}>Tutar</Text>
                    <TextInput
                      style={styles.compactInput}
                      value={editForm.amount}
                      onChangeText={(value) => setEditForm(prev => ({ ...prev, amount: value }))}
                      keyboardType="numeric"
                      placeholder="0,00"
                      placeholderTextColor="#666666"
                    />
                  </View>
                  
                  <View style={styles.halfWidth}>
                    <Text style={styles.compactLabel}>Tarih</Text>
                    <TouchableOpacity
                      style={styles.compactDateButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.compactDateText}>
                        {formatDate(editForm.date)}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#2196F3" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.compactSection}>
                  <Text style={styles.compactLabel}>Açıklama</Text>
                  <TextInput
                    style={styles.compactInput}
                    value={editForm.description}
                    onChangeText={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                    placeholder="İşlem açıklaması"
                    placeholderTextColor="#666666"
                  />
                </View>

                <View style={styles.compactSection}>
                  <Text style={styles.compactLabel}>Kategori</Text>
                  <View style={styles.frequentCategoriesContainer}>
                    {getFrequentCategories().map((category) => (
                        <TouchableOpacity
                        key={category.name}
                        style={styles.frequentCategoryItem}
                        onPress={() => setEditForm(prev => ({ ...prev, category: category.name }))}
                        >
                        <View style={[
                          styles.frequentCategoryIcon,
                          { backgroundColor: category.color },
                          editForm.category === category.name && styles.selectedCategoryIcon
                        ]}>
                          <Ionicons 
                            name={category.icon as any} 
                            size={20} 
                            color="#FFFFFF" 
                          />
                        </View>
                          <Text style={[
                          styles.frequentCategoryText,
                          editForm.category === category.name && styles.selectedCategoryText
                          ]}>
                          {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  
                    <TouchableOpacity
                      style={styles.showAllCategoriesButton}
                      onPress={() => setShowCategoriesModal(true)}
                    >
                      <View style={styles.showAllCategoriesIcon}>
                        <Ionicons name="grid-outline" size={20} color="#888888" />
                      </View>
                      <Text style={styles.showAllCategoriesText}>Tümü</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.compactSection}>
                  <Text style={styles.compactLabel}>Hesap</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScrollView}>
                    {accountViewModel?.accounts
                      .filter(acc => acc.type !== 'gold')
                      .map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountItem,
                          editForm.accountId === account.id && styles.accountItemSelected,
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, accountId: account.id }))}
                      >
                        <Ionicons 
                          name={account.icon as any || 'wallet'} 
                          size={20} 
                          color={editForm.accountId === account.id ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                        />
                        <Text 
                          style={[
                            styles.accountItemText,
                            editForm.accountId === account.id && styles.accountItemTextSelected,
                          ]}
                        >
                          {account.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {Platform.OS === 'ios' && showDatePicker && (
                  <Modal
                    visible={showDatePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowDatePicker(false)}
                  >
                    <View style={styles.datePickerOverlay}>
                      <View style={styles.datePickerContainer}>
                        <View style={styles.datePickerHeader}>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            style={styles.datePickerButton}
                          >
                            <Text style={styles.datePickerButtonText}>İptal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            style={styles.datePickerButton}
                          >
                            <Text style={[styles.datePickerButtonText, styles.datePickerDone]}>Tamam</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={editForm.date}
                          mode="date"
                          display="spinner"
                          onChange={handleDateChange}
                          textColor="#FFFFFF"
                          locale="tr-TR"
                        />
                      </View>
                    </View>
                  </Modal>
                )}
                
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={editForm.date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </>
          </ScrollView>

          <View style={styles.modernActions}>
            <TouchableOpacity
              style={[styles.modernActionButton, styles.cancelActionButton]}
              onPress={closeModal}
            >
              <Text style={[styles.actionButtonText, styles.cancelActionText]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modernActionButton, styles.saveActionButton]}
              onPress={handleEditTransaction}
            >
              <Text style={[styles.actionButtonText, styles.saveActionText]}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Modal
          visible={showCategoriesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoriesModal(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCategoriesModal(false)}>
            <Pressable style={styles.categoriesModalContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.categoriesModalHeader}>
                <Text style={styles.categoriesModalTitle}>Tüm Kategoriler</Text>
                <TouchableOpacity onPress={() => setShowCategoriesModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.categoriesModalContent}>
                <View style={styles.categoriesModalGrid}>
                  {availableCategories.map((category) => (
                    <TouchableOpacity
                      key={category.name}
                      style={[
                        styles.categoryModalItem,
                        editForm.category === category.name && styles.categoryModalItemSelected
                      ]}
                      onPress={() => {
                        setEditForm(prev => ({ ...prev, category: category.name }));
                        setShowCategoriesModal(false);
                      }}
                    >
                      <View style={[
                        styles.categoryModalIcon,
                        { backgroundColor: category.color },
                        editForm.category === category.name && styles.selectedCategoryIcon
                      ]}>
                        <Ionicons 
                          name={category.icon as any} 
                          size={28} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <Text style={[
                        styles.categoryModalText,
                        editForm.category === category.name && styles.selectedCategoryText
                      ]}>
                        {category.name}
                      </Text>
                      {editForm.category === category.name && (
                        <View style={styles.categoryCheckmark}>
                          <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </Modal>
    );
  };

  const isIncome = transaction.type === TransactionType.INCOME;
  const amountColor = isIncome ? '#4CAF50' : '#F44336';
  const categoryDetails = getDetails(transaction.category, transaction.type);
  const account = accountViewModel?.accounts.find(acc => acc.id === transaction.accountId);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşlem Detayı</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Ionicons name="create-outline" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.topSection}>
            <View style={[styles.categoryIcon, { backgroundColor: categoryDetails.color }]}>
              <Ionicons 
                name={categoryDetails.icon as any} 
                size={32} 
                color="#FFFFFF"
              />
            </View>
            <View style={[styles.typeChip, { backgroundColor: amountColor }]}>
              <Ionicons 
                name={isIncome ? "add-circle" : "remove-circle"} 
                size={16} 
                color="#FFFFFF" 
                style={{ marginRight: 4 }}
              />
              <Text style={styles.typeChipText}>{isIncome ? 'Gelir' : 'Gider'}</Text>
            </View>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.description}>{transaction.description}</Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsList}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.GRAY} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Tarih</Text>
            <Text style={styles.detailValue}>{formatLong(transaction.date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={20} color={COLORS.GRAY} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Saat</Text>
            <Text style={styles.detailValue}>{formatTime(transaction.date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="grid-outline" size={20} color={COLORS.GRAY} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailValue}>{transaction.category}</Text>
          </View>
          {account && (
            <View style={styles.detailItem}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.GRAY} style={styles.detailIcon} />
              <Text style={styles.detailLabel}>Hesap</Text>
              <Text style={styles.detailValue}>{account.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} />
            <Text style={[styles.actionButtonText, { color: COLORS.ERROR }]}>Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TransactionModal />

      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onPrimaryPress={() => setAlertVisible(false)}
        onClose={() => setAlertVisible(false)}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.WHITE,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  typeChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoSection: {
    alignItems: 'flex-start',
  },
  description: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  detailsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  detailIcon: {
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 16,
    color: COLORS.GRAY,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles from TransactionsScreen
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modernModalHeader: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modernModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
    textAlign: 'center',
  },
  minimalistContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 6,
  },
  compactInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  compactDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  compactDateText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  compactSection: {
    marginBottom: 16,
  },
  viewModeContainer: {
    paddingTop: 8,
  },
  amountDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  displayAmount: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  frequentCategoryText: {
    fontSize: 11,
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  showAllCategoriesText: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedCategoryIcon: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  datePickerDone: {
    fontWeight: '600',
  },
  modernActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  editActionButton: {
    backgroundColor: '#2196F3',
  },
  saveActionButton: {
    backgroundColor: '#2196F3',
  },
  cancelActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteActionText: {
    color: '#F44336',
  },
  editActionText: {
    color: '#FFFFFF',
  },
  saveActionText: {
    color: '#FFFFFF',
  },
  cancelActionText: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  categoriesModalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  categoriesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoriesModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoriesModalContent: {
    maxHeight: 400,
  },
  categoriesModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  categoryModalItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
    position: 'relative',
  },
  categoryModalItemSelected: {},
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
  infoLabel: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  accountScrollView: {
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  accountItemSelected: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: COLORS.PRIMARY,
  },
  accountItemText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  accountItemTextSelected: {
    color: COLORS.WHITE,
  },
});

export default TransactionDetailScreen; 