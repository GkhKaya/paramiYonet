import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Rect, Path, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useCurrency } from '../../hooks';

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

type ChartType = 'pie' | 'vertical' | 'line';

export const CategoryChart: React.FC<CategoryChartProps> = ({ 
  data, 
  title = '',
  showValues = true 
}) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('pie');
  const { formatCurrency } = useCurrency({ minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const chartTypes = [
    { key: 'pie' as ChartType, label: 'Pasta' },
    { key: 'vertical' as ChartType, label: 'Çubuk' },
    { key: 'line' as ChartType, label: 'Çizgi' },
  ];

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

  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...sortedData.map(item => item.value));

  // Pie Chart
  const renderPieChart = () => {
    const chartSize = Math.min(width - 60, 280);
    const radius = chartSize / 2 - 10;
    const centerX = chartSize / 2;
    const centerY = chartSize / 2;
    const textRadius = radius * 0.7; // Position for text (70% of radius)

    const createPiePath = (percentage: number, startAngle: number) => {
      const angle = (percentage / 100) * 360;
      const endAngle = startAngle + angle;
      
      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    const getTextPosition = (percentage: number, startAngle: number) => {
      const angle = (percentage / 100) * 360;
      const midAngle = startAngle + angle / 2;
      const x = centerX + textRadius * Math.cos((midAngle * Math.PI) / 180);
      const y = centerY + textRadius * Math.sin((midAngle * Math.PI) / 180);
      return { x, y };
    };

    let currentAngle = -90;

    return (
      <View style={styles.pieContainer}>
        <Svg width={chartSize} height={chartSize}>
          {sortedData.map((item, index) => {
            const path = createPiePath(item.percentage, currentAngle);
            const textPos = getTextPosition(item.percentage, currentAngle);
            currentAngle += (item.percentage / 100) * 360;
            
            return (
              <React.Fragment key={index}>
                <Path
                  d={path}
                  fill={item.color}
                  stroke={COLORS.WHITE}
                  strokeWidth={2}
                />
                {item.percentage > 5 && ( // Only show text if slice is large enough
                  <SvgText
                    x={textPos.x}
                    y={textPos.y}
                    fontSize="12"
                    fontWeight="700"
                    fill={COLORS.WHITE}
                    textAnchor="middle"
                    dy="0.3em"
                  >
                    {formatCurrency(item.value)}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
        </Svg>
        
        <View style={styles.pieLabels}>
          {sortedData.map((item, index) => (
            <View key={index} style={styles.pieLabelRow}>
              <View style={[styles.pieDot, { backgroundColor: item.color }]} />
              <Text style={styles.pieLabelText}>{item.name}</Text>
              <Text style={styles.pieLabelPercent}>%{item.percentage}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Vertical Bar Chart
  const renderVerticalChart = () => {
    const chartWidth = width - 40;
    const chartHeight = 300;
    const barSpacing = 8;
    const maxLabelHeight = 60;
    
    const availableWidth = chartWidth - (SPACING.lg * 2);
    const barWidth = (availableWidth - (barSpacing * (sortedData.length - 1))) / sortedData.length;
    const availableHeight = chartHeight - maxLabelHeight - SPACING.xl;

    return (
      <View style={styles.verticalContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {sortedData.map((item, index) => {
            const barHeight = (item.value / maxValue) * availableHeight;
            const x = SPACING.lg + (index * (barWidth + barSpacing));
            const y = chartHeight - maxLabelHeight - barHeight;
            const textX = x + barWidth / 2; // Center of the bar
            const textY = y - 10; // 10px above the bar
            
            return (
              <React.Fragment key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={item.color}
                  rx={4}
                  ry={4}
                />
                <SvgText
                  x={textX}
                  y={textY}
                  fontSize="11"
                  fontWeight="700"
                  fill={COLORS.TEXT_PRIMARY}
                  textAnchor="middle"
                  dy="0.3em"
                >
                  {formatCurrency(item.value)}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
        
        <View style={styles.verticalLabelsRow}>
          {sortedData.map((item, index) => {
            const leftPosition = SPACING.lg + (index * (barWidth + barSpacing));
            
            return (
              <View 
                key={index} 
                style={[
                  styles.verticalBarLabel, 
                  { left: leftPosition, width: barWidth }
                ]}
              >
                <Text style={styles.verticalLabelText} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.verticalLabelPercent}>%{item.percentage}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Line Chart
  const renderLineChart = () => {
    const chartWidth = width - 40;
    const chartHeight = 250;
    const padding = 30;
    
    const availableWidth = chartWidth - (padding * 2);
    const availableHeight = chartHeight - (padding * 2);
    
    const stepX = availableWidth / (sortedData.length - 1);
    const points = sortedData.map((item, index) => {
      const x = padding + (index * stepX);
      const y = padding + availableHeight - ((item.value / maxValue) * availableHeight);
      return { x, y, item };
    });

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <View style={styles.lineContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={COLORS.PRIMARY}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={6}
              fill={point.item.color}
              stroke={COLORS.WHITE}
              strokeWidth={2}
            />
          ))}
        </Svg>
        
        <View style={styles.lineLabels}>
          {sortedData.map((item, index) => (
            <View key={index} style={styles.lineLabelItem}>
              <View style={[styles.lineDot, { backgroundColor: item.color }]} />
              <Text style={styles.lineLabelText}>{item.name}</Text>
              <Text style={styles.lineLabelValue}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      {/* Chart Type Tabs */}
      <View style={styles.tabsContainer}>
        {chartTypes.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.tab,
              selectedChart === type.key && styles.activeTab
            ]}
            onPress={() => setSelectedChart(type.key)}
          >
            <Text style={[
              styles.tabText,
              selectedChart === type.key && styles.activeTabText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryLabel}>Toplam Harcama</Text>
        <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
        <Text style={styles.summarySubtitle}>{sortedData.length} kategori</Text>
      </View>

      {/* Chart Content */}
      <ScrollView style={styles.chartScrollView} showsVerticalScrollIndicator={false}>
        {selectedChart === 'pie' && renderPieChart()}
        {selectedChart === 'vertical' && renderVerticalChart()}
        {selectedChart === 'line' && renderLineChart()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  summaryContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginVertical: SPACING.xs,
  },
  summarySubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
  },
  chartScrollView: {
    width: '100%',
    maxHeight: 500,
  },
  
  // Pie Chart Styles
  pieContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pieLabels: {
    marginTop: SPACING.lg,
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  pieLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  pieDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  pieLabelText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  pieLabelPercent: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },

  // Vertical Chart Styles
  verticalContainer: {
    position: 'relative',
    width: '100%',
  },
  verticalLabelsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  verticalBarLabel: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalLabelText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  verticalLabelPercent: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },

  // Line Chart Styles
  lineContainer: {
    alignItems: 'center',
    width: '100%',
  },
  lineLabels: {
    marginTop: SPACING.lg,
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  lineLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.SURFACE,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  lineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  lineLabelText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  lineLabelValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
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