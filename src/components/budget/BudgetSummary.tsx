import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface BudgetSummaryProps {
  totalBudgeted: number;
  totalSpent: number;
  activeBudgetCount: number;
  overBudgetCount: number;
  status: 'healthy' | 'warning' | 'over_budget';
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  totalBudgeted,
  totalSpent,
  activeBudgetCount,
  overBudgetCount,
  status,
}) => {
  const formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'over_budget': return COLORS.ERROR;
      case 'warning': return COLORS.WARNING;
      default: return COLORS.SUCCESS;
    }
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'over_budget': return 'alert-circle';
      case 'warning': return 'warning';
      default: return 'checkmark-circle';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'over_budget': return 'Bütçe Aşımı';
      case 'warning': return 'Dikkat Gerekli';
      default: return 'Hedefte';
    }
  };

  const progressPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const remainingAmount = totalBudgeted - totalSpent;
  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bütçe Özeti</Text>
        <View style={styles.statusBadge}>
          <Ionicons name={getStatusIcon()} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Main Stats */}
      <View style={styles.mainStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Toplam Bütçe</Text>
          <Text style={styles.statValue}>
            {formatCurrency(totalBudgeted)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Harcanan</Text>
          <Text style={[styles.statValue, { color: statusColor }]}>
            {formatCurrency(totalSpent)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Kalan</Text>
          <Text style={[styles.statValue, { 
            color: remainingAmount < 0 ? COLORS.ERROR : COLORS.SUCCESS 
          }]}>
            {formatCurrency(remainingAmount)}
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
                width: `${Math.min(progressPercentage, 100)}%`,
                backgroundColor: statusColor
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: statusColor }]}>
          {progressPercentage.toFixed(0)}%
        </Text>
      </View>

      {/* Additional Info */}
      <View style={styles.additionalInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="folder" size={16} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.infoText}>
            {activeBudgetCount} aktif bütçe
          </Text>
        </View>
        {overBudgetCount > 0 && (
          <View style={styles.infoItem}>
            <Ionicons name="alert-circle" size={16} color={COLORS.ERROR} />
            <Text style={[styles.infoText, { color: COLORS.ERROR }]}>
              {overBudgetCount} aşım
            </Text>
          </View>
        )}
      </View>
    </View>
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
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.CARD,
    borderRadius: 8,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.BORDER,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    minWidth: 45,
    textAlign: 'right',
  },
  additionalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
}); 