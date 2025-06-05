import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CategoryIcon } from '../common/CategoryIcon';
import { Button } from '../common/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../models/Category';
import { Account } from '../../models/Account';

interface CreateRecurringPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (paymentData: {
    name: string;
    description?: string;
    amount: number;
    category: string;
    accountId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    reminderDays: number;
    autoCreateTransaction: boolean;
  }) => Promise<boolean>;
  accounts: Account[];
  isLoading: boolean;
}

export const CreateRecurringPaymentModal: React.FC<CreateRecurringPaymentModalProps> = ({
  visible,
  onClose,
  onSubmit,
  accounts,
  isLoading,
}) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [reminderDays, setReminderDays] = useState<string>('3');
  const [autoCreateTransaction, setAutoCreateTransaction] = useState<boolean>(true);
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAmount('');
    setSelectedCategory('');
    setSelectedAccount('');
    setFrequency('monthly');
    setStartDate(new Date());
    setEndDate(undefined);
    setHasEndDate(false);
    setReminderDays('3');
    setAutoCreateTransaction(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validations
    if (!name.trim()) {
      Alert.alert('Hata', 'Lütfen ödeme adını girin');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Hata', 'Lütfen bir hesap seçin');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    const numericReminderDays = parseInt(reminderDays);
    if (isNaN(numericReminderDays) || numericReminderDays < 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir hatırlatma gün sayısı girin');
      return;
    }

    try {
      const success = await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        amount: numericAmount,
        category: selectedCategory,
        accountId: selectedAccount,
        frequency,
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        reminderDays: numericReminderDays,
        autoCreateTransaction,
      });

      if (success) {
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Error creating recurring payment:', error);
    }
  };

  const formatAmount = (text: string) => {
    // Remove non-numeric characters except comma and dot
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setAmount(cleaned);
  };

  const getFrequencyLabel = (freq: string): string => {
    const labels: { [key: string]: string } = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
      yearly: 'Yıllık',
    };
    return labels[freq] || freq;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>Düzenli Ödeme Ekle</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Payment Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ödeme Adı *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Örn: Netflix Aboneliği"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Opsiyonel açıklama"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              returnKeyType="next"
            />
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tutar *</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₺</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={formatAmount}
                placeholder="0,00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tekrar Sıklığı</Text>
            <View style={styles.frequencyGrid}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && styles.frequencyButtonActive
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    frequency === freq && styles.frequencyButtonTextActive
                  ]}>
                    {getFrequencyLabel(freq)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategori *</Text>
            <View style={styles.categoriesGrid}>
              {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.name && styles.categoryItemSelected
                  ]}
                  onPress={() => setSelectedCategory(category.name)}
                >
                  <CategoryIcon
                    iconName={category.icon}
                    color={category.color}
                    size="small"
                  />
                  <Text style={[
                    styles.categoryItemText,
                    selectedCategory === category.name && styles.categoryItemTextSelected
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Account Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hesap *</Text>
            <View style={styles.accountGrid}>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountItem,
                    selectedAccount === account.id && styles.accountItemSelected
                  ]}
                  onPress={() => setSelectedAccount(account.id)}
                >
                  <View style={[styles.accountIcon, { backgroundColor: account.color }]}>
                    <Ionicons name={account.icon as any} size={16} color={COLORS.WHITE} />
                  </View>
                  <Text style={[
                    styles.accountItemText,
                    selectedAccount === account.id && styles.accountItemTextSelected
                  ]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Başlangıç Tarihi</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.dateButtonText}>
                {startDate.toLocaleDateString('tr-TR')}
              </Text>
            </TouchableOpacity>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setStartDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.sectionTitle}>Bitiş Tarihi Belirle</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
                trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                thumbColor={COLORS.WHITE}
              />
            </View>
            {hasEndDate && (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.dateButtonText}>
                  {endDate?.toLocaleDateString('tr-TR') || 'Bitiş tarihi seçin'}
                </Text>
              </TouchableOpacity>
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display="default"
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setEndDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Reminder Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kaç Gün Önce Hatırlat</Text>
            <TextInput
              style={styles.textInput}
              value={reminderDays}
              onChangeText={setReminderDays}
              placeholder="3"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>

          {/* Auto Create Transaction */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchRowText}>
                <Text style={styles.sectionTitle}>Otomatik İşlem Oluştur</Text>
                <Text style={styles.switchRowDescription}>
                  Ödeme yapıldığında otomatik olarak gider işlemi oluşturulsun
                </Text>
              </View>
              <Switch
                value={autoCreateTransaction}
                onValueChange={setAutoCreateTransaction}
                trackColor={{ false: COLORS.BORDER, true: COLORS.PRIMARY }}
                thumbColor={COLORS.WHITE}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Düzenli Ödeme Oluştur"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!name || !selectedCategory || !selectedAccount || !amount}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.md,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  frequencyButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  frequencyButtonTextActive: {
    color: COLORS.PRIMARY,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '30%',
    flex: 1,
  },
  categoryItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  categoryItemText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  categoryItemTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '45%',
    flex: 1,
  },
  accountItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  accountIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  accountItemText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    flex: 1,
  },
  accountItemTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dateButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchRowText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  switchRowDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
}); 