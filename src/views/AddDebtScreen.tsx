import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { DebtType } from '../models/Debt';
import { Account, AccountType } from '../models/Account';
import { DebtViewModel } from '../viewmodels/DebtViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks';

interface AddDebtScreenProps {
  navigation: any;
}

const AddDebtScreen: React.FC<AddDebtScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [debtViewModel, setDebtViewModel] = useState<DebtViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  
  // Form states
  const [selectedType, setSelectedType] = useState<DebtType>(DebtType.LENT);
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Custom hooks
  const { formatCurrency, currencySymbol } = useCurrency();

  // Initialize ViewModels
  useEffect(() => {
    if (user?.id) {
      const debtVm = new DebtViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setDebtViewModel(debtVm);
      setAccountViewModel(accountVm);
      accountVm.loadAccounts();
    }
  }, [user?.id]);

  // Auto-select first account
  useEffect(() => {
    if (accountViewModel?.accounts && accountViewModel.accounts.length > 0 && !selectedAccount) {
      const availableAccounts = accountViewModel.accounts.filter(acc => 
        acc.isActive && 
        acc.type !== AccountType.GOLD && 
        acc.type !== AccountType.CREDIT_CARD
      );
      if (availableAccounts.length > 0) {
        setSelectedAccount(availableAccounts[0]);
      }
    }
  }, [accountViewModel?.accounts, selectedAccount]);

  const availableAccounts = accountViewModel?.accounts.filter(acc => 
    acc.isActive && 
    acc.type !== AccountType.GOLD && 
    acc.type !== AccountType.CREDIT_CARD
  ) || [];

  const handleAmountChange = (text: string) => {
    // Sadece sayı ve virgül kabul et
    let filtered = text.replace(/[^0-9,]/g, '');
    
    // Çoklu virgülü engelle
    const commaCount = (filtered.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = filtered.indexOf(',');
      filtered = filtered.substring(0, firstCommaIndex + 1) + filtered.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    // Virgülden sonra max 2 basamak
    if (filtered.includes(',')) {
      const parts = filtered.split(',');
      if (parts[1] && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
      }
      filtered = parts[0] + ',' + (parts[1] || '');
    }
    
    setAmount(filtered);
  };

  const getNumericAmount = (): number => {
    if (!amount || amount.trim() === '') return 0;
    const numericValue = parseFloat(amount.replace(',', '.'));
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const getAccountTypeName = (type: AccountType): string => {
    switch (type) {
      case AccountType.CASH:
        return 'Nakit';
      case AccountType.DEBIT_CARD:
        return 'Banka Kartı';
      case AccountType.CREDIT_CARD:
        return 'Kredi Kartı';
      case AccountType.SAVINGS:
        return 'Tasarruf Hesabı';
      case AccountType.INVESTMENT:
        return 'Yatırım Hesabı';
      default:
        return 'Hesap';
    }
  };

  const handleSave = async () => {
    const numericAmount = getNumericAmount();
    
    if (!personName.trim()) {
      Alert.alert('Hata', 'Lütfen kişi adını girin');
      return;
    }

    if (numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Hata', 'Lütfen hesap seçin');
      return;
    }

    if (!user || !debtViewModel) {
      Alert.alert('Hata', 'Sistem hatası');
      return;
    }

    setLoading(true);

    const success = await debtViewModel.createDebt(
      selectedType,
      personName.trim(),
      numericAmount,
      selectedAccount.id,
      description.trim() || undefined
    );

    setLoading(false);

    if (success) {
      const typeText = selectedType === DebtType.LENT ? 'verme' : 'alma';
      Alert.alert('Başarılı', `Borç ${typeText} kaydı oluşturuldu`, [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Hata', 'Borç kaydı oluşturulamadı');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Borç Ekle</Text>
      <View style={styles.headerButton} />
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Borç Türü</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === DebtType.LENT && { backgroundColor: COLORS.SUCCESS }
          ]}
          onPress={() => setSelectedType(DebtType.LENT)}
        >
          <Ionicons 
            name="arrow-up" 
            size={20} 
            color={selectedType === DebtType.LENT ? COLORS.WHITE : COLORS.TEXT_SECONDARY} 
          />
          <Text style={[
            styles.typeButtonText,
            { color: selectedType === DebtType.LENT ? COLORS.WHITE : COLORS.TEXT_SECONDARY }
          ]}>
            Borç Verdim
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === DebtType.BORROWED && { backgroundColor: COLORS.ERROR }
          ]}
          onPress={() => setSelectedType(DebtType.BORROWED)}
        >
          <Ionicons 
            name="arrow-down" 
            size={20} 
            color={selectedType === DebtType.BORROWED ? COLORS.WHITE : COLORS.TEXT_SECONDARY} 
          />
          <Text style={[
            styles.typeButtonText,
            { color: selectedType === DebtType.BORROWED ? COLORS.WHITE : COLORS.TEXT_SECONDARY }
          ]}>
            Borç Aldım
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPersonNameInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kişi Adı</Text>
      <TextInput
        style={styles.input}
        value={personName}
        onChangeText={setPersonName}
        placeholder="Örn: Ahmet Yılmaz"
        placeholderTextColor={COLORS.TEXT_TERTIARY}
        maxLength={50}
      />
    </View>
  );

  const renderAmountInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tutar</Text>
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>{currencySymbol}</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={handleAmountChange}
          placeholder="0,00"
          placeholderTextColor={COLORS.TEXT_TERTIARY}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderAccountSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Hesap</Text>
      <TouchableOpacity
        style={styles.accountButton}
        onPress={() => setShowAccountPicker(true)}
      >
        <View style={styles.accountButtonLeft}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.TEXT_PRIMARY} />
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>
              {selectedAccount ? selectedAccount.name : 'Hesap Seç'}
            </Text>
            {selectedAccount && (
              <Text style={styles.accountType}>
                {getAccountTypeName(selectedAccount.type)} • {formatCurrency(selectedAccount.balance)}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_SECONDARY} />
      </TouchableOpacity>
    </View>
  );

  const renderDescriptionInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Açıklama (opsiyonel)</Text>
      <TextInput
        style={[styles.input, styles.descriptionInput]}
        value={description}
        onChangeText={setDescription}
        placeholder="Borç ile ilgili not ekleyin..."
        placeholderTextColor={COLORS.TEXT_TERTIARY}
        multiline
        maxLength={200}
        textAlignVertical="top"
      />
    </View>
  );

  const renderSaveButton = () => (
    <View style={styles.bottomContainer}>
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={COLORS.WHITE} />
            <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
          </>
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderAccountPicker = () => (
    <Modal
      visible={showAccountPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAccountPicker(false)}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => setShowAccountPicker(false)}>
        <Pressable style={styles.accountModalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hesap Seç</Text>
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.accountModalContent}>
            {availableAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountModalItem,
                  selectedAccount?.id === account.id && styles.accountModalItemSelected
                ]}
                onPress={() => {
                  setSelectedAccount(account);
                  setShowAccountPicker(false);
                }}
              >
                <View style={styles.accountModalIcon}>
                  <Ionicons 
                    name={account.type === AccountType.CASH ? "wallet" :
                          account.type === AccountType.SAVINGS ? "save" : 
                          account.type === AccountType.INVESTMENT ? "trending-up" :
                          "card-outline"} 
                    size={24} 
                    color={COLORS.WHITE} 
                  />
                </View>
                <View style={styles.accountModalTextContainer}>
                  <Text style={styles.accountModalName}>{account.name}</Text>
                  <Text style={styles.accountModalType}>
                    {getAccountTypeName(account.type)} • {formatCurrency(account.balance)}
                  </Text>
                </View>
                {selectedAccount?.id === account.id && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderTypeSelector()}
        {renderPersonNameInput()}
        {renderAmountInput()}
        {renderAccountSelector()}
        {renderDescriptionInput()}
      </ScrollView>

      {renderSaveButton()}
      {renderAccountPicker()}
    </SafeAreaView>
  );
});

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
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    minWidth: 40,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    // Space for bottom button - removed since we use SafeArea now
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: SPACING.xs,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  accountButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  accountName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  accountType: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  descriptionInput: {
    minHeight: 80,
  },
  bottomContainer: {
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.TEXT_TERTIARY,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  accountModalContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  accountModalContent: {
    maxHeight: 400,
  },
  accountModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  accountModalItemSelected: {
    backgroundColor: COLORS.SURFACE,
  },
  accountModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  accountModalTextContainer: {
    flex: 1,
  },
  accountModalName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  accountModalType: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AddDebtScreen; 