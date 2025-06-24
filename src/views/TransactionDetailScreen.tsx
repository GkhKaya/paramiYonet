import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Transaction, TransactionType } from '../models/Transaction';
import { useViewModels } from '../contexts/ViewModelContext';
import { useCurrency, useCategory, useDate } from '../hooks';
import { COLORS } from '../constants';
import CustomAlert, { AlertType } from '../components/common/CustomAlert';

interface TransactionDetailScreenProps {
  route: {
    params: {
      transactionId: string;
    };
  };
  navigation: any;
}

const TransactionDetailScreen: React.FC<TransactionDetailScreenProps> = observer(({ route, navigation }) => {
  const { transactionId } = route.params;
  const { transactionViewModel, accountViewModel } = useViewModels();
  
  // State
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Hooks
  const { formatCurrency, currencySymbol } = useCurrency();
  const { getDetails } = useCategory();
  const { formatLong, formatTime } = useDate();

  // Custom Alert helper
  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  // Navigation handlers  
  const handleEdit = () => {
    // TransactionsScreen'e geri git ve viewModel üzerinden edit modunu tetikle
    if (transaction && transactionViewModel) {
      // ViewModel'e hangi transaction'ın edit edilmek istendiğini söyle
      transactionViewModel.setEditTransactionId(transaction.id);
      // TabNavigator içindeki Transactions tab'ına git
      navigation.navigate('MainTabs', { 
        screen: 'Transactions'
      });
    }
  };

  const handleDelete = () => {
    showAlert('warning', 'İşlemi Sil', 'Bu işlemi silmek istediğinizden emin misiniz?');
  };

  // Transaction'ı yükle
  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true);
        // TransactionViewModel'den transaction'ı bul
        const foundTransaction = transactionViewModel?.transactions.find(t => t.id === transactionId);
        
        if (foundTransaction) {
          setTransaction(foundTransaction);
        } else {
          showAlert('error', 'Hata', 'İşlem bulunamadı');
          setTimeout(() => navigation.goBack(), 2000);
        }
      } catch (error) {
        console.error('Error loading transaction:', error);
        showAlert('error', 'Hata', 'İşlem yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId, transactionViewModel]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>İşlem bulunamadı</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === TransactionType.INCOME;
  const amountColor = isIncome ? '#4CAF50' : '#F44336';
  const categoryDetails = getDetails(transaction.category, transaction.type);
  const account = accountViewModel?.accounts.find(acc => acc.id === transaction.accountId);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşlem Detayı</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ana Bilgiler */}
        <View style={styles.mainInfoCard}>
          <View style={styles.mainInfoContent}>
            {/* Sol: Kategori İkon ve Tip */}
            <View style={styles.iconSection}>
              <View style={[styles.categoryIcon, { backgroundColor: categoryDetails.color }]}>
                <Ionicons
                  name={transaction.categoryIcon as any}
                  size={32}
                  color="#FFFFFF"
                />
              </View>
              <View style={[styles.typeChip, { backgroundColor: amountColor }]}>
                <Ionicons 
                  name={isIncome ? "add-circle" : "remove-circle"} 
                  size={14} 
                  color="#FFFFFF" 
                />
                <Text style={styles.typeText}>
                  {isIncome ? 'Gelir' : 'Gider'}
                </Text>
              </View>
            </View>

            {/* Sağ: Açıklama ve Tutar */}
            <View style={styles.infoSection}>
              <Text style={styles.description}>{transaction.description}</Text>
              <Text style={[styles.amount, { color: amountColor }]}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Detay Bilgileri */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Detaylar</Text>
          
          {/* Kategori */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="pricetag-outline" size={20} color="#888888" />
              <Text style={styles.detailLabelText}>Kategori</Text>
            </View>
            <Text style={styles.detailValue}>{transaction.category}</Text>
          </View>

          {/* Hesap */}
          {account && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons name="wallet-outline" size={20} color="#888888" />
                <Text style={styles.detailLabelText}>Hesap</Text>
              </View>
              <Text style={styles.detailValue}>{account.name}</Text>
            </View>
          )}

          {/* Tarih */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="calendar-outline" size={20} color="#888888" />
              <Text style={styles.detailLabelText}>Tarih</Text>
            </View>
            <Text style={styles.detailValue}>{formatLong(transaction.date)}</Text>
          </View>

          {/* Saat */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="time-outline" size={20} color="#888888" />
              <Text style={styles.detailLabelText}>Saat</Text>
            </View>
            <Text style={styles.detailValue}>{formatTime(transaction.date)}</Text>
          </View>


        </View>

        {/* İşlemler */}
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>İşlemler</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Düzenle</Text>
            <Ionicons name="chevron-forward" size={16} color="#888888" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
            <Ionicons name="chevron-forward" size={16} color="#888888" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        primaryButtonText={alertType === 'warning' ? 'Sil' : 'Tamam'}
        secondaryButtonText={alertType === 'warning' ? 'İptal' : undefined}
        onPrimaryPress={async () => {
          setAlertVisible(false);
          if (alertType === 'warning' && alertTitle === 'İşlemi Sil') {
            // Silme işlemi
            if (transaction && transactionViewModel) {
              const success = await transactionViewModel.deleteTransaction(transaction.id);
              if (success) {
                showAlert('success', 'Başarılı', 'İşlem silindi');
                setTimeout(() => navigation.goBack(), 1500);
              } else {
                showAlert('error', 'Hata', 'İşlem silinemedi');
              }
            }
          } else if (alertType === 'error' && alertTitle === 'Hata' && alertMessage === 'İşlem bulunamadı') {
            navigation.goBack();
          }
        }}
        onSecondaryPress={alertType === 'warning' ? () => setAlertVisible(false) : undefined}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? 50 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerButton: {
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Extra bottom padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#888888',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Ana Bilgi Kartı
  mainInfoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  mainInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconSection: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Detay Kartı
  detailsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabelText: {
    fontSize: 16,
    color: '#888888',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // İşlemler Kartı
  actionsCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteButtonText: {
    color: '#F44336',
  },
});

export default TransactionDetailScreen; 