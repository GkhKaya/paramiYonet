/**
 * RecentTransactions - Son İşlemler Bileşeni
 * 
 * Dashboard'da son 3 işlemi gösteren bileşen.
 * Minimal dark theme tasarımla güncellenmiştir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, TransactionType } from '../../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';

interface RecentTransactionsProps {
  /** Son işlemler listesi */
  transactions: Transaction[];
  /** Tümünü görüntüle butonu tıklama fonksiyonu */
  onViewAll: () => void;
  /** Yükleniyor durumu */
  loading?: boolean;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
  loading = false,
}) => {
  /**
   * Tutar formatını düzenler
   */
  const formatAmount = (amount: number, type: TransactionType): string => {
    const sign = type === TransactionType.INCOME ? '+' : '-';
    return `${sign}${amount.toLocaleString('tr-TR')} ₺`;
  };

  /**
   * Tarihi formatlar
   */
  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  /**
   * Kategori detaylarını getir
   */
  const getCategoryDetails = (categoryName: string, type: TransactionType) => {
    const categories = type === TransactionType.INCOME 
      ? DEFAULT_INCOME_CATEGORIES 
      : DEFAULT_EXPENSE_CATEGORIES;
    
    return categories.find(cat => cat.name === categoryName) || categories[0];
  };

  /**
   * Tek bir işlem öğesi render eder
   */
  const renderTransactionItem = (transaction: Transaction, index: number) => {
    const isIncome = transaction.type === TransactionType.INCOME;
    const category = getCategoryDetails(transaction.category, transaction.type);
    const amountColor = isIncome ? '#4CAF50' : '#F44336';

    return (
      <View key={transaction.id} style={styles.transactionItem}>
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
            {transaction.description}
          </Text>
          <Text style={styles.transactionCategory}>
            {transaction.category} • {formatDate(transaction.date)}
          </Text>
        </View>

        {/* Tutar */}
        <Text style={[styles.transactionAmount, { color: amountColor }]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
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
      <View style={styles.container}>
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
    <View style={styles.container}>
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