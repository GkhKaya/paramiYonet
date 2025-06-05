import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../common/CategoryIcon';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { RecurringPayment } from '../../models/RecurringPayment';

interface RecurringPaymentCardProps {
  payment: RecurringPayment;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  onProcessPayment?: () => void;
  onSkipPayment?: () => void;
  showActions?: boolean;
}

export const RecurringPaymentCard: React.FC<RecurringPaymentCardProps> = ({
  payment,
  onPress,
  onEdit,
  onDelete,
  onToggleStatus,
  onProcessPayment,
  onSkipPayment,
  showActions = true,
}) => {
  const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getFrequencyLabel = (frequency: string): string => {
    const labels: { [key: string]: string } = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
      yearly: 'Yıllık',
    };
    return labels[frequency] || frequency;
  };

  const getDaysUntilPayment = (): number => {
    const now = new Date();
    const diffTime = payment.nextPaymentDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (): boolean => {
    return payment.nextPaymentDate < new Date();
  };

  const getStatusColor = (): string => {
    if (!payment.isActive) return COLORS.TEXT_SECONDARY;
    if (isOverdue()) return COLORS.ERROR;
    const daysUntil = getDaysUntilPayment();
    if (daysUntil <= 3) return COLORS.WARNING;
    return COLORS.SUCCESS;
  };

  const getStatusText = (): string => {
    if (!payment.isActive) return 'Pasif';
    if (isOverdue()) return 'Gecikmiş';
    const daysUntil = getDaysUntilPayment();
    if (daysUntil === 0) return 'Bugün';
    if (daysUntil === 1) return 'Yarın';
    return `${daysUntil} gün sonra`;
  };

  const handleProcessPayment = () => {
    Alert.alert(
      'Ödeme Yap',
      `${payment.name} için ${formatCurrency(payment.amount)} ödemek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Öde', 
          onPress: () => onProcessPayment?.(),
          style: 'default'
        }
      ]
    );
  };

  const handleSkipPayment = () => {
    Alert.alert(
      'Ödemeyi Atla',
      `${payment.name} ödemesini atlamak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Atla', 
          onPress: () => onSkipPayment?.(),
          style: 'destructive'
        }
      ]
    );
  };

  const daysUntil = getDaysUntilPayment();
  const statusColor = getStatusColor();

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        !payment.isActive && styles.inactiveContainer
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.paymentInfo}>
          <CategoryIcon 
            iconName={payment.categoryIcon || 'card'} 
            color={payment.isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
            size="medium"
          />
          <View style={styles.paymentText}>
            <Text style={[
              styles.paymentName,
              !payment.isActive && styles.inactiveText
            ]}>
              {payment.name}
            </Text>
            <Text style={styles.frequencyText}>
              {getFrequencyLabel(payment.frequency)}
            </Text>
          </View>
        </View>
        
        {showActions && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.statusButton}
              onPress={onToggleStatus}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={payment.isActive ? "pause" : "play"} 
                size={16} 
                color={payment.isActive ? COLORS.WARNING : COLORS.SUCCESS} 
              />
            </TouchableOpacity>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onEdit}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={16} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash" size={16} color={COLORS.ERROR} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Amount and Status */}
      <View style={styles.amountSection}>
        <Text style={[
          styles.amount,
          !payment.isActive && styles.inactiveText
        ]}>
          {formatCurrency(payment.amount)}
        </Text>
        
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Next Payment Date */}
      <View style={styles.dateSection}>
        <Text style={styles.dateLabel}>Sonraki Ödeme:</Text>
        <Text style={[
          styles.dateValue,
          !payment.isActive && styles.inactiveText
        ]}>
          {payment.nextPaymentDate.toLocaleDateString('tr-TR')}
        </Text>
      </View>

      {/* Description */}
      {payment.description && (
        <Text style={styles.description}>{payment.description}</Text>
      )}

      {/* Payment Actions */}
      {payment.isActive && isOverdue() && (
        <View style={styles.paymentActions}>
          <TouchableOpacity 
            style={[styles.paymentActionButton, styles.payButton]}
            onPress={handleProcessPayment}
          >
            <Text style={styles.payButtonText}>Öde</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.paymentActionButton, styles.skipButton]}
            onPress={handleSkipPayment}
          >
            <Text style={styles.skipButtonText}>Atla</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Toplam Ödenen</Text>
          <Text style={styles.statValue}>
            {formatCurrency(payment.totalPaid)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ödeme Sayısı</Text>
          <Text style={styles.statValue}>
            {payment.paymentCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  inactiveContainer: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  paymentName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  inactiveText: {
    color: COLORS.TEXT_SECONDARY,
  },
  frequencyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  statusButton: {
    padding: SPACING.xs,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  amount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  dateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  dateValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  paymentActionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButton: {
    backgroundColor: COLORS.SUCCESS,
  },
  skipButton: {
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  payButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  skipButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
}); 