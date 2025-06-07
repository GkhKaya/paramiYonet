/**
 * AccountsList - Hesaplar Listesi Bileşeni
 * 
 * Bu bileşen kullanıcının hesaplarını listeler ve her hesap için
 * düzenleme/silme işlemlerini sağlar.
 * Minimal dark theme tasarımla güncellenmiştir.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/formatters';

/**
 * Hesap tipi tanımı (basitleştirilmiş)
 */
export interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
  color: string; // Hesap rengi
}

interface AccountsListProps {
  /** Hesaplar listesi */
  accounts: AccountItem[];
  /** Hesap düzenleme fonksiyonu */
  onEditAccount: (account: AccountItem) => void;
  /** Hesap silme fonksiyonu */
  onDeleteAccount: (account: AccountItem) => void;
  /** Yeni hesap ekleme fonksiyonu */
  onAddAccount: () => void;
  /** Yükleniyor durumu */
  loading?: boolean;
}

export const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  onEditAccount,
  onDeleteAccount,
  onAddAccount,
  loading = false,
}) => {
  /**
   * Hesap türü bilgilerini döndürür (ikon ve renk)
   */
  const getAccountTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cash':
        return { icon: 'wallet', color: '#4CAF50' };
      case 'bank':
        return { icon: 'card', color: '#2196F3' };
      case 'credit_card':
        return { icon: 'card', color: '#F44336' };
      case 'savings':
        return { icon: 'home', color: '#9C27B0' };
      case 'investment':
        return { icon: 'trending-up', color: '#FF9800' };
      default:
        return { icon: 'wallet', color: '#666666' };
    }
  };

  /**
   * Hesap türünün Türkçe adını döndürür
   */
  const getAccountTypeName = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'cash':
        return 'Nakit';
      case 'bank':
        return 'Banka Hesabı';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'savings':
        return 'Tasarruf';
      case 'investment':
        return 'Yatırım';
      default:
        return 'Diğer';
    }
  };

  /**
   * Hesap silme onayı gösterir
   */
  const handleDeleteConfirmation = (account: AccountItem) => {
    Alert.alert(
      'Hesabı Sil',
      `"${account.name}" hesabını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDeleteAccount(account),
        },
      ]
    );
  };

  /**
   * Tek bir hesap kartı render eder
   */
  const renderAccountCard = (account: AccountItem) => {
    const typeInfo = getAccountTypeInfo(account.type);
    const isNegative = account.balance < 0;
    
    return (
      <View key={account.id} style={styles.accountCard}>
        <View style={styles.accountHeader}>
          {/* Hesap İkonu ve Bilgileri */}
          <View style={styles.accountInfo}>
            <View style={[
              styles.accountIcon,
              { backgroundColor: account.color }
            ]}>
              <Ionicons
                name={typeInfo.icon as any}
                size={24}
                color="#FFFFFF"
              />
            </View>
            
            <View style={styles.accountDetails}>
              <Text style={styles.accountName} numberOfLines={1}>
                {account.name}
              </Text>
              
              <Text style={styles.accountType}>
                {getAccountTypeName(account.type)}
              </Text>
            </View>
          </View>

          {/* Hesap Bakiyesi */}
          <View style={styles.balanceSection}>
            <Text style={[
              styles.balanceAmount,
              { color: isNegative ? '#F44336' : '#4CAF50' }
            ]}>
              {formatCurrency(account.balance)}
            </Text>
            
            <View style={styles.actionButtons}>
              {/* Düzenle Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEditAccount(account)}
              >
                <Ionicons
                  name="pencil"
                  size={16}
                  color="#666666"
                />
              </TouchableOpacity>
              
              {/* Sil Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteConfirmation(account)}
              >
                <Ionicons
                  name="trash"
                  size={16}
                  color="#F44336"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Boş durum render eder
   */
  const renderEmptyState = () => (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyState}>
        <Ionicons
          name="wallet-outline"
          size={48}
          color="#666666"
          style={styles.emptyIcon}
        />
        
        <Text style={styles.emptyTitle}>
          Henüz hesap eklenmedi
        </Text>
        
        <Text style={styles.emptyDescription}>
          Para yönetimine başlamak için ilk hesabınızı oluşturun
        </Text>
        
        <TouchableOpacity
          style={styles.addAccountButton}
          onPress={onAddAccount}
        >
          <Ionicons
            name="add"
            size={16}
            color="#FFFFFF"
            style={styles.addIcon}
          />
          <Text style={styles.addAccountButtonText}>
            Hesap Oluştur
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Aktif hesapları filtrele ve sırala
  const activeAccounts = accounts
    .filter(account => account.isActive)
    .sort((a, b) => {
      // Pozitif bakiyeli hesaplar önce, sonra negatif
      if (a.balance >= 0 && b.balance >= 0) {
        return b.balance - a.balance; // Yüksek bakiye önce
      }
      if (a.balance < 0 && b.balance < 0) {
        return b.balance - a.balance; // Sıfıra yakın önce
      }
      if (a.balance >= 0 && b.balance < 0) {
        return -1; // Pozitif önce
      }
      return 1; // Negatif sonra
    });

  return (
    <View style={styles.container}>
      {/* Bölüm Başlığı */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Hesaplarım
        </Text>
        
        {activeAccounts.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddAccount}
          >
            <Ionicons
              name="add"
              size={16}
              color="#2196F3"
            />
            <Text style={styles.addButtonText}>
              Yeni Hesap
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hesaplar Listesi veya Boş Durum */}
      <View style={styles.accountsList}>
        {loading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>
              Hesaplar yükleniyor...
            </Text>
          </View>
        ) : activeAccounts.length === 0 ? (
          renderEmptyState()
        ) : (
          activeAccounts.map(renderAccountCard)
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
    paddingVertical: 24,
    backgroundColor: '#000000',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },

  // Hesaplar Listesi
  accountsList: {
    gap: 12,
  },

  // Hesap Kartı
  accountCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666666',
  },

  // Bakiye Bölümü
  balanceSection: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  },

  // Loading State
  loadingCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },

  // Boş Durum
  emptyStateCard: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addIcon: {
    marginRight: 8,
  },
  addAccountButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 