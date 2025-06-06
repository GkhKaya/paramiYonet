import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import GoldPriceWidget from '../components/GoldPriceWidget';
import { GoldPriceData } from '../types';

const GoldPriceExample: React.FC = () => {
  
  const handlePriceUpdate = (priceData: GoldPriceData) => {
    console.log('Yeni altın fiyatı alındı:', priceData);
    
    // Burada istediğiniz işlemleri yapabilirsiniz:
    // - Firebase'e kaydetme
    // - AsyncStorage'e kaydetme
    // - State güncellemeleri
    // - Bildirimleri tetikleme vs.
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Altın Fiyatları Sayfası</Text>
      
      {/* Ana Altın Fiyat Widget */}
      <GoldPriceWidget 
        onPriceUpdate={handlePriceUpdate}
        refreshInterval={3} // 3 dakikada bir otomatik güncelleme
      />
      
      {/* Diğer componentleriniz burada olabilir */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Özellikler:</Text>
        <Text style={styles.infoItem}>✅ Canlidoviz.com'dan gerçek zamanlı veri</Text>
        <Text style={styles.infoItem}>✅ Otomatik cache sistemi</Text>
        <Text style={styles.infoItem}>✅ Manuel yenileme özelliği</Text>
        <Text style={styles.infoItem}>✅ Hata durumunda fallback veriler</Text>
        <Text style={styles.infoItem}>✅ Türkçe tarih/saat formatları</Text>
        <Text style={styles.infoItem}>✅ Responsive tasarım</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoItem: {
    fontSize: 14,
    marginVertical: 4,
    color: '#666',
  },
});

export default GoldPriceExample; 