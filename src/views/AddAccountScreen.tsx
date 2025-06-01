import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY, CURRENCIES } from '../constants';
import { AccountType, CreateAccountRequest } from '../models/Account';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface AddAccountScreenProps {
  navigation: any;
}

const ACCOUNT_TYPES = [
  { 
    type: AccountType.CASH, 
    label: 'Nakit', 
    icon: 'cash-outline',
    color: COLORS.SUCCESS,
    description: 'Cüzdanınızdaki nakit para'
  },
  { 
    type: AccountType.DEBIT_CARD, 
    label: 'Banka Kartı', 
    icon: 'card-outline',
    color: COLORS.PRIMARY,
    description: 'Vadesiz hesap ve banka kartı'
  },
  { 
    type: AccountType.CREDIT_CARD, 
    label: 'Kredi Kartı', 
    icon: 'card-outline',
    color: COLORS.ERROR,
    description: 'Kredi kartı hesabı'
  },
  { 
    type: AccountType.SAVINGS, 
    label: 'Tasarruf', 
    icon: 'wallet-outline',
    color: COLORS.WARNING,
    description: 'Tasarruf hesabı'
  },
  { 
    type: AccountType.INVESTMENT, 
    label: 'Yatırım', 
    icon: 'trending-up-outline',
    color: COLORS.SECONDARY,
    description: 'Yatırım hesabı'
  },
];

const ACCOUNT_COLORS = [
  COLORS.PRIMARY,
  COLORS.SUCCESS,
  COLORS.ERROR,
  COLORS.WARNING,
  COLORS.SECONDARY,
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
];

const AddAccountScreen: React.FC<AddAccountScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [viewModel] = useState(() => user?.id ? new AccountViewModel(user.id) : null);

  const [accountName, setAccountName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType>(AccountType.DEBIT_CARD);
  const [initialBalance, setInitialBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS.PRIMARY);
  const [loading, setLoading] = useState(false);

  const currencySymbol = CURRENCIES.find(c => c.code === 'TRY')?.symbol || '₺';

  const handleCreateAccount = async () => {
    if (!accountName.trim()) {
      Alert.alert('Hata', 'Hesap adı gereklidir');
      return;
    }

    if (!initialBalance.trim()) {
      Alert.alert('Hata', 'Başlangıç bakiyesi gereklidir');
      return;
    }

    const balance = parseFloat(initialBalance.replace(',', '.'));
    if (isNaN(balance)) {
      Alert.alert('Hata', 'Geçerli bir bakiye giriniz');
      return;
    }

    if (!viewModel) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setLoading(true);

    const selectedTypeData = ACCOUNT_TYPES.find(type => type.type === selectedType);
    
    const accountData: CreateAccountRequest = {
      name: accountName.trim(),
      type: selectedType,
      initialBalance: balance,
      color: selectedColor,
      icon: selectedTypeData?.icon || 'wallet-outline',
    };

    const success = await viewModel.createAccount(accountData);
    
    setLoading(false);

    if (success) {
      Alert.alert(
        'Başarılı',
        'Hesap başarıyla oluşturuldu',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      Alert.alert('Hata', viewModel.error || 'Hesap oluşturulurken hata oluştu');
    }
  };

  const AccountTypeCard = ({ type, label, icon, color, description }: any) => (
    <TouchableOpacity
      style={[
        styles.typeCard,
        selectedType === type && styles.selectedTypeCard
      ]}
      onPress={() => setSelectedType(type)}
    >
      <View style={[styles.typeIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <View style={styles.typeInfo}>
        <Text style={styles.typeLabel}>{label}</Text>
        <Text style={styles.typeDescription}>{description}</Text>
      </View>
      {selectedType === type && (
        <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
      )}
    </TouchableOpacity>
  );

  const ColorOption = ({ color }: { color: string }) => (
    <TouchableOpacity
      style={[
        styles.colorOption,
        { backgroundColor: color },
        selectedColor === color && styles.selectedColorOption
      ]}
      onPress={() => setSelectedColor(color)}
    >
      {selectedColor === color && (
        <Ionicons name="checkmark" size={16} color="white" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yeni Hesap</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Name */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Adı</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Örn: Ana Hesap, Nakit Para"
            placeholderTextColor={COLORS.TEXT_SECONDARY}
          />
        </Card>

        {/* Account Type */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Türü</Text>
          {ACCOUNT_TYPES.map((type) => (
            <AccountTypeCard key={type.type} {...type} />
          ))}
        </Card>

        {/* Initial Balance */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Başlangıç Bakiyesi</Text>
          <View style={styles.balanceInputContainer}>
            <Text style={styles.currencySymbol}>{currencySymbol}</Text>
            <TextInput
              style={styles.balanceInput}
              value={initialBalance}
              onChangeText={setInitialBalance}
              placeholder="0,00"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              keyboardType="numeric"
            />
          </View>
        </Card>

        {/* Account Color */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Rengi</Text>
          <View style={styles.colorGrid}>
            {ACCOUNT_COLORS.map((color) => (
              <ColorOption key={color} color={color} />
            ))}
          </View>
        </Card>

        {/* Preview */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Önizleme</Text>
          <View style={[styles.previewCard, { backgroundColor: selectedColor }]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIconContainer}>
                <Ionicons 
                  name={ACCOUNT_TYPES.find(t => t.type === selectedType)?.icon as any || 'wallet-outline'}
                  size={20} 
                  color="white" 
                />
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>
                  {accountName || 'Hesap Adı'}
                </Text>
                <Text style={styles.previewType}>
                  {ACCOUNT_TYPES.find(t => t.type === selectedType)?.label}
                </Text>
              </View>
            </View>
            <Text style={styles.previewBalance}>
              {currencySymbol}{initialBalance || '0,00'}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!accountName.trim() || !initialBalance.trim() || loading) && styles.createButtonDisabled
          ]}
          onPress={handleCreateAccount}
          disabled={!accountName.trim() || !initialBalance.trim() || loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Oluşturuluyor...' : 'Hesap Oluştur'}
          </Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  selectedTypeCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}10`,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  typeDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  balanceInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: COLORS.WHITE,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  previewCard: {
    padding: SPACING.md,
    borderRadius: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginBottom: 2,
  },
  previewType: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewBalance: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.WHITE,
    textAlign: 'right',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});

export default AddAccountScreen; 