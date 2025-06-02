/**
 * AccountsList - Hesaplar Listesi Bileşeni
 * 
 * Bu bileşen kullanıcının hesaplarını listeler ve her hesap için
 * düzenleme/silme işlemlerini sağlar.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BaseText, BaseCard } from '../ui/BaseComponents';
import { formatCurrency } from '../../utils/formatters';
import { COLORS, SPACING, LAYOUT, BORDER_RADIUS } from '../../constants/ui';

/**
 * Hesap tipi tanımı (basitleştirilmiş)
 */
export interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  isActive: boolean;
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
        return { icon: 'wallet', color: COLORS.SUCCESS };
      case 'bank':
        return { icon: 'card', color: COLORS.PRIMARY };
      case 'credit_card':
        return { icon: 'card', color: COLORS.ERROR };
      case 'savings':
        return { icon: 'home', color: COLORS.INFO };
      case 'investment':
        return { icon: 'trending-up', color: COLORS.WARNING };
      default:
        return { icon: 'wallet', color: COLORS.TEXT_SECONDARY };
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
      <BaseCard
        key={account.id}
        variant="outlined"
        padding="md"
        style={styles.accountCard}
      >
        <View style={styles.accountHeader}>
          {/* Hesap İkonu ve Bilgileri */}
          <View style={styles.accountInfo}>
            <View style={[
              styles.accountIcon,
              { backgroundColor: typeInfo.color }
            ]}>
              <Ionicons
                name={typeInfo.icon as any}
                size={LAYOUT.iconSize.md}
                color={COLORS.WHITE}
              />
            </View>
            
            <View style={styles.accountDetails}>
              <BaseText
                variant="body"
                weight="semiBold"
                numberOfLines={1}
                style={styles.accountName}
              >
                {account.name}
              </BaseText>
              
              <BaseText
                variant="caption"
                color="TEXT_SECONDARY"
              >
                {getAccountTypeName(account.type)}
              </BaseText>
            </View>
          </View>

          {/* Hesap Bakiyesi */}
          <View style={styles.balanceSection}>
            <BaseText
              variant="body"
              weight="semiBold"
              color={isNegative ? 'ERROR' : 'SUCCESS'}
              align="right"
              style={styles.balanceAmount}
            >
              {formatCurrency(account.balance)}
            </BaseText>
            
            <View style={styles.actionButtons}>
              {/* Düzenle Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEditAccount(account)}
              >
                <Ionicons
                  name="pencil"
                  size={LAYOUT.iconSize.sm}
                  color={COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
              
              {/* Sil Butonu */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteConfirmation(account)}
              >
                <Ionicons
                  name="trash"
                  size={LAYOUT.iconSize.sm}
                  color={COLORS.ERROR}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  };

  /**
   * Boş durum render eder
   */
  const renderEmptyState = () => (
    <BaseCard variant="outlined" padding="lg" style={styles.emptyStateCard}>
      <View style={styles.emptyState}>
        <Ionicons
          name="wallet-outline"
          size={LAYOUT.iconSize.xl}
          color={COLORS.TEXT_DISABLED}
          style={styles.emptyIcon}
        />
        
        <BaseText
          variant="subtitle"
          color="TEXT_SECONDARY"
          align="center"
          style={styles.emptyTitle}
        >
          Henüz hesap eklenmedi
        </BaseText>
        
        <BaseText
          variant="caption"
          color="TEXT_SECONDARY"
          align="center"
          style={styles.emptyDescription}
        >
          Para yönetimine başlamak için ilk hesabınızı oluşturun
        </BaseText>
        
        <TouchableOpacity
          style={styles.addAccountButton}
          onPress={onAddAccount}
        >
          <Ionicons
            name="add"
            size={LAYOUT.iconSize.sm}
            color={COLORS.WHITE}
            style={styles.addIcon}
          />
          <BaseText
            variant="caption"
            color="TEXT_LIGHT"
            weight="medium"
          >
            Hesap Oluştur
          </BaseText>
        </TouchableOpacity>
      </View>
    </BaseCard>
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
        <BaseText
          variant="subtitle"
          weight="semiBold"
          style={styles.sectionTitle}
        >
          Hesaplarım
        </BaseText>
        
        {activeAccounts.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddAccount}
          >
            <Ionicons
              name="add"
              size={LAYOUT.iconSize.sm}
              color={COLORS.PRIMARY}
            />
            <BaseText
              variant="caption"
              color="PRIMARY"
              weight="medium"
              style={styles.addButtonText}
            >
              Yeni Hesap
            </BaseText>
          </TouchableOpacity>
        )}
      </View>

      {/* Hesaplar Listesi veya Boş Durum */}
      <View style={styles.accountsList}>
        {loading ? (
          <BaseCard variant="outlined" padding="lg">
            <BaseText variant="caption" color="TEXT_SECONDARY" align="center">
              Hesaplar yükleniyor...
            </BaseText>
          </BaseCard>
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
 * Stil Tanımları
 */
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  addButtonText: {
    marginLeft: SPACING.xs,
  },

  // Hesaplar Listesi
  accountsList: {
    gap: SPACING.sm,
  },

  // Hesap Kartı
  accountCard: {
    backgroundColor: COLORS.SURFACE,
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
    width: LAYOUT.iconSize.xl,
    height: LAYOUT.iconSize.xl,
    borderRadius: LAYOUT.iconSize.xl / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    marginBottom: SPACING.xs,
  },

  // Bakiye Bölümü
  balanceSection: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    marginBottom: SPACING.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.SURFACE,
  },

  // Boş Durum
  emptyStateCard: {
    backgroundColor: COLORS.SURFACE,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    marginBottom: SPACING.lg,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addIcon: {
    marginRight: SPACING.xs,
  },
}); 