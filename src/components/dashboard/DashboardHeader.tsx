/**
 * DashboardHeader - Ana Sayfa Başlık Bileşeni
 * 
 * Bu bileşen ana sayfanın üst kısmında yer alan kullanıcı karşılama mesajı,
 * toplam bakiye ve bakiye gizleme/gösterme özelliğini içerir.
 * Minimal dark theme tasarımla güncellenmiştir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/formatters';

const isWeb = Platform.OS === 'web';

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
  const getBalanceColor = (): string => {
    if (!balanceVisible) {
      return '#FFFFFF';
    }
    
    return totalBalance >= 0 ? '#4CAF50' : '#F44336';
  };

  return (
    <View style={[styles.container, isWeb && styles.webContainer]}>
      {/* Kullanıcı Karşılama */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>
          {getGreetingMessage()}
        </Text>
        
        {userName && (
          <Text style={styles.userName}>
            {userName}
          </Text>
        )}
      </View>

      {/* Toplam Bakiye Kartı */}
      <View style={[styles.balanceCard, isWeb && styles.webBalanceCard]}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>
            Toplam Bakiye
          </Text>
          
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
                  size={20}
                  color="#666666"
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
                size={20}
                color="#666666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bakiye Tutarı */}
        <Text style={[styles.balanceAmount, { color: getBalanceColor() }]}>
          {getBalanceDisplay()}
        </Text>

        {/* Bakiye Durumu İndikatörü */}
        {balanceVisible && (
          <View style={styles.balanceIndicator}>
            <View style={[
              styles.indicatorDot,
              { backgroundColor: getBalanceColor() }
            ]} />
            <Text style={styles.indicatorText}>
              {totalBalance >= 0 ? 'Pozitif Bakiye' : 'Negatif Bakiye'}
            </Text>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#000000',
  },
  webContainer: {
    backgroundColor: 'transparent', // Web'de arka plan WebLayout tarafından sağlanır
  },

  // Karşılama Bölümü
  greetingSection: {
    marginBottom: 32,
  },
  greetingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
  },

  // Bakiye Kartı
  balanceCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  webBalanceCard: {
    backgroundColor: '#2C2C2E', // Web'de gri kart arka planı
    borderColor: '#38383A',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  balanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
});

export default DashboardHeader; 