/**
 * RecentTransactions - Son İşlemler Bileşeni
 * 
 * Dashboard'da son 3 işlemi gösteren bileşen.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseText } from '../ui/BaseComponents';
import { COLORS, SPACING, LAYOUT, BORDER_RADIUS, TYPOGRAPHY } from '../../constants/ui';
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
    const amountColor = isIncome ? COLORS.SUCCESS : COLORS.ERROR;

    return (
      <View key={transaction.id} style={styles.transactionItem}>
        {/* İkon */}
        <View style={[
          styles.transactionIcon,
          { backgroundColor: category.color }
        ]}>
          <Ionicons
            name={transaction.categoryIcon as any}
            size={LAYOUT.iconSize.md}
            color={COLORS.WHITE}
          />
        </View>

        {/* İşlem Bilgileri */}
        <View style={styles.transactionInfo}>
          <BaseText
            variant="body"
            weight="medium"
            color="TEXT_PRIMARY"
            numberOfLines={1}
          >
            {transaction.description}
          </BaseText>
          <BaseText
            variant="caption"
            color="TEXT_SECONDARY"
          >
            {transaction.category} • {formatDate(transaction.date)}
          </BaseText>
        </View>

        {/* Tutar */}
        <BaseText
          variant="body"
          weight="semiBold"
          style={{ color: amountColor, textAlign: 'right' }}
        >
          {formatAmount(transaction.amount, transaction.type)}
        </BaseText>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BaseText
          variant="subtitle"
          weight="semiBold"
          style={styles.sectionTitle}
        >
          Son İşlemler
        </BaseText>
        <View style={styles.loadingContainer}>
          <BaseText variant="body" color="TEXT_SECONDARY">
            Yükleniyor...
          </BaseText>
        </View>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.container}>
        <BaseText
          variant="subtitle"
          weight="semiBold"
          style={styles.sectionTitle}
        >
          Son İşlemler
        </BaseText>
        <View style={styles.emptyContainer}>
          <BaseText variant="body" color="TEXT_SECONDARY" align="center">
            Henüz işlem bulunmuyor
          </BaseText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Başlık ve Tümünü Gör Butonu */}
      <View style={styles.header}>
        <BaseText
          variant="subtitle"
          weight="semiBold"
          style={styles.sectionTitle}
        >
          Son İşlemler
        </BaseText>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={onViewAll}
          activeOpacity={0.7}
        >
          <BaseText
            variant="caption"
            weight="medium"
            color="PRIMARY"
          >
            Tümünü Gör
          </BaseText>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={COLORS.PRIMARY}
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
 * Stil Tanımları
 */
const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
  },

  // Başlık
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.TEXT_PRIMARY,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllIcon: {
    marginLeft: SPACING.xs,
  },

  // İşlemler Listesi
  transactionsList: {
    paddingHorizontal: SPACING.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_LIGHT,
  },

  // İşlem İkonu
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },

  // İşlem Bilgileri
  transactionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },

  // Yükleniyor ve Boş Durum
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
}); 