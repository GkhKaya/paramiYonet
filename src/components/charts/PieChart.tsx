import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const { width } = Dimensions.get('window');
const CHART_SIZE = Math.min(width * 0.6, 200);
const RADIUS = CHART_SIZE / 2 - 20;

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface PieChartProps {
  data: PieChartData[];
  centerText?: string;
  showLegend?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  centerText = '',
  showLegend = true 
}) => {
  // Calculate angles for each slice
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativeAngle = 0;

  const slices = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    return {
      ...item,
      startAngle,
      endAngle,
      angle
    };
  });

  // Create pie slices using border radius technique
  const createSlice = (slice: any, index: number) => {
    const { startAngle, angle, color } = slice;
    
    // For small slices, we'll use a different approach
    if (angle < 5) return null;

    const rotation = startAngle + angle / 2;
    const size = Math.max(20, (angle / 360) * CHART_SIZE);

    return (
      <View
        key={index}
        style={[
          styles.slice,
          {
            backgroundColor: color,
            width: size,
            height: size,
            transform: [{ rotate: `${rotation}deg` }],
          }
        ]}
      />
    );
  };

  // Alternative: Create segments using positioned views
  const createSegments = () => {
    return slices.map((slice, index) => {
      const { angle, color, percentage } = slice;
      
      if (percentage < 3) return null; // Don't show very small slices

      // Calculate position for each segment
      const segmentAngle = (slice.startAngle + angle / 2) * (Math.PI / 180);
      const x = Math.cos(segmentAngle) * (RADIUS * 0.7);
      const y = Math.sin(segmentAngle) * (RADIUS * 0.7);

      return (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor: color,
              width: Math.max(30, angle * 2),
              height: Math.max(30, angle * 2),
              left: CHART_SIZE / 2 + x - 15,
              top: CHART_SIZE / 2 + y - 15,
              borderRadius: Math.max(15, angle),
            }
          ]}
        />
      );
    });
  };

  const Legend = () => {
    if (!showLegend) return null;

    return (
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <View style={styles.legendText}>
              <Text style={styles.legendName}>{item.name}</Text>
              <Text style={styles.legendValue}>%{item.percentage}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Veri bulunamadı</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Chart Background Circle */}
        <View style={[styles.chartBackground, { width: CHART_SIZE, height: CHART_SIZE }]}>
          {/* Segments */}
          {createSegments()}
          
          {/* Center Text */}
          {centerText && (
            <View style={styles.centerTextContainer}>
              <Text style={styles.centerText}>{centerText}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Legend */}
      <Legend />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  chartContainer: {
    marginBottom: SPACING.lg,
  },
  chartBackground: {
    borderRadius: CHART_SIZE / 2,
    backgroundColor: COLORS.SURFACE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slice: {
    position: 'absolute',
    borderRadius: 100,
  },
  segment: {
    position: 'absolute',
    opacity: 0.8,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  legend: {
    width: '100%',
    maxWidth: 300,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },
  legendText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
  },
  emptyChart: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    borderRadius: CHART_SIZE / 2,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
}); 