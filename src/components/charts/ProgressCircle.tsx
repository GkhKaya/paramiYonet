import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const { width } = Dimensions.get('window');

interface ProgressCircleProps {
  /** Yüzde değeri (0-100 arası) */
  percentage: number;
  /** Merkezdeki ana metin */
  centerText?: string;
  /** Merkezdeki alt metin */
  centerSubText?: string;
  /** İlerleme rengi */
  progressColor?: string;
  /** Arkaplan rengi */
  backgroundColor?: string;
  /** Başlık metni */
  title?: string;
  /** Circle boyutu */
  size?: 'small' | 'medium' | 'large';
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  centerText,
  centerSubText,
  progressColor = COLORS.PRIMARY,
  backgroundColor = COLORS.SURFACE,
  title,
  size = 'medium',
}) => {
  // Size'a göre circle boyutunu belirle
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { circleSize: 80, strokeWidth: 8, titleSize: TYPOGRAPHY.sizes.sm, percentageSize: TYPOGRAPHY.sizes.lg };
      case 'large':
        return { circleSize: Math.min(width * 0.5, 180), strokeWidth: 12, titleSize: TYPOGRAPHY.sizes.md, percentageSize: TYPOGRAPHY.sizes.xxxl };
      case 'medium':
      default:
        return { circleSize: 120, strokeWidth: 10, titleSize: TYPOGRAPHY.sizes.sm, percentageSize: TYPOGRAPHY.sizes.xl };
    }
  };

  const { circleSize, strokeWidth, titleSize, percentageSize } = getSizeConfig();
  const RADIUS = (circleSize - strokeWidth) / 2;

  // Yüzdeyi 0-100 arasında sınırla
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  // Daire çevresi hesaplama
  const circumference = 2 * Math.PI * RADIUS;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Progress circle segments oluştur
  const createProgressSegments = () => {
    const segments = [];
    const segmentCount = 40; // Toplam segment sayısı
    const activeSegments = Math.round((clampedPercentage / 100) * segmentCount);
    
    for (let i = 0; i < segmentCount; i++) {
      const angle = (360 / segmentCount) * i - 90; // -90 üstten başlamak için
      const radian = (angle * Math.PI) / 180;
      
      const x = circleSize / 2 + Math.cos(radian) * RADIUS;
      const y = circleSize / 2 + Math.sin(radian) * RADIUS;
      
      const isActive = i < activeSegments;
      const segmentColor = isActive ? progressColor : backgroundColor;
      
      segments.push(
        <View
          key={i}
          style={[
            styles.segment,
            {
              left: x - 3,
              top: y - 3,
              backgroundColor: segmentColor,
              opacity: isActive ? 1 : 0.3,
            }
          ]}
        />
      );
    }
    
    return segments;
  };

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      )}
      
      <View style={styles.circleContainer}>
        <View style={[styles.circleBackground, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
          {/* Progress Segments */}
          {createProgressSegments()}
          
          {/* Center Content */}
          <View style={styles.centerContent}>
            <Text style={[styles.percentageText, { fontSize: percentageSize }]}>{Math.round(clampedPercentage)}%</Text>
            {centerText && (
              <Text style={styles.centerText}>{centerText}</Text>
            )}
            {centerSubText && (
              <Text style={styles.centerSubText}>{centerSubText}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackground: {
    position: 'relative',
    borderRadius: 90,
    backgroundColor: COLORS.SURFACE + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: TYPOGRAPHY.sizes.xxxl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  centerText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  centerSubText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
}); 