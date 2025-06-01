import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const { width } = Dimensions.get('window');

export interface CategoryChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface CategoryChartProps {
  data: CategoryChartData[];
  title?: string;
  showValues?: boolean;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ 
  data, 
  title = '',
  showValues = true 
}) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const currencySymbol = '₺';

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Veri bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Chart Bars */}
      <View style={styles.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barInfo}>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.percentage}>%{item.percentage}</Text>
            </View>
            
            <View style={styles.barWrapper}>
              <View style={styles.barBackground}>
                <View 
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: item.color,
                      width: `${item.percentage}%`,
                    }
                  ]}
                />
              </View>
              
              {showValues && (
                <Text style={styles.valueText}>
                  {formatCurrency(item.value)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
      
      {/* Summary Circles */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Kategori Dağılımı</Text>
        <View style={styles.circlesContainer}>
          {data.slice(0, 4).map((item, index) => (
            <View key={index} style={styles.circleItem}>
              <View 
                style={[
                  styles.circle,
                  { 
                    backgroundColor: item.color,
                    width: Math.max(40, item.percentage * 1.5),
                    height: Math.max(40, item.percentage * 1.5),
                    borderRadius: Math.max(20, item.percentage * 0.75),
                  }
                ]}
              >
                <Text style={styles.circleText}>%{item.percentage}</Text>
              </View>
              <Text style={styles.circleName}>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  chartContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  barContainer: {
    marginBottom: SPACING.lg,
  },
  barInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  percentage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  barBackground: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
    minWidth: 8,
  },
  valueText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  summaryContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  circleItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  circleText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  circleName: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
}); 