/**
 * QuickActions - Hızlı Eylemler Bileşeni
 * 
 * Bu bileşen ana sayfada kullanıcının sık kullandığı eylemlere
 * hızlı erişim sağlayan butonları içerir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseText } from '../ui/BaseComponents';
import { COLORS, SPACING, LAYOUT, BORDER_RADIUS } from '../../constants/ui';

/**
 * Tek bir hızlı eylem butonu için tip tanımı
 */
interface QuickAction {
  /** Buton ikonu (Ionicons adı) */
  icon: string;
  /** Buton başlığı */
  title: string;
  /** Buton rengi (isteğe bağlı) */
  color?: keyof typeof COLORS;
  /** Tıklama fonksiyonu */
  onPress: () => void;
  /** Buton devre dışı mı? */
  disabled?: boolean;
}

interface QuickActionsProps {
  /** Hızlı eylem listesi */
  actions: QuickAction[];
  /** Grid düzeninde kaç sütun olacak (varsayılan: 2) */
  columns?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  columns = 2,
}) => {
  /**
   * Tek bir hızlı eylem butonu render eder
   */
  const renderActionButton = (action: QuickAction, index: number) => {
    const buttonColor = action.color ? COLORS[action.color] : COLORS.PRIMARY;
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.actionButton,
          { width: `${100 / columns - 2}%` }, // Grid layout için genişlik hesabı
          action.disabled && styles.actionButtonDisabled,
        ]}
        onPress={action.onPress}
        disabled={action.disabled}
        activeOpacity={0.7}
      >
        {/* İkon Konteyner */}
        <View style={[
          styles.actionIconContainer,
          { backgroundColor: buttonColor },
          action.disabled && styles.actionIconDisabled,
        ]}>
          <Ionicons
            name={action.icon as any}
            size={LAYOUT.iconSize.lg}
            color={COLORS.WHITE}
          />
        </View>
        
        {/* Buton Başlığı */}
        <BaseText
          variant="caption"
          weight="medium"
          color={action.disabled ? 'TEXT_DISABLED' : 'TEXT_PRIMARY'}
          align="center"
          numberOfLines={2}
          style={styles.actionTitle}
        >
          {action.title}
        </BaseText>
      </TouchableOpacity>
    );
  };

  /**
   * Eylemleri satırlara böler (grid layout için)
   */
  const getActionRows = (): QuickAction[][] => {
    const rows: QuickAction[][] = [];
    
    for (let i = 0; i < actions.length; i += columns) {
      rows.push(actions.slice(i, i + columns));
    }
    
    return rows;
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Bölüm Başlığı */}
      <BaseText
        variant="subtitle"
        weight="semiBold"
        style={styles.sectionTitle}
      >
        Hızlı İşlemler
      </BaseText>
      
      {/* Eylem Butonları Grid */}
      <View style={styles.actionsGrid}>
        {getActionRows().map((row, rowIndex) => (
          <View key={rowIndex} style={styles.actionRow}>
            {row.map((action, actionIndex) => 
              renderActionButton(action, rowIndex * columns + actionIndex)
            )}
            
            {/* Eksik butonlar için boş alan (grid hizalama) */}
            {row.length < columns && 
              Array.from({ length: columns - row.length }).map((_, emptyIndex) => (
                <View
                  key={`empty-${emptyIndex}`}
                  style={[styles.emptySlot, { width: `${100 / columns - 2}%` }]}
                />
              ))
            }
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Önceden tanımlanmış hızlı eylemler
 * Bu fonksiyonlar yaygın kullanım durumları için kolaylık sağlar
 */
export const createCommonQuickActions = (
  onAddIncome: () => void,
  onAddExpense: () => void,
  onAddAccount: () => void,
  onViewReports: () => void,
  onViewTransactions: () => void,
  onRecalculateBalances?: () => void
): QuickAction[] => {
  const commonActions: QuickAction[] = [
    {
      icon: 'add-circle',
      title: 'Gelir Ekle',
      color: 'SUCCESS',
      onPress: onAddIncome,
    },
    {
      icon: 'remove-circle',
      title: 'Gider Ekle',
      color: 'ERROR',
      onPress: onAddExpense,
    },
    {
      icon: 'wallet',
      title: 'Yeni Hesap',
      color: 'PRIMARY',
      onPress: onAddAccount,
    },
    {
      icon: 'bar-chart',
      title: 'Raporlar',
      color: 'INFO',
      onPress: onViewReports,
    },
    {
      icon: 'list',
      title: 'İşlemler',
      color: 'SECONDARY',
      onPress: onViewTransactions,
    },
  ];

  // Debug/geliştirme amaçlı bakiye hesaplama butonu (isteğe bağlı)
  if (onRecalculateBalances) {
    commonActions.push({
      icon: 'calculator',
      title: 'Bakiye Hesapla',
      color: 'WARNING',
      onPress: onRecalculateBalances,
    });
  }

  return commonActions;
};

/**
 * Stil Tanımları
 */
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
  },

  // Bölüm Başlığı
  sectionTitle: {
    marginBottom: SPACING.md,
    color: COLORS.TEXT_PRIMARY,
  },

  // Grid Layout
  actionsGrid: {
    gap: SPACING.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  emptySlot: {
    // Grid hizalama için boş alan
  },

  // Eylem Butonu
  actionButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.SURFACE,
    minHeight: 100,
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },

  // İkon Konteyner
  actionIconContainer: {
    width: LAYOUT.iconSize.xl,
    height: LAYOUT.iconSize.xl,
    borderRadius: LAYOUT.iconSize.xl / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionIconDisabled: {
    backgroundColor: COLORS.TEXT_DISABLED,
  },

  // Eylem Başlığı
  actionTitle: {
    lineHeight: 16,
    minHeight: 32, // İki satır için minimum yükseklik
  },
}); 