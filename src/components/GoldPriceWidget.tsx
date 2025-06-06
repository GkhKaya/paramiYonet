import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GoldPriceService from '../services/GoldPriceService';
import { GoldPriceData } from '../types';

interface GoldPriceWidgetProps {
  onPriceUpdate?: (price: GoldPriceData) => void;
  refreshInterval?: number; // Dakika cinsinden
}

const GoldPriceWidget: React.FC<GoldPriceWidgetProps> = ({ 
  onPriceUpdate, 
  refreshInterval = 5 
}) => {
  const [goldPrice, setGoldPrice] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goldService = GoldPriceService.getInstance();

  const fetchGoldPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      const prices = await goldService.getCurrentGoldPrices();
      setGoldPrice(prices);
      setLastRefresh(new Date());
      
      if (onPriceUpdate) {
        onPriceUpdate(prices);
      }
      
      console.log('Altın fiyatları güncellendi:', prices);
    } catch (err) {
      const errorMessage = 'Altın fiyatları alınamadı';
      setError(errorMessage);
      console.error('Gold price fetch error:', err);
      
      Alert.alert(
        'Hata',
        'Altın fiyatları güncellenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    goldService.clearCache();
    fetchGoldPrices();
  };

  useEffect(() => {
    fetchGoldPrices();

    // Otomatik refresh ayarla
    const interval = setInterval(() => {
      fetchGoldPrices();
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return '#4CAF50'; // Yeşil
    if (change < 0) return '#F44336'; // Kırmızı
    return '#757575'; // Gri
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return 'trending-up';
    if (change < 0) return 'trending-down';
    return 'remove';
  };

  if (loading && !goldPrice) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Altın fiyatları yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error && !goldPrice) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="diamond-outline" size={24} color="#FFD700" />
          <Text style={styles.title}>Altın Fiyatları</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          disabled={loading}
        >
          <Ionicons 
            name={loading ? "hourglass-outline" : "refresh-outline"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>

      {goldPrice && (
        <>
          {/* Ana Fiyat */}
          <View style={styles.mainPriceContainer}>
            <Text style={styles.priceLabel}>Gram Altın</Text>
            <Text style={styles.mainPrice}>
              {goldService.formatPrice(goldPrice.gramPrice || goldPrice.buyPrice)}
            </Text>
            
            <View style={styles.changeContainer}>
              <Ionicons 
                name={getChangeIcon(goldPrice.change)} 
                size={16} 
                color={getChangeColor(goldPrice.change)} 
              />
              <Text style={[styles.changeText, { color: getChangeColor(goldPrice.change) }]}>
                {goldService.formatChange(goldPrice.change)}
              </Text>
              <Text style={[styles.changeAmount, { color: getChangeColor(goldPrice.change) }]}>
                ({goldPrice.changeAmount > 0 ? '+' : ''}{goldPrice.changeAmount.toFixed(2)} ₺)
              </Text>
            </View>
          </View>

          {/* Alış/Satış Fiyatları */}
          <View style={styles.pricesContainer}>
            <View style={styles.priceBox}>
              <Text style={styles.priceBoxLabel}>Alış</Text>
              <Text style={styles.priceBoxValue}>
                {goldService.formatPrice(goldPrice.buyPrice)}
              </Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.priceBox}>
              <Text style={styles.priceBoxLabel}>Satış</Text>
              <Text style={styles.priceBoxValue}>
                {goldService.formatPrice(goldPrice.sellPrice)}
              </Text>
            </View>
          </View>

          {/* Footer Bilgiler */}
          <View style={styles.footer}>
            <Text style={styles.sourceText}>
              Kaynak: {goldPrice.source}
            </Text>
            {lastRefresh && (
              <Text style={styles.updateText}>
                Son güncelleme: {formatTime(lastRefresh)}
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  mainPriceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mainPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  changeAmount: {
    fontSize: 14,
    marginLeft: 8,
  },
  pricesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
  },
  priceBoxLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceBoxValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  sourceText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  updateText: {
    fontSize: 12,
    color: '#999',
  },
});

export default GoldPriceWidget; 