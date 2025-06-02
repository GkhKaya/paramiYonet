/**
 * DashboardHeader - Ana Sayfa Başlık Bileşeni
 * 
 * Bu bileşen ana sayfanın üst kısmında yer alan kullanıcı karşılama mesajı,
 * toplam bakiye ve bakiye gizleme/gösterme özelliğini içerir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseText } from '../ui/BaseComponents';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/ui';

interface DashboardHeaderProps {
  /** Kullanıcının görünen adı */
  userName?: string;
  /** Toplam bakiye tutarı */
  totalBalance: number;
  /** Bakiye görünür mü? */
  balanceVisible: boolean;
  /** Bakiye görünürlüğünü değiştirme fonksiyonu */
  onToggleBalanceVisibility: () => void;
  /** Yenile fonksiyonu */
  onRefresh?: () => void;
  /** Yenilenme durumu */
  isRefreshing?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  totalBalance,
  balanceVisible,
  onToggleBalanceVisibility,
  onRefresh,
  isRefreshing = false,
}) => {
  /**
   * Kullanıcıya uygun karşılama mesajı oluşturur
   */
  const getGreetingMessage = (): string => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return 'Günaydın';
    } else if (hour < 18) {
      return 'İyi öğleden sonra';
    } else {
      return 'İyi akşamlar';
    }
  };

  /**
   * Bakiye metnini formatlar ve gizleme durumunu kontrol eder
   */
  const getBalanceDisplay = (): string => {
    if (!balanceVisible) {
      return '••••••';
    }
    
    return formatCurrency(totalBalance);
  };

  /**
   * Bakiye rengini belirler (pozitif/negatif duruma göre)
   */
  const getBalanceColor = (): keyof typeof COLORS => {
    if (!balanceVisible) {
      return 'TEXT_PRIMARY';
    }
    
    return totalBalance >= 0 ? 'SUCCESS' : 'ERROR';
  };

  return (
    <View style={styles.container}>
      {/* Kullanıcı Karşılama */}
      <View style={styles.greetingSection}>
        <BaseText variant="subtitle" color="TEXT_SECONDARY">
          {getGreetingMessage()}
        </BaseText>
        
        {userName && (
          <BaseText variant="title" weight="semiBold" style={styles.userName}>
            {userName}
          </BaseText>
        )}
      </View>

      {/* Toplam Bakiye Kartı */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <BaseText variant="caption" color="TEXT_SECONDARY">
            Toplam Bakiye
          </BaseText>
          
          <View style={styles.actionButtons}>
            {/* Yenile Butonu */}
            {onRefresh && (
              <TouchableOpacity
                onPress={onRefresh}
                style={styles.actionButton}
                disabled={isRefreshing}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={COLORS.TEXT_SECONDARY}
                  style={[
                    styles.actionIcon,
                    isRefreshing && styles.rotatingIcon
                  ]}
                />
              </TouchableOpacity>
            )}
            
            {/* Bakiye Gizleme/Gösterme Butonu */}
            <TouchableOpacity
              onPress={onToggleBalanceVisibility}
              style={styles.actionButton}
            >
              <Ionicons
                name={balanceVisible ? 'eye' : 'eye-off'}
                size={18}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bakiye Tutarı */}
        <BaseText
          variant="headline"
          weight="bold"
          color={getBalanceColor()}
          style={styles.balanceAmount}
        >
          {getBalanceDisplay()}
        </BaseText>

        {/* Bakiye Durumu İndikatörü */}
        {balanceVisible && (
          <View style={styles.balanceIndicator}>
            <View style={[
              styles.indicatorDot,
              { backgroundColor: COLORS[getBalanceColor()] }
            ]} />
            <BaseText variant="caption" color="TEXT_SECONDARY">
              {totalBalance >= 0 ? 'Pozitif Bakiye' : 'Negatif Bakiye'}
            </BaseText>
          </View>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
  },

  // Karşılama Bölümü
  greetingSection: {
    marginBottom: SPACING.lg,
  },
  userName: {
    marginTop: SPACING.xs,
  },

  // Bakiye Kartı
  balanceCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.SURFACE,
  },
  actionIcon: {
    // Yenile animasyonu için gerekli olabilir
  },
  rotatingIcon: {
    // Döngü animasyonu burada tanımlanabilir
    opacity: 0.6,
  },

  // Bakiye Gösterimi
  balanceAmount: {
    marginBottom: SPACING.sm,
    textAlign: 'left',
  },
  balanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
}); 