import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../common/CategoryIcon';
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
    if (!payment.isActive) return '#666666';
    if (isOverdue()) return '#F44336';
    const daysUntil = getDaysUntilPayment();
    if (daysUntil <= 3) return '#FF9800';
    return '#4CAF50';
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
            color={payment.isActive ? '#2196F3' : '#666666'} 
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
                color={payment.isActive ? '#FF9800' : '#4CAF50'} 
              />
            </TouchableOpacity>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onEdit}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={16} color="#666666" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash" size={16} color="#F44336" />
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
        <Text style={styles.description} numberOfLines={2}>
          {payment.description}
        </Text>
      )}

      {/* Action Buttons */}
      {showActions && payment.isActive && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.processButton]} 
            onPress={handleProcessPayment}
          >
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
              Ödeme Yap
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.skipButton]} 
            onPress={handleSkipPayment}
          >
            <Ionicons name="arrow-forward-circle" size={16} color="#FF9800" />
            <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>
              Atla
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  inactiveContainer: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentText: {
    marginLeft: 12,
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  frequencyText: {
    fontSize: 14,
    color: '#666666',
  },
  inactiveText: {
    color: '#666666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    padding: 4,
  },
  actionButton: {
    padding: 4,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  dateValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  processButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF5010',
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF980010',
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 