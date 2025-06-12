import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../../constants';
import { Account, AccountType } from '../../models';
import { useCurrency } from '../../hooks';
import { calculateAvailableLimit } from '../../utils/creditCard';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  showBalance?: boolean;
  onCreditCardPayment?: (account: Account) => void;
  onCreditCardTransaction?: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  showBalance = true,
  onCreditCardPayment,
  onCreditCardTransaction,
}) => {
  const { formatCurrency: formatBalance } = useCurrency();

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Nakit';
      case 'debit_card': return 'Banka Kartı';
      case 'credit_card': return 'Kredi Kartı';
      case 'savings': return 'Tasarruf';
      case 'investment': return 'Yatırım';
      default: return type;
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'cash': return 'cash';
      case 'debit_card': return 'card';
      case 'credit_card': return 'card';
      case 'savings': return 'wallet';
      case 'investment': return 'trending-up';
      default: return 'wallet';
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;
  const iconSize = isSmallDevice ? 18 : 20;

  return (
    <CardComponent onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Card variant="surface" style={StyleSheet.flatten([styles.card, { backgroundColor: account.color }])}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={`${getAccountTypeIcon(account.type)}-outline` as any}
              size={iconSize}
              color="white"
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
          </View>
        </View>
        
        {showBalance && (
          <View style={styles.balanceContainer}>
            {account.type === AccountType.CREDIT_CARD ? (
              <View style={styles.creditCardInfo}>
                <Text style={styles.debtText}>
                  Borç: {formatBalance(account.currentDebt || 0)}
                </Text>
                <Text style={styles.limitText}>
                  Limit: {formatBalance(account.limit || 0)}
                </Text>
                <Text style={styles.availableText}>
                  Kullanılabilir: {formatBalance(calculateAvailableLimit(account.limit || 0, account.currentDebt || 0))}
                </Text>
                
                {/* Kredi kartı için hızlı eylem butonları */}
                <View style={styles.creditCardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.expenseButton]}
                    onPress={() => onCreditCardTransaction?.(account)}
                  >
                    <Ionicons name="card" size={14} color="white" />
                    <Text style={styles.actionButtonText}>Harcama</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.paymentButton]}
                    onPress={() => onCreditCardPayment?.(account)}
                  >
                    <Ionicons name="cash" size={14} color="white" />
                    <Text style={styles.actionButtonText}>Ödeme</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.balance}>{formatBalance(account.balance)}</Text>
            )}
          </View>
        )}
      </Card>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  iconContainer: {
    width: isSmallDevice ? 36 : 40,
    height: isSmallDevice ? 36 : 40,
    borderRadius: isSmallDevice ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  
  info: {
    flex: 1,
  },
  
  accountName: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  
  accountType: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xs : TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  balanceContainer: {
    alignItems: 'flex-end',
  },
  
  balance: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.md : TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.WHITE,
  },

  creditCardInfo: {
    alignItems: 'flex-end',
  },

  debtText: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.sm : TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 2,
  },

  limitText: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xs : TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },

  availableText: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.xs : TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: '#4ECDC4',
  },

  creditCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },

  expenseButton: {
    backgroundColor: 'rgba(233, 30, 99, 0.8)',
  },

  paymentButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.8)',
  },

  actionButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
}); 