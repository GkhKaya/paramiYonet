/**
 * RecentTransactions - Son İşlemler Bileşeni
 * 
 * Dashboard'da son 3 işlemi gösteren bileşen.
 * Minimal dark theme tasarımla güncellenmiştir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, TransactionType } from '../../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';
import { useCurrency, useCategory, useDate } from '../../hooks';

const isWeb = Platform.OS === 'web';

interface RecentTransactionsProps {
  /** Son işlemler listesi */
  transactions: Transaction[];
  /** Tümünü görüntüle butonu tıklama fonksiyonu */
  onViewAll: () => void;
  /** İşlem tıklama fonksiyonu */
  onTransactionPress?: (transactionId: string) => void;
  /** Yükleniyor durumu */
  loading?: boolean;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
  onTransactionPress,
  loading = false,
}) => {
  // Custom hooks
  const { formatDirectional } = useCurrency();
  const { getDetails } = useCategory();
  const { formatRelative } = useDate();

  /**
   * Tutar formatını düzenler
   */
  const formatAmount = (amount: number, type: TransactionType): string => {
    return formatDirectional(amount, type);
  };

  /**
   * Tarihi formatlar
   */
  const formatDate = (date: Date): string => {
    return formatRelative(date);
  };

  /**
   * Kategori detaylarını getir
   */
  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    return getDetails(categoryName, type);
  };

  /**
   * Tek bir işlem öğesi render eder
   */
  const renderTransactionItem = (transaction: Transaction, index: number) => {
    const isIncome = transaction.type === TransactionType.INCOME;
    const category = getCategoryDetails(transaction.category, transaction.type);
    const amountColor = isIncome ? '#4CAF50' : '#F44336';

    return (
      <TouchableOpacity 
        key={transaction.id} 
        style={styles.transactionItem}
        onPress={() => onTransactionPress?.(transaction.id)}
        activeOpacity={0.7}
      >
        {/* İkon */}
        <View style={[
          styles.transactionIcon,
          { backgroundColor: category.color }
        ]}>
          <Ionicons
            name={transaction.categoryIcon as any}
            size={24}
            color="#FFFFFF"
          />
        </View>

        {/* İşlem Bilgileri */}
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description || transaction.category}
          </Text>
          <Text style={styles.transactionCategory}>
            {transaction.category} • {formatDate(transaction.date)}
          </Text>
        </View>

        {/* Tutar */}
        <Text style={[styles.transactionAmount, { color: amountColor }]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>

        {/* Chevron */}
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color="#666666" 
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <Text style={styles.sectionTitle}>
          Son İşlemler
        </Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Yükleniyor...
          </Text>
        </View>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <Text style={styles.sectionTitle}>
          Son İşlemler
        </Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Henüz işlem bulunmuyor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      {/* Başlık ve Tümünü Gör Butonu */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Son İşlemler
        </Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>
            Tümünü Gör
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#2196F3"
            style={styles.viewAllIcon}
          />
        </TouchableOpacity>
      </View>

      {/* İşlemler Listesi */}
      <View style={styles.transactionsList}>
        {transactions.map((transaction, index) => 
          renderTransactionItem(transaction, index)
        )}
      </View>
    </View>
  );
};

/**
 * Stil Tanımları - Minimal Dark Theme
 */
const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    backgroundColor: '#000000',
  },
  webContainer: {
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },

  // Başlık
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  viewAllIcon: {
    marginLeft: 4,
  },

  // İşlemler Listesi
  transactionsList: {
    paddingHorizontal: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },

  // İşlem İkonu
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  // İşlem Bilgileri
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#666666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  chevron: {
    marginLeft: 8,
  },

  // Yükleniyor ve Boş Durum
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
}); 