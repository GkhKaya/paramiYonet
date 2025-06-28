import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  StatusBar,
  Platform,
  TextInput,
  Pressable,
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
import { Transaction, TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';
import { useCurrency, useCategory, useDate } from '../hooks';


// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface TransactionsScreenProps {
  navigation: any;
}

const TransactionsScreen: React.FC<TransactionsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const { transactionViewModel: viewModel } = useViewModels();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date(),
  });

  // Get frequent categories (same logic as AddTransactionScreen)
  const getFrequentCategories = () => {
    const availableCategories = selectedTransaction?.type === TransactionType.INCOME 
      ? DEFAULT_INCOME_CATEGORIES 
      : DEFAULT_EXPENSE_CATEGORIES;
    
    // Show top 4 categories instead of all
    return availableCategories.slice(0, 4);
  };

  // Custom hooks
  const { formatCurrency, currencySymbol, parseInput } = useCurrency({ maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const { getDetails } = useCategory();
  const { formatShort, formatMonthYear, formatTime } = useDate();

  // Edit transaction'ı aç (viewModel'den gelen editTransactionId kontrolü)
  useEffect(() => {
    if (viewModel?.editTransactionId && viewModel?.transactions) {
      const transaction = viewModel.transactions.find(t => t.id === viewModel.editTransactionId);
      if (transaction) {
        handleEditTransactionPress(transaction);
        // Edit modunu aç ve editTransactionId'yi temizle
        viewModel.clearEditTransactionId();
      }
    }
  }, [viewModel?.editTransactionId, viewModel?.transactions]);

  const formatDate = (date: Date) => {
    return formatShort(date);
  };

  const formatDateTime = (date: Date) => {
    return `${formatShort(date)} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatMonth = (date: Date) => {
    return formatMonthYear(date);
  };

  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    return getDetails(categoryName, type);
  };



  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction.id });
  };

  const handleEditTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
    });
    setEditMode(true);
    setModalVisible(true);
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction || !viewModel) return;

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
    };

    const success = await viewModel.updateTransaction(selectedTransaction.id, updates);
    
    if (success) {
      setModalVisible(false);
      setEditMode(false);
      Alert.alert('Başarılı', 'İşlem güncellendi');
    } else {
      Alert.alert('Hata', 'İşlem güncellenemedi');
    }
  };

  const handleDeleteTransaction = () => {
    if (!selectedTransaction || !viewModel) return;

    Alert.alert(
      'İşlemi Sil',
      'Bu işlemi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const success = await viewModel.deleteTransaction(selectedTransaction.id);
            if (success) {
              setModalVisible(false);
              Alert.alert('Başarılı', 'İşlem silindi');
            } else {
              Alert.alert('Hata', 'İşlem silinemedi');
            }
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditMode(false);
    setSelectedTransaction(null);
    setShowDatePicker(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditForm(prev => ({ ...prev, date: selectedDate }));
    }
  };

  const FilterButton = ({ 
    title, 
    isActive, 
    onPress 
  }: {
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton, 
        isActive && styles.filterButtonActive
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const TransactionItem = ({ item }: { item: Transaction }) => {
    const category = getCategoryDetails(item.category, item.type);
    const isIncome = item.type === TransactionType.INCOME;

    return (
      <TouchableOpacity style={styles.transactionItem} onPress={() => handleTransactionPress(item)}>
        <View style={styles.transactionCard}>
          <View style={styles.transactionContent}>
            <View style={styles.transactionLeft}>
              <View style={[
                styles.categoryIconContainer,
                { backgroundColor: category.color }
              ]}>
              <Ionicons 
                name={category.icon as any} 
                size={20} 
                color="#FFFFFF" 
              />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{item.description}</Text>
                <Text style={styles.transactionCategory}>{item.category}</Text>
                <Text style={styles.transactionDate}>{formatDateTime(item.date)}</Text>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <Text style={[
                styles.transactionAmount,
                { color: isIncome ? '#4CAF50' : '#F44336' }
              ]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={16} 
                color="#666666" 
                style={styles.transactionChevron}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };



  const MonthSelector = () => (
    <View style={styles.monthSelector}>
      <TouchableOpacity 
        style={styles.monthButton}
        onPress={() => viewModel?.goToPreviousMonth()}
      >
        <Ionicons name="chevron-back" size={20} color="#2196F3" />
      </TouchableOpacity>
      
      <Text style={styles.monthText}>{formatMonth(viewModel?.currentMonth || new Date())}</Text>
      
      <TouchableOpacity 
        style={styles.monthButton}
        onPress={() => viewModel?.goToNextMonth()}
      >
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color="#2196F3"
        />
      </TouchableOpacity>
    </View>
  );

  const DayGroupHeader = ({ dayGroup }: { dayGroup: any }) => (
    <View style={[
      styles.sectionHeader,
      Platform.OS === 'web' && styles.webSectionHeader
    ]}>
      <Text style={styles.sectionTitle}>{dayGroup.displayDate}</Text>
      <Text style={[
        styles.sectionAmount,
        { color: dayGroup.netAmount >= 0 ? '#4CAF50' : '#F44336' }
      ]}>
        {dayGroup.netAmount >= 0 ? '+' : ''}{formatCurrency(Math.abs(dayGroup.netAmount))}
      </Text>
    </View>
  );

  const TransactionModal = () => {
    if (!selectedTransaction) return null;

    const isIncome = selectedTransaction.type === TransactionType.INCOME;
    const category = getCategoryDetails(selectedTransaction.category, selectedTransaction.type);
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
          
          {/* Modern Header with Glass Effect */}
          <View style={styles.modernModalHeader}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={closeModal} style={styles.headerButton}>
                <View style={styles.headerButtonBackground}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
            </TouchableOpacity>
              
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modernModalTitle}>
                  {editMode ? 'Düzenle' : 'İşlem Detayı'}
            </Text>
                <Text style={styles.modalSubtitle}>
                  {formatDate(selectedTransaction.date)}
                </Text>
          </View>

              {!editMode && (
                <TouchableOpacity 
                  onPress={() => setEditMode(true)} 
                  style={styles.headerButton}
                >
                  <View style={styles.headerButtonBackground}>
                    <Ionicons name="create-outline" size={20} color="#2196F3" />
                  </View>
                </TouchableOpacity>
              )}
              
              {editMode && (
                <TouchableOpacity 
                  onPress={handleEditTransaction} 
                  style={styles.headerButton}
                >
                  <View style={[styles.headerButtonBackground, styles.saveButton]}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}
              </View>
            </View>

          <ScrollView style={styles.minimalistContent} showsVerticalScrollIndicator={false}>
              {editMode ? (
              // Edit Mode - Compact Layout
              <>
                {/* Top Row: Amount + Date */}
                <View style={styles.topRowContainer}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.compactLabel}>Tutar</Text>
                    <TextInput
                      style={styles.compactInput}
                  value={editForm.amount}
                      onChangeText={(value: string) => setEditForm(prev => ({ ...prev, amount: value }))}
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

            {/* Description */}
                <View style={styles.compactSection}>
                  <Text style={styles.compactLabel}>Açıklama</Text>
                  <TextInput
                    style={styles.compactInput}
                  value={editForm.description}
                    onChangeText={(value: string) => setEditForm(prev => ({ ...prev, description: value }))}
                  placeholder="İşlem açıklaması"
                    placeholderTextColor="#666666"
                />
            </View>

                                {/* Category Selector - AddTransactionScreen Style */}
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
                  
                    {/* Tümünü Gör Butonu */}
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

                {/* Date Picker Modals */}
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
              ) : (
              // View Mode - Clean Display
              <View style={styles.viewModeContainer}>
                <View style={styles.amountDisplayContainer}>
                  <Text style={[styles.displayAmount, { color: isIncome ? '#00E676' : '#FF1744' }]}>
                    {isIncome ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                  </Text>
                  <View style={[styles.typeChip, { backgroundColor: isIncome ? '#00E676' : '#FF1744' }]}>
                    <Text style={styles.typeChipText}>
                      {isIncome ? 'Gelir' : 'Gider'}
                    </Text>
            </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Açıklama</Text>
                  <Text style={styles.infoValue}>{selectedTransaction.description}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kategori</Text>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                    <Text style={styles.infoValue}>{selectedTransaction.category}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tarih</Text>
                  <Text style={styles.infoValue}>{formatDate(selectedTransaction.date)}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modern Action Buttons */}
          <View style={styles.modernActions}>
            {editMode ? (
              <>
                <TouchableOpacity
                  style={[styles.modernActionButton, styles.cancelActionButton]}
                  onPress={() => setEditMode(false)}
                >
                  <Text style={[styles.actionButtonText, styles.cancelActionText]}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modernActionButton, styles.editActionButton]}
                  onPress={handleEditTransaction}
                >
                  <Text style={[styles.actionButtonText, styles.editActionText]}>Kaydet</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.modernActionButton, styles.deleteActionButton]}
                  onPress={handleDeleteTransaction}
                >
                  <Text style={[styles.actionButtonText, styles.deleteActionText]}>Sil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modernActionButton, styles.editActionButton]}
                  onPress={() => setEditMode(true)}
                >
                  <Text style={[styles.actionButtonText, styles.editActionText]}>Düzenle</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>

        {/* All Categories Modal */}
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

  // Show loading if ViewModel not ready
  if (!viewModel) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Show loading indicator for data loading
  if (viewModel.isLoading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : ['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>İşlemler yükleniyor...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Show error message
  if (viewModel?.error) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={Platform.OS === 'ios' ? ['bottom'] : ['top']}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.errorText}>{viewModel.error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => viewModel?.loadTransactions()}
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const ContentLayout = () => (
    <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İşlemler</Text>
        </View>

        {/* Month Selector */}
        <MonthSelector />

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <Input
            placeholder="İşlem ara..."
            value={viewModel?.searchTerm || ''}
            onChangeText={(term) => viewModel?.setSearchTerm(term)}
            leftIcon="search"
          />
          
          <View style={styles.filterScrollContainer}>
            {/* Sol Scroll Indicator */}
            <View style={styles.filterScrollIndicatorLeft}>
              <Ionicons name="chevron-back" size={14} color="#666666" />
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollView}
              contentContainerStyle={styles.filterContainer}
            >
              <FilterButton
                title="Tümü"
                isActive={!viewModel?.filters.type}
                onPress={() => viewModel?.setFilters({ type: undefined })}
              />
              <FilterButton
                title="Gelir"
                isActive={viewModel?.filters.type === TransactionType.INCOME}
                onPress={() => viewModel?.setFilters({ type: TransactionType.INCOME })}
              />
              <FilterButton
                title="Gider"
                isActive={viewModel?.filters.type === TransactionType.EXPENSE}
                onPress={() => viewModel?.setFilters({ type: TransactionType.EXPENSE })}
              />
            </ScrollView>
            
            {/* Sağ Scroll Indicator */}
            <View style={styles.filterScrollIndicatorRight}>
              <Ionicons name="chevron-forward" size={14} color="#666666" />
            </View>
          </View>
        </View>

        {/* Monthly Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Toplam Gelir</Text>
              <Text style={[styles.statValue, { color: '#00E676' }]}>
                +{formatCurrency(viewModel?.monthlyStats.totalIncome || 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Toplam Gider</Text>
              <Text style={[styles.statValue, { color: '#FF1744' }]}>
                -{formatCurrency(viewModel?.monthlyStats.totalExpense || 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Net Miktar</Text>
              <Text style={[
                styles.statValue,
                { color: (viewModel?.monthlyStats.netAmount || 0) >= 0 ? '#00E676' : '#FF1744' }
              ]}>
                {(viewModel?.monthlyStats.netAmount || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(viewModel?.monthlyStats.netAmount || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.listContainer}>
          {(viewModel?.dayGroups.length || 0) === 0 ? (
            <ScrollView
              style={styles.scrollView}
              refreshControl={
                <RefreshControl
                  refreshing={viewModel?.isLoading || false}
                  onRefresh={() => viewModel?.loadTransactions()}
                  colors={['#FFFFFF']}
                  tintColor="#FFFFFF"
                />
              }
            >
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color="#666666" />
                <Text style={styles.emptyStateTitle}>Henüz işlem yok</Text>
                <Text style={styles.emptyStateText}>
                  Bu ay için henüz bir işlem kaydı bulunmuyor.
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.scrollView}
              refreshControl={
                <RefreshControl
                  refreshing={viewModel?.isLoading || false}
                  onRefresh={() => viewModel?.loadTransactions()}
                  colors={['#FFFFFF']}
                  tintColor="#FFFFFF"
                />
              }
            >
              {viewModel?.dayGroups.map((dayGroup) => (
                <View key={dayGroup.date}>
                  <DayGroupHeader dayGroup={dayGroup} />
                  {dayGroup.transactions.map((transaction) => (
                    <TransactionItem key={transaction.id} item={transaction} />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TransactionModal />
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout title="İşlemler" activeRoute="transactions" navigation={navigation}>
        <ContentLayout />
      </WebLayout>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ContentLayout />
      </SafeAreaView>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 50,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 12,
  },
  filterScrollView: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#111111', // Dark button background
    borderWidth: 1,
    borderColor: '#333333',
  },
  webFilterButton: {
    backgroundColor: '#2C2C2E', // Web'de gri buton arka planı
    borderColor: '#38383A',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3', // Blue active state
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666666', // Gray inactive text
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF', // White active text
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  transactionItem: {
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 0,
  },
  webTransactionCard: {
    backgroundColor: '#2C2C2E', // Web'de gri kart arka planı
    borderColor: '#38383A',
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  transactionDescription: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666666', // Gray secondary text
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666', // Gray tertiary text
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  transactionAmount: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
  },
  transactionChevron: {
    marginTop: 4,
    marginLeft: 8,
  },
  emptyStateCard: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginTop: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#111111', // Dark background
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  webMonthSelector: {
    backgroundColor: '#2C2C2E', // Web'de gri arka plan
    borderColor: '#38383A',
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginHorizontal: 24,
    flex: 1,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000000', // Black background
  },
  webSectionHeader: {
    backgroundColor: 'transparent', // Web'de sitenin arka planıyla aynı
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  sectionAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336', // Red error text
    marginTop: 12,
  },
  retryButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3', // Blue button
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 16,
    marginHorizontal: 24,
  },
  webStatsCard: {
    backgroundColor: '#2C2C2E', // Web'de gri kart arka planı
    borderColor: '#38383A',
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666', // Gray text
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#FFFFFF', // White text
    fontWeight: '700',
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Dark border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // White text
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  typeBadgeContainer: {
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginLeft: 8,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
  },
  descriptionDisplay: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryOption: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#111111', // Dark background
    borderWidth: 1,
    borderColor: '#333333',
  },
  categoryOptionActive: {
    backgroundColor: '#2196F3', // Blue active state
    borderColor: '#2196F3',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF', // White active text
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDisplayText: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
    marginLeft: 12,
  },
  dateDisplay: {
    fontSize: 16,
    color: '#FFFFFF', // White text
    fontWeight: '500',
  },
  modalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333', // Dark border
  },
  editActions: {
    flexDirection: 'row',
    gap: 16,
  },
  viewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    borderColor: '#F44336', // Red border
  },
  categoryScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicatorLeft: {
    padding: 8,
  },
  scrollIndicatorRight: {
    padding: 8,
  },
  categoryScrollView: {
    flex: 1,
  },
  filterScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterScrollIndicatorLeft: {
    padding: 8,
  },
  filterScrollIndicatorRight: {
    padding: 8,
  },
  webContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000000', // Black background for web
  },
  webContainer: {
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  webCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
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
  // Modern Modal Styles
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
  modernModalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cardSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
    fontWeight: '500',
  },
  largeAmount: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  detailsCard: {
    padding: 20,
  },
  modernSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modernCategorySelector: {
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryRowActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196F3',
  },
  categoryRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryRowText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  categoryRowTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  modernDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modernDateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modernInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
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
  cancelActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#F44336',
  },
  editActionText: {
    color: '#FFFFFF',
  },
  cancelActionText: {
    color: '#FFFFFF',
  },
  // Minimalist Styles
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
  compactCategoryContainer: {
    marginTop: 8,
  },
  topCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  compactCategoryActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196F3',
  },
  compactCategoryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  compactCategoryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  compactCategoryTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  showAllText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 4,
  },
  allCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  // AddTransactionScreen Style Categories
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
  // Categories Modal Styles
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

export default TransactionsScreen; 