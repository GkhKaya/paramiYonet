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
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CategoryIcon } from '../common/CategoryIcon';
import { Button } from '../common/Button';
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
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
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
              placeholderTextColor="#666666"
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
              placeholderTextColor="#666666"
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
                placeholder="0.00"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategori *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.name && {
                      backgroundColor: '#2196F310',
                      borderColor: '#2196F3',
                    }
                  ]}
                  onPress={() => setSelectedCategory(category.name)}
                >
                  <CategoryIcon
                    iconName={category.icon}
                    color={selectedCategory === category.name ? '#2196F3' : '#666666'}
                    size="small"
                  />
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.name && { color: '#2196F3' }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Account Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hesap *</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.accountScroll}
            >
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountButton,
                    selectedAccount === account.id && {
                      backgroundColor: '#2196F310',
                      borderColor: '#2196F3',
                    }
                  ]}
                  onPress={() => setSelectedAccount(account.id)}
                >
                  <Text style={[
                    styles.accountText,
                    selectedAccount === account.id && { color: '#2196F3' }
                  ]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Frequency Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tekrar Sıklığı</Text>
            <View style={styles.frequencyButtons}>
              {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && {
                      backgroundColor: '#2196F310',
                      borderColor: '#2196F3',
                    }
                  ]}
                  onPress={() => setFrequency(freq as any)}
                >
                  <Text style={[
                    styles.frequencyText,
                    frequency === freq && { color: '#2196F3' }
                  ]}>
                    {getFrequencyLabel(freq)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Başlangıç Tarihi</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#666666" />
              <Text style={styles.dateText}>
                {startDate.toLocaleDateString('tr-TR')}
              </Text>
            </TouchableOpacity>

            <View style={styles.endDateContainer}>
              <View style={styles.switchContainer}>
                <Switch
                  value={hasEndDate}
                  onValueChange={setHasEndDate}
                  trackColor={{ false: '#333333', true: '#2196F350' }}
                  thumbColor={hasEndDate ? '#2196F3' : '#666666'}
                />
                <Text style={styles.switchLabel}>Bitiş Tarihi Ekle</Text>
              </View>

              {hasEndDate && (
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#666666" />
                  <Text style={styles.dateText}>
                    {endDate?.toLocaleDateString('tr-TR') || 'Seçiniz'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Reminder Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hatırlatma (Gün)</Text>
            <TextInput
              style={styles.textInput}
              value={reminderDays}
              onChangeText={setReminderDays}
              placeholder="3"
              placeholderTextColor="#666666"
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          {/* Auto Create Transaction */}
          <View style={styles.section}>
            <View style={styles.switchContainer}>
              <Switch
                value={autoCreateTransaction}
                onValueChange={setAutoCreateTransaction}
                trackColor={{ false: '#333333', true: '#2196F350' }}
                thumbColor={autoCreateTransaction ? '#2196F3' : '#666666'}
              />
              <Text style={styles.switchLabel}>
                Otomatik İşlem Oluştur
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <Button
            title="Kaydet"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          />
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          Platform.OS === 'ios' ? (
            <Modal
              visible={showStartDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowStartDatePicker(false)}
            >
              <View style={styles.iosDatePickerBackdrop}>
                <View style={styles.iosDatePickerContainer}>
                  <View style={styles.iosDatePickerHeader}>
                    <TouchableOpacity 
                      onPress={() => setShowStartDatePicker(false)}
                      style={styles.iosDatePickerButton}
                    >
                      <Text style={styles.iosDatePickerButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={styles.iosDatePickerTitle}>Başlangıç Tarihi</Text>
                    <TouchableOpacity 
                      onPress={() => setShowStartDatePicker(false)}
                      style={styles.iosDatePickerButton}
                    >
                      <Text style={[styles.iosDatePickerButtonText, styles.iosDatePickerDoneButton]}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.iosDatePickerContent}>
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="spinner"
                      textColor="#FFFFFF"
                      themeVariant="dark"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setStartDate(selectedDate);
                      }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
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
          )
        )}

        {showEndDatePicker && (
          Platform.OS === 'ios' ? (
            <Modal
              visible={showEndDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowEndDatePicker(false)}
            >
              <View style={styles.iosDatePickerBackdrop}>
                <View style={styles.iosDatePickerContainer}>
                  <View style={styles.iosDatePickerHeader}>
                    <TouchableOpacity 
                      onPress={() => setShowEndDatePicker(false)}
                      style={styles.iosDatePickerButton}
                    >
                      <Text style={styles.iosDatePickerButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <Text style={styles.iosDatePickerTitle}>Bitiş Tarihi</Text>
                    <TouchableOpacity 
                      onPress={() => setShowEndDatePicker(false)}
                      style={styles.iosDatePickerButton}
                    >
                      <Text style={[styles.iosDatePickerButtonText, styles.iosDatePickerDoneButton]}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.iosDatePickerContent}>
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display="spinner"
                      textColor="#FFFFFF"
                      themeVariant="dark"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setEndDate(selectedDate);
                      }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(false);
                if (selectedDate) {
                  setEndDate(selectedDate);
                }
              }}
            />
          )
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 8,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  accountScroll: {
    flexGrow: 0,
  },
  accountButton: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
    marginRight: 8,
  },
  accountText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  endDateContainer: {
    marginTop: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  // iOS Date Picker Styles
  iosDatePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosDatePickerContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  iosDatePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  iosDatePickerButtonText: {
    fontSize: 16,
    color: '#888888',
    fontWeight: '500',
  },
  iosDatePickerDoneButton: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  iosDatePickerTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iosDatePickerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
}); 