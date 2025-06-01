import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const { width } = Dimensions.get('window');
const CHART_SIZE = Math.min(width * 0.7, 250);

export interface DonutChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  data: DonutChartData[];
  centerText?: string;
  showLegend?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  centerText = '',
  showLegend = true 
}) => {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Veri bulunamadı</Text>
        </View>
      </View>
    );
  }

  // Create donut segments using stacked circles
  const createDonutSegments = () => {
    const center = CHART_SIZE / 2;
    const outerRadius = center - 20;
    const innerRadius = outerRadius - 40;
    
    let cumulativePercentage = 0;
    
    return data.map((item, index) => {
      const startPercentage = cumulativePercentage;
      const endPercentage = cumulativePercentage + item.percentage;
      cumulativePercentage += item.percentage;

      // Calculate angles in degrees
      const startAngle = (startPercentage / 100) * 360 - 90; // -90 to start from top
      const endAngle = (endPercentage / 100) * 360 - 90;
      const angle = endAngle - startAngle;

      // Don't show very small segments
      if (item.percentage < 2) return null;

      // Create multiple small segments to simulate the arc
      const segments = [];
      const segmentCount = Math.max(3, Math.floor(angle / 15)); // More segments for smoother curve
      
      for (let i = 0; i < segmentCount; i++) {
        const segmentAngle = startAngle + (angle / segmentCount) * i;
        const nextSegmentAngle = startAngle + (angle / segmentCount) * (i + 1);
        const midAngle = (segmentAngle + nextSegmentAngle) / 2;
        
        // Calculate position for each segment
        const radian = (midAngle * Math.PI) / 180;
        const segmentRadius = (outerRadius + innerRadius) / 2;
        const x = center + Math.cos(radian) * segmentRadius;
        const y = center + Math.sin(radian) * segmentRadius;
        
        const segmentWidth = (outerRadius - innerRadius) * 0.8;
        const segmentHeight = Math.max(8, angle / segmentCount + 2);

        segments.push(
          <View
            key={`${index}-${i}`}
            style={[
              styles.segment,
              {
                backgroundColor: item.color,
                width: segmentWidth,
                height: segmentHeight,
                left: x - segmentWidth / 2,
                top: y - segmentHeight / 2,
                transform: [{ rotate: `${midAngle}deg` }],
                borderRadius: segmentHeight / 2,
              }
            ]}
          />
        );
      }
      
      return segments;
    }).flat();
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

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <View style={[styles.chartBackground, { width: CHART_SIZE, height: CHART_SIZE }]}>
          {/* Donut Segments */}
          {createDonutSegments()}
          
          {/* Center Circle */}
          <View style={styles.centerCircle}>
            {centerText && (
              <Text style={styles.centerText}>{centerText}</Text>
            )}
          </View>
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
  },
  centerCircle: {
    width: CHART_SIZE * 0.4,
    height: CHART_SIZE * 0.4,
    borderRadius: (CHART_SIZE * 0.4) / 2,
    backgroundColor: COLORS.BACKGROUND,
    borderWidth: 2,
    borderColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  centerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
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