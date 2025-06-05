import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../common/CategoryIcon';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { Budget } from '../../models/Budget';

interface BudgetCardProps {
  budget: Budget;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  budget,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return COLORS.ERROR;
    if (percentage >= 80) return COLORS.WARNING;
    return COLORS.SUCCESS;
  };

  const getStatusIcon = (percentage: number): keyof typeof Ionicons.glyphMap => {
    if (percentage >= 100) return 'alert-circle';
    if (percentage >= 80) return 'warning';
    return 'checkmark-circle';
  };

  const getStatusText = (percentage: number): string => {
    if (percentage >= 100) return 'Bütçe Aşıldı';
    if (percentage >= 80) return 'Dikkat';
    return 'Sağlıklı';
  };

  const getDaysRemaining = (): number => {
    const now = new Date();
    const diffTime = budget.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const progressColor = getProgressColor(budget.progressPercentage);
  const statusIcon = getStatusIcon(budget.progressPercentage);
  const statusText = getStatusText(budget.progressPercentage);
  const daysRemaining = getDaysRemaining();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.categoryInfo}>
          <CategoryIcon 
            iconName={budget.categoryIcon || 'ellipsis-horizontal'} 
            color={budget.categoryColor || '#95A5A6'} 
            size="medium"
          />
          <View style={styles.categoryText}>
            <Text style={styles.categoryName}>{budget.categoryName}</Text>
            <Text style={styles.periodText}>
              {budget.period === 'monthly' ? 'Aylık' : 'Haftalık'} Bütçe
            </Text>
          </View>
        </View>
        
        {showActions && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onEdit}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={18} color={COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash" size={18} color={COLORS.ERROR} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Amounts */}
      <View style={styles.amounts}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Harcanan:</Text>
          <Text style={[styles.amountValue, { color: progressColor }]}>
            {formatCurrency(budget.spentAmount)}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Bütçe:</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(budget.budgetedAmount)}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Kalan:</Text>
          <Text style={[styles.amountValue, { 
            color: budget.remainingAmount < 0 ? COLORS.ERROR : COLORS.SUCCESS 
          }]}>
            {formatCurrency(budget.remainingAmount)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${Math.min(budget.progressPercentage, 100)}%`,
                backgroundColor: progressColor
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: progressColor }]}>
          {budget.progressPercentage.toFixed(0)}%
        </Text>
      </View>

      {/* Status */}
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <Ionicons name={statusIcon} size={16} color={progressColor} />
          <Text style={[styles.statusText, { color: progressColor }]}>
            {statusText}
          </Text>
        </View>
        <Text style={styles.daysText}>
          {daysRemaining > 0 ? `${daysRemaining} gün kaldı` : 'Süre doldu'}
        </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  periodText: {
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
  amounts: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  amountValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    minWidth: 40,
    textAlign: 'right',
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  daysText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
}); 