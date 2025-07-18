/**
 * QuickActions - Hızlı Eylemler Bileşeni
 * 
 * Bu bileşen ana sayfada kullanıcının sık kullandığı eylemlere
 * hızlı erişim sağlayan butonları içerir.
 * Minimal dark theme tasarımla güncellenmiştir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const isWeb = Platform.OS === 'web';

/**
 * Tek bir hızlı eylem butonu için tip tanımı
 */
interface QuickAction {
  /** Buton ikonu (Ionicons adı) */
  icon: string;
  /** Buton başlığı */
  title: string;
  /** Buton rengi (isteğe bağlı) */
  color?: string;
  /** Tıklama fonksiyonu */
  onPress: () => void;
  /** Buton devre dışı mı? */
  disabled?: boolean;
}

interface QuickActionsProps {
  /** Hızlı eylem listesi */
  actions: QuickAction[];
  /** Grid düzeninde kaç sütun olacak (kullanılmıyor - horizontal layout için) */
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
    const buttonColor = action.color || '#2196F3';
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.actionButton,
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
            size={24}
            color="#FFFFFF"
          />
        </View>
        
        {/* Buton Başlığı */}
        <Text style={[
          styles.actionTitle,
          action.disabled && styles.actionTitleDisabled
        ]}>
          {action.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      {/* Bölüm Başlığı */}
      <Text style={styles.sectionTitle}>
        Hızlı İşlemler
      </Text>
      
      {/* Horizontal ScrollView ile Eylem Butonları */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsContainer}
        style={styles.actionsScrollView}
      >
        {actions.map((action, index) => renderActionButton(action, index))}
      </ScrollView>
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
  onRecalculateBalances?: () => void,
  onViewAnalytics?: () => void,
  onCreditCardTransaction?: () => void,
  onCreditCardPayment?: () => void,
  onAddDebt?: () => void,
  onViewDebts?: () => void
): QuickAction[] => {
  const commonActions: QuickAction[] = [
    // En çok kullanılan: Günlük giderler
    {
      icon: 'remove-circle',
      title: 'Gider Ekle',
      color: '#F44336',
      onPress: onAddExpense,
    },
    // İkinci en çok: Gelir ekleme
    {
      icon: 'add-circle',
      title: 'Gelir Ekle',
      color: '#4CAF50',
      onPress: onAddIncome,
    },
    // Beşinci: Yeni hesap (daha az sıklıkta)
    {
      icon: 'wallet',
      title: 'Yeni Hesap',
      color: '#2196F3',
      onPress: onAddAccount,
    },
  ];

  // Altıncı: Kredi kartı harcama (sık kullanılan)
  if (onCreditCardTransaction) {
    commonActions.push({
      icon: 'card',
      title: 'K.Kartı Harcama',
      color: '#E91E63',
      onPress: onCreditCardTransaction,
    });
  }

  // Yedinci: Kredi kartı ödeme (aylık)
  if (onCreditCardPayment) {
    commonActions.push({
      icon: 'cash',
      title: 'K.Kartı Ödeme',
      color: '#00BCD4',
      onPress: onCreditCardPayment,
    });
  }

  // Sekizinci: Borçları görme
  if (onViewDebts) {
    commonActions.push({
      icon: 'person-circle',
      title: 'Borçlar',
      color: '#3F51B5',
      onPress: onViewDebts,
    });
  }

  // Onuncu: Analytics (periyodik bakış)
  if (onViewAnalytics) {
    commonActions.push({
      icon: 'analytics',
      title: 'Analizler',
      color: '#FFC107',
      onPress: onViewAnalytics,
    });
  }

  // Son: Debug/geliştirme amaçlı (sadece gerektiğinde)
  if (onRecalculateBalances) {
    commonActions.push({
      icon: 'calculator',
      title: 'Bakiye Hesapla',
      color: '#607D8B',
      onPress: onRecalculateBalances,
    });
  }

  return commonActions;
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

  // Bölüm Başlığı
  sectionTitle: {
    marginBottom: 16,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 24,
  },

  // Horizontal ScrollView
  actionsScrollView: {
    flexGrow: 0,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },

  // Eylem Butonu - Border ve background kaldırıldı
  actionButton: {
    alignItems: 'center',
    padding: 12,
    minHeight: 100,
    justifyContent: 'center',
    width: 80, // Sabit genişlik horizontal layout için
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },

  // İkon Konteyner - Sadece renkli ikon
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIconDisabled: {
    backgroundColor: '#666666',
  },

  // Eylem Başlığı
  actionTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32, // İki satır için minimum yükseklik
  },
  actionTitleDisabled: {
    color: '#666666',
  },
}); 