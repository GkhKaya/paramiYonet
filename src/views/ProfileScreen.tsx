import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = observer(({ navigation }) => {
  const { user, updateUserProfile } = useAuth();
  const [transactionViewModel, setTransactionViewModel] = useState<TransactionViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Statistics
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [accountCount, setAccountCount] = useState(0);

  // Initialize ViewModels
  useEffect(() => {
    if (user?.id) {
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
      
      // Load data
      loadStatistics(transactionVm, accountVm);
    }
  }, [user?.id]);

  const loadStatistics = async (transactionVm: TransactionViewModel, accountVm: AccountViewModel) => {
    try {
      setLoading(true);
      await Promise.all([
        transactionVm.loadTransactions(),
        accountVm.loadAccounts()
      ]);

      // Calculate statistics
      const transactions = transactionVm.transactions;
      setTotalTransactions(transactions.length);
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalIncome(income);

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalExpense(expense);

      setAccountCount(accountVm.accounts.length);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleEditProfile = () => {
    setNewDisplayName(user?.displayName || '');
    setNewEmail(user?.email || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Hata', 'Lütfen ad soyad girin');
      return;
    }

    try {
      setLoading(true);
      await updateUserProfile({
        displayName: newDisplayName.trim(),
        // Email update might require re-authentication
      });
      
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    color = '#2196F3',
    isLoading = false 
  }: {
    icon: string;
    title: string;
    value: string;
    color?: string;
    isLoading?: boolean;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      )}
    </View>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email ? getInitials(user.email) : 'U'}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>
              {user?.displayName || 'Kullanıcı'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Ionicons name="pencil" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="receipt"
            title="Toplam İşlem"
            value={totalTransactions.toString()}
            color={COLORS.PRIMARY}
            isLoading={loading}
          />
          <StatCard
            icon="trending-up"
            title="Toplam Gelir"
            value={formatCurrency(totalIncome)}
            color="#00E676"
            isLoading={loading}
          />
          <StatCard
            icon="trending-down"
            title="Toplam Gider"
            value={formatCurrency(totalExpense)}
            color="#FF1744"
            isLoading={loading}
          />
          <StatCard
            icon="wallet"
            title="Hesap Sayısı"
            value={accountCount.toString()}
            color="#FF9800"
            isLoading={loading}
          />
        </View>
      </View>

      {/* Net Balance */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceTitle}>Net Bakiye</Text>
          <Ionicons 
            name="stats-chart" 
            size={24} 
            color={totalIncome - totalExpense >= 0 ? '#00E676' : '#FF1744'} 
          />
        </View>
        <Text style={[
          styles.balanceValue,
          { color: totalIncome - totalExpense >= 0 ? '#00E676' : '#FF1744' }
        ]}>
          {formatCurrency(totalIncome - totalExpense)}
        </Text>
        <Text style={styles.balanceSubtitle}>
          {totalIncome - totalExpense >= 0 ? 'Pozitif bakiye' : 'Negatif bakiye'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddTransaction', { defaultType: 'income' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#00E67620' }]}>
              <Ionicons name="add-circle" size={24} color="#00E676" />
            </View>
            <Text style={styles.actionTitle}>Gelir Ekle</Text>
            <Text style={styles.actionSubtitle}>Yeni gelir işlemi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddTransaction', { defaultType: 'expense' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF174420' }]}>
              <Ionicons name="remove-circle" size={24} color="#FF1744" />
            </View>
            <Text style={styles.actionTitle}>Gider Ekle</Text>
            <Text style={styles.actionSubtitle}>Yeni gider işlemi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('RecurringPayments')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FF980020' }]}>
              <Ionicons name="calendar" size={24} color="#FF9800" />
            </View>
            <Text style={styles.actionTitle}>Düzenli Ödemeler</Text>
            <Text style={styles.actionSubtitle}>Abonelik ve faturalar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#2196F320' }]}>
              <Ionicons name="analytics" size={24} color="#2196F3" />
            </View>
            <Text style={styles.actionTitle}>Analizler</Text>
            <Text style={styles.actionSubtitle}>Detaylı raporlar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEditModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowEditModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Profil Düzenle</Text>
          <View style={styles.modalPlaceholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Ad Soyad</Text>
            <Input
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Ad Soyad"
              variant="outlined"
              leftIcon="person"
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>E-posta</Text>
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="E-posta"
              variant="outlined"
              leftIcon="mail"
              editable={false}
              inputStyle={{ color: '#666666' }}
            />
            <Text style={styles.emailNote}>
              E-posta adresinizi değiştirmek için destek ile iletişime geçin.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title="Kaydet"
            onPress={handleSaveProfile}
            loading={loading}
            disabled={!newDisplayName.trim()}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Profil" activeRoute="profile" navigation={navigation}>
        {renderContent()}
        {renderEditModal()}
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={styles.headerRight} />
        </View>

        {renderContent()}
        {renderEditModal()}
      </SafeAreaView>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black background
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  headerRight: {
    width: 40,
  },
  profileCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF', // White text
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // White text
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666666', // Gray text
    marginBottom: 4,
  },
  editButton: {
    padding: 12,
    backgroundColor: '#1a1a1a', // Dark surface
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 12,
    marginHorizontal: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  balanceCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#666666', // Gray text
    marginRight: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#666666', // Gray text
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#111111', // Dark card background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666666', // Gray text
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000', // Black background
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalSection: {
    marginVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF', // White text
    marginBottom: 12,
  },
  emailNote: {
    fontSize: 14,
    color: '#666666', // Gray text
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
});

export default ProfileScreen; 