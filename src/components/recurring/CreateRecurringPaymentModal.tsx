import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  Pressable,
  LayoutAnimation,
  UIManager,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CategoryIcon } from '../common/CategoryIcon';
import { Button } from '../common/Button';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../models/Category';
import { Account, AccountType } from '../../models/Account';
import { observer } from 'mobx-react-lite';
import { useViewModels } from '../../contexts/ViewModelContext';
import { useTheme } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import { getAccountTypeName } from '../../utils/formatters';
import CustomAlert from '../common/CustomAlert';
import { useCurrency } from '../../hooks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Category } from '../../models/Category';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 3;

const getAccountIcon = (type: AccountType): string => {
  switch (type) {
    case AccountType.CASH:
      return 'cash-outline';
    case AccountType.CREDIT_CARD:
      return 'card-outline';
    case AccountType.DEBIT_CARD:
      return 'card-outline';
    case AccountType.SAVINGS:
      return 'wallet-outline';
    case AccountType.INVESTMENT:
      return 'analytics-outline';
    default:
      return 'help-circle-outline';
  }
};

interface CreateRecurringPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  paymentToEdit?: any;
}

const FREQUENCY_OPTIONS = [
  { label: 'Günlük', value: 'daily' },
  { label: 'Haftalık', value: 'weekly' },
  { label: 'Aylık', value: 'monthly' },
  { label: 'Yıllık', value: 'yearly' },
];

const CreateRecurringPaymentModal: React.FC<CreateRecurringPaymentModalProps> = observer(({
  visible,
  onClose,
  onSaveSuccess,
  paymentToEdit,
}) => {
  const { colors } = useTheme();
  const viewModels = useViewModels();
  const { formatCurrency } = useCurrency();

  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    accountId: '',
    frequency: 'monthly',
    startDate: new Date(),
    autoCreate: true,
  });

  const [showPicker, setShowPicker] = useState<null | 'category' | 'account' | 'date' | 'time'> (null);
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ visible: false, type: 'error', title: '', message: '' });

  const resetState = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      amount: '',
      category: '',
      accountId: '',
      frequency: 'monthly',
      startDate: new Date(),
      autoCreate: true,
    });
    slideAnim.setValue(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    if (visible) {
      resetState();
      if (paymentToEdit) {
        setFormData({
          name: paymentToEdit.name,
          amount: paymentToEdit.amount.toString(),
          category: paymentToEdit.category,
          accountId: paymentToEdit.accountId,
          frequency: paymentToEdit.frequency,
          startDate: paymentToEdit.startDate.toDate(),
          autoCreate: paymentToEdit.autoCreateTransaction,
        });
      }
    }
  }, [visible, paymentToEdit]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goToStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(slideAnim, {
      toValue: -(width * (step - 1)),
      duration: 300,
      useNativeDriver: true,
    }).start();
    setCurrentStep(step);
  };
  
  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const selectedCategory = useMemo(() => {
    return viewModels?.categoryViewModel?.expenseCategories.find(c => c.name === formData.category);
  }, [formData.category, viewModels?.categoryViewModel]);

  const selectedAccount = useMemo(() => {
    return viewModels?.accountViewModel?.accounts.find(a => a.id === formData.accountId);
  }, [formData.accountId, viewModels?.accountViewModel]);

  const handleSave = async () => {
    if (!viewModels?.recurringPaymentViewModel) return;

    const { name, amount, category, accountId, frequency, startDate, autoCreate } = formData;
    const numericAmount = parseFloat(amount.replace(',', '.'));

    if (!name || numericAmount <= 0 || !category || !accountId) {
      setAlert({
        visible: true,
        type: 'error',
        title: 'Eksik Bilgi',
        message: 'Lütfen tüm zorunlu alanları doldurun.',
      });
      return;
    }

    const transactionDate = new Date(startDate);

    const paymentData = {
      name: name.trim(),
      amount: numericAmount,
      category,
      categoryIcon: selectedCategory?.icon || 'help-circle-outline',
      accountId,
      frequency,
      startDate: transactionDate,
      nextPaymentDate: transactionDate,
      autoCreateTransaction: autoCreate,
      isActive: true,
      reminderDays: 1,
    };

    let success = false;
    try {
      if (paymentToEdit) {
        // success = await viewModels.recurringPaymentViewModel.updateRecurringPayment(paymentToEdit.id, paymentData);
      } else {
        success = await viewModels.recurringPaymentViewModel.createRecurringPayment(paymentData as any);
      }
    } catch (error) {
       console.error("Error creating recurring payment:", error);
       success = false;
    }

    if (success) {
      setAlert({
        visible: true,
        type: 'success',
        title: 'Başarılı',
        message: `Düzenli ödeme başarıyla ${paymentToEdit ? 'güncellendi' : 'oluşturuldu'}.`,
      });
      setTimeout(() => {
        onSaveSuccess();
        setAlert({ ...alert, visible: false });
      }, 1500);
    } else {
       setAlert({
        visible: true,
        type: 'error',
        title: 'Hata',
        message: 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      });
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <Ionicons name="close" size={26} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {paymentToEdit ? 'Düzenli Ödemeyi Düzenle' : 'Yeni Düzenli Ödeme'}
      </Text>
      <View style={{ width: 26 }} />
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { width: `${(100 / TOTAL_STEPS) * currentStep}%`, backgroundColor: colors.primary }]} />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, {color: colors.text}]}>Ödeme Adı ve Tutarı</Text>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Örn: Netflix, Kira..."
        placeholderTextColor={`${colors.text}80`}
        value={formData.name}
        onChangeText={(v) => handleInputChange('name', v)}
      />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.md }]}
        placeholder="Tutar"
        placeholderTextColor={`${colors.text}80`}
        keyboardType="numeric"
        value={formData.amount}
        onChangeText={(v) => handleInputChange('amount', v)}
      />
    </View>
  );
  
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, {color: colors.text}]}>Kategori ve Hesap</Text>
      <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowPicker('category')}>
        <Text style={{color: colors.text}}>{selectedCategory?.name || 'Kategori Seç'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.md }]} onPress={() => setShowPicker('account')}>
        <Text style={{color: colors.text}}>{selectedAccount?.name || 'Hesap Seç'}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, {color: colors.text}]}>Sıklık ve Zamanlama</Text>
      
      {/* Frequency Selector */}
      <View style={styles.frequencyContainer}>
          {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity
                  key={opt.value}
                  style={[
                      styles.frequencyButton,
                      { 
                          backgroundColor: formData.frequency === opt.value ? colors.primary : colors.card,
                          borderColor: formData.frequency === opt.value ? colors.primary : colors.border,
                      },
                  ]}
                  onPress={() => handleInputChange('frequency', opt.value)}
              >
                  <Text style={[
                      styles.frequencyText,
                      { color: formData.frequency === opt.value ? COLORS.WHITE : colors.text }
                  ]}>
                      {opt.label}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>

      {/* Date and Time Pickers */}
      <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.xl }]} onPress={() => setShowPicker('date')}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="calendar-outline" size={20} color={colors.text} style={{marginRight: SPACING.md}}/>
              <Text style={{color: colors.text}}>Başlangıç Tarihi</Text>
          </View>
          <Text style={{color: colors.text}}>{formData.startDate.toLocaleDateString('tr-TR')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.md }]} onPress={() => setShowPicker('time')}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons name="time-outline" size={20} color={colors.text} style={{marginRight: SPACING.md}}/>
              <Text style={{color: colors.text}}>İşlem Saati</Text>
          </View>
          <Text style={{color: colors.text}}>{formData.startDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
      </TouchableOpacity>

       {/* Auto-create switch */}
      <View style={[styles.switchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{color: colors.text}}>İşlemi Otomatik Oluştur</Text>
          <Switch
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={COLORS.WHITE}
              ios_backgroundColor={colors.border}
              onValueChange={val => handleInputChange('autoCreate', val)}
              value={formData.autoCreate}
          />
      </View>
    </View>
  );

  const renderItemPicker = (
    title: string,
    items: any[],
    renderItem: (item: any) => React.ReactNode,
    onClosePress: () => void
  ) => (
    <Modal visible={true} transparent animationType="fade">
      <Pressable style={styles.pickerBackdrop} onPress={onClosePress}>
        <Pressable style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
           <Text style={[styles.pickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text>
          <ScrollView>
            {items.map(item => renderItem(item))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          {renderHeader()}
          {renderProgressBar()}
          
          <Animated.View style={{flexDirection: 'row', width: width * TOTAL_STEPS, transform: [{translateX: slideAnim}]}}>
            {renderStep1()}
            {renderStep2()}
            {renderStep3()}
          </Animated.View>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {currentStep > 1 && <Button title="Geri" onPress={handleBack} variant="secondary" />}
            <Button
              title={currentStep === TOTAL_STEPS ? 'Kaydet' : 'İleri'}
              onPress={handleNext}
              loading={viewModels?.recurringPaymentViewModel?.isLoading || false}
              variant="primary"
              style={{ flex: 1, marginLeft: currentStep > 1 ? SPACING.md : 0 }}
            />
          </View>
        </SafeAreaView>

        {/* Pickers */}
        {showPicker === 'category' && renderItemPicker(
          "Kategori Seç",
          viewModels?.categoryViewModel?.expenseCategories || [],
          (cat: Category) => (
            <TouchableOpacity key={cat.id} style={[styles.pickerItem, { borderBottomColor: colors.border }]} onPress={() => {
              handleInputChange('category', cat.name);
              setShowPicker(null);
            }}>
              <CategoryIcon iconName={cat.icon} color={colors.primary} size="medium"/>
              <Text style={[styles.pickerItemText, {color: colors.text}]}>{cat.name}</Text>
            </TouchableOpacity>
          ),
          () => setShowPicker(null)
        )}

        {showPicker === 'account' && renderItemPicker(
          "Hesap Seç",
          viewModels?.accountViewModel?.accounts.filter(acc => acc.type !== AccountType.GOLD && acc.isActive) || [],
          (acc: Account) => (
            <TouchableOpacity key={acc.id} style={[styles.pickerItem, { borderBottomColor: colors.border }]} onPress={() => {
              handleInputChange('accountId', acc.id);
              setShowPicker(null);
            }}>
              <Ionicons name={acc.type === AccountType.CASH ? 'cash-outline' : 'card-outline'} size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={[styles.pickerItemText, {color: colors.text}]}>{acc.name}</Text>
                <Text style={{color: colors.text, opacity: 0.6}}>{getAccountTypeName(acc.type)}</Text>
              </View>
              <Text style={[styles.pickerItemText, {color: colors.text}]}>{formatCurrency(acc.balance, { currency: acc.currency })}</Text>
            </TouchableOpacity>
          ),
          () => setShowPicker(null)
        )}
        
        {showPicker === 'date' && (
          <DateTimePicker
            value={formData.startDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowPicker(null);
              if (date) {
                const newDate = new Date(formData.startDate);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                handleInputChange('startDate', newDate);
              }
            }}
          />
        )}

        {showPicker === 'time' && (
          <DateTimePicker
            value={formData.startDate}
            mode="time"
            display="default"
            onChange={(event, time) => {
              setShowPicker(null);
              if (time) {
                  const newDate = new Date(formData.startDate);
                  newDate.setHours(time.getHours());
                  newDate.setMinutes(time.getMinutes());
                  handleInputChange('startDate', newDate);
              }
            }}
          />
        )}
        
        <CustomAlert
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
          onPrimaryPress={() => setAlert({ ...alert, visible: false })}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  closeButton: {},
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.BORDER,
    margin: SPACING.md,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepContainer: {
    width: width,
    padding: SPACING.md
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.lg
  },
  input: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: TYPOGRAPHY.sizes.md
  },
  selector: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.md,
    borderTopWidth: 1,
    flexDirection: 'row'
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    maxHeight: '60%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : 0,
  },
  pickerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    padding: SPACING.md,
    textAlign: 'center',
    borderBottomWidth: 1,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: TYPOGRAPHY.sizes.md,
    marginLeft: SPACING.md
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  frequencyButton: {
    flex: 1,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  frequencyText: {
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  switchContainer: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});

export { CreateRecurringPaymentModal }; 