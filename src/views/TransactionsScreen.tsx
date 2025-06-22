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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date(),
  });

  // Custom hooks
  const { formatCurrency, currencySymbol, parseInput } = useCurrency({ maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const { getDetails } = useCategory();
  const { formatShort, formatMonthYear } = useDate();

  const formatDate = (date: Date) => {
    return formatShort(date);
  };

  const formatMonth = (date: Date) => {
    return formatMonthYear(date);
  };

  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    return getDetails(categoryName, type);
  };



  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
    });
    setEditMode(false);
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
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <Text style={[
                styles.transactionAmount,
                { color: isIncome ? '#4CAF50' : '#F44336' }
              ]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
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
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editMode ? 'İşlemi Düzenle' : 'İşlem Detayı'}
            </Text>
            <TouchableOpacity onPress={() => setEditMode(!editMode)}>
              <Ionicons 
                name={editMode ? "save" : "create"} 
                size={24} 
                color="#2196F3" 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Type Badge */}
            <View style={styles.typeBadgeContainer}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: isIncome ? '#00E676' : '#FF1744' }
              ]}>
                <Ionicons 
                  name={isIncome ? "add-circle" : "remove-circle"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.typeBadgeText}>
                  {isIncome ? 'Gelir' : 'Gider'}
                </Text>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tutar</Text>
              {editMode ? (
                <Input
                  value={editForm.amount}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, amount: value }))}
                  keyboardType="numeric"
                  placeholder="0"
                  variant="outlined"
                />
              ) : (
                <Text style={[styles.amountDisplay, { color: isIncome ? '#00E676' : '#FF1744' }]}>
                  {isIncome ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                </Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Açıklama</Text>
              {editMode ? (
                <Input
                  value={editForm.description}
                  onChangeText={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                  placeholder="İşlem açıklaması"
                  variant="outlined"
                />
              ) : (
                <Text style={styles.descriptionDisplay}>{selectedTransaction.description}</Text>
              )}
            </View>

            {/* Category */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Kategori</Text>
              {editMode ? (
                <View style={styles.categoryScrollContainer}>
                  {/* Sol Scroll Indicator */}
                  <View style={styles.scrollIndicatorLeft}>
                    <Ionicons name="chevron-back" size={16} color="#666666" />
                  </View>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScrollView}
                  >
                    <View style={styles.categorySelector}>
                      {availableCategories.map((cat, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.categoryOption,
                            editForm.category === cat.name && styles.categoryOptionActive
                          ]}
                          onPress={() => setEditForm(prev => ({ ...prev, category: cat.name }))}
                        >
                          <CategoryIcon
                            iconName={cat.icon}
                            color={editForm.category === cat.name ? '#2196F3' : cat.color}
                            size="small"
                          />
                          <Text style={[
                            styles.categoryOptionText,
                            editForm.category === cat.name && styles.categoryOptionTextActive
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  
                  {/* Sağ Scroll Indicator */}
                  <View style={styles.scrollIndicatorRight}>
                    <Ionicons name="chevron-forward" size={16} color="#666666" />
                  </View>
                </View>
              ) : (
                <View style={styles.categoryDisplay}>
                  <CategoryIcon
                    iconName={category.icon}
                    color={category.color}
                    size="medium"
                  />
                  <Text style={styles.categoryDisplayText}>{selectedTransaction.category}</Text>
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Tarih</Text>
              <Text style={styles.dateDisplay}>{formatDate(selectedTransaction.date)}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            {editMode ? (
              <View style={styles.editActions}>
                <Button
                  title="İptal"
                  onPress={() => setEditMode(false)}
                  variant="outline"
                  size="medium"
                  style={styles.actionButton}
                />
                <Button
                  title="Kaydet"
                  onPress={handleEditTransaction}
                  variant="primary"
                  size="medium"
                  style={styles.actionButton}
                />
              </View>
            ) : (
              <View style={styles.viewActions}>
                <Button
                  title="Sil"
                  onPress={handleDeleteTransaction}
                  variant="outline"
                  size="medium"
                  style={styles.actionButton}
                  textStyle={{ color: '#F44336' }}
                />
                <Button
                  title="Düzenle"
                  onPress={() => setEditMode(true)}
                  variant="primary"
                  size="medium"
                  style={styles.actionButton}
                />
              </View>
            )}
          </View>
        </SafeAreaView>
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
        <SafeAreaView style={styles.container} edges={['top']}>
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
        <SafeAreaView style={styles.container} edges={['top']}>
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
      <SafeAreaView style={styles.container} edges={['top']}>
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
    paddingVertical: 24,
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
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: '700',
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


});

export default TransactionsScreen; 