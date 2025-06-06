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
import { isWeb } from '../utils/platform';

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

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    const categories = type === TransactionType.INCOME 
      ? DEFAULT_INCOME_CATEGORIES 
      : DEFAULT_EXPENSE_CATEGORIES;
    
    const category = categories.find(cat => cat.name === categoryName) || categories[0];
    return category;
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
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
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
        <Card style={styles.transactionCard}>
          <View style={styles.transactionContent}>
            <View style={styles.transactionLeft}>
              <CategoryIcon
                iconName={item.categoryIcon}
                color={category.color}
                size="medium"
              />
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>{item.description}</Text>
                <Text style={styles.transactionCategory}>{item.category}</Text>
                <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <Text style={[
                styles.transactionAmount,
                { color: isIncome ? COLORS.SUCCESS : COLORS.ERROR }
              ]}>
                {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const MonthSelector = () => (
    <View style={styles.monthSelector}>
      <TouchableOpacity 
        style={styles.monthButton}
        onPress={() => viewModel?.goToPreviousMonth()}
      >
        <Ionicons name="chevron-back" size={20} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      
      <Text style={styles.monthText}>{formatMonth(viewModel?.currentMonth || new Date())}</Text>
      
      <TouchableOpacity 
        style={styles.monthButton}
        onPress={() => viewModel?.goToNextMonth()}
      >
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={COLORS.PRIMARY}
        />
      </TouchableOpacity>
    </View>
  );

  const DayGroupHeader = ({ dayGroup }: { dayGroup: any }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{dayGroup.displayDate}</Text>
      <Text style={[
        styles.sectionAmount,
        { color: dayGroup.netAmount >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
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
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editMode ? 'İşlemi Düzenle' : 'İşlem Detayı'}
            </Text>
            <TouchableOpacity onPress={() => setEditMode(!editMode)}>
              <Ionicons 
                name={editMode ? "save" : "create"} 
                size={24} 
                color={COLORS.PRIMARY} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Transaction Type Badge */}
            <View style={styles.typeBadgeContainer}>
              <View style={[
                styles.typeBadge,
                { backgroundColor: isIncome ? COLORS.SUCCESS : COLORS.ERROR }
              ]}>
                <Ionicons 
                  name={isIncome ? "add-circle" : "remove-circle"} 
                  size={20} 
                  color={COLORS.WHITE} 
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
                <Text style={[styles.amountDisplay, { color: isIncome ? COLORS.SUCCESS : COLORS.ERROR }]}>
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
                    <Ionicons name="chevron-back" size={16} color={COLORS.TEXT_TERTIARY} />
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
                            color={editForm.category === cat.name ? COLORS.PRIMARY : cat.color}
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
                    <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_TERTIARY} />
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
                  textStyle={{ color: COLORS.ERROR }}
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading indicator for data loading
  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>İşlemler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error message
  if (viewModel?.error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.ERROR} />
          <Text style={styles.errorText}>{viewModel.error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => viewModel?.loadTransactions()}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="İşlemler" activeRoute="transactions" navigation={navigation}>
        <View style={styles.webContent}>
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
                <Ionicons name="chevron-back" size={14} color={COLORS.TEXT_TERTIARY} />
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
                <Ionicons name="chevron-forward" size={14} color={COLORS.TEXT_TERTIARY} />
              </View>
            </View>
          </View>

          {/* Monthly Stats */}
          <Card style={styles.statsCard}>
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Toplam Gelir</Text>
                <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>
                  {formatCurrency(viewModel?.monthlyStats.totalIncome || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Toplam Gider</Text>
                <Text style={[styles.statValue, { color: COLORS.ERROR }]}>
                  {formatCurrency(viewModel?.monthlyStats.totalExpense || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Net Tutar</Text>
                <Text style={[
                  styles.statValue,
                  { color: (viewModel?.monthlyStats.netAmount || 0) >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
                ]}>
                  {formatCurrency(Math.abs(viewModel?.monthlyStats.netAmount || 0))}
                </Text>
              </View>
            </View>
          </Card>

          {/* Transactions List */}
          <View style={styles.listContainer}>
            {(viewModel?.dayGroups.length || 0) === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color={COLORS.TEXT_TERTIARY} />
                <Text style={styles.emptyStateTitle}>Henüz işlem yok</Text>
                <Text style={styles.emptyStateText}>
                  Bu ay için henüz bir işlem kaydı bulunmuyor.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView}>
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
        </View>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <Ionicons name="chevron-back" size={14} color={COLORS.TEXT_TERTIARY} />
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
            <Ionicons name="chevron-forward" size={14} color={COLORS.TEXT_TERTIARY} />
          </View>
        </View>
      </View>

      {/* Monthly Stats */}
      <Card style={styles.statsCard}>
        <View style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Toplam Gelir</Text>
            <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>
              +{formatCurrency(viewModel?.monthlyStats.totalIncome || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Toplam Gider</Text>
            <Text style={[styles.statValue, { color: COLORS.ERROR }]}>
              -{formatCurrency(viewModel?.monthlyStats.totalExpense || 0)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Net Miktar</Text>
            <Text style={[
              styles.statValue,
              { color: (viewModel?.monthlyStats.netAmount || 0) >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
            ]}>
              {(viewModel?.monthlyStats.netAmount || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(viewModel?.monthlyStats.netAmount || 0))}
            </Text>
          </View>
        </View>
      </Card>

      {/* Transactions List */}
      <View style={styles.listContainer}>
        {(viewModel?.dayGroups.length || 0) === 0 ? (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={viewModel?.isLoading || false}
                onRefresh={() => viewModel?.loadTransactions()}
                colors={[COLORS.PRIMARY]}
                tintColor={COLORS.PRIMARY}
              />
            }
          >
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.TEXT_TERTIARY} />
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
                colors={[COLORS.PRIMARY]}
                tintColor={COLORS.PRIMARY}
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
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  searchSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchInput: {
    marginBottom: SPACING.sm,
  },
  filterScrollView: {
    marginBottom: SPACING.md,
  },
  filterContainer: {
    paddingRight: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
  },
  filterButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.WHITE,
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  transactionItem: {
    marginBottom: SPACING.sm,
  },
  transactionCard: {
    padding: 0,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  transactionDescription: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.md : TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  emptyStateCard: {
    marginTop: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    marginTop: SPACING.sm,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  monthButton: {
    padding: SPACING.sm,
    borderRadius: 8,
  },
  monthText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginHorizontal: SPACING.lg,
    flex: 1,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  sectionAmount: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.ERROR,
    marginTop: SPACING.sm,
  },
  retryButton: {
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
  },
  retryButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.WHITE,
    fontWeight: '500',
  },
  statsCard: {
    marginBottom: SPACING.md,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.md,
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
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
  },
  typeBadgeContainer: {
    marginBottom: SPACING.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.sm,
  },
  modalSection: {
    marginBottom: SPACING.md,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  amountDisplay: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.md : TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  descriptionDisplay: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryOption: {
    padding: SPACING.sm,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  categoryOptionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: COLORS.WHITE,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDisplayText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  dateDisplay: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  modalActions: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  viewActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  deleteButton: {
    borderColor: COLORS.ERROR,
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
  filterScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterScrollIndicatorLeft: {
    padding: SPACING.sm,
  },
  filterScrollIndicatorRight: {
    padding: SPACING.sm,
  },
  webContent: {
    flex: 1,
    padding: SPACING.md,
  },
});

export default TransactionsScreen; 