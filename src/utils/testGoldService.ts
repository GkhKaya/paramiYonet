import GoldPriceService from '../services/GoldPriceService';

export const testGoldPriceService = async () => {
  console.log('🔄 Altın fiyat servisi test ediliyor...');
  
  const goldService = GoldPriceService.getInstance();
  
  try {
    // İlk test - Cache olmadan
    console.log('\n📍 Test 1: İlk veri çekme (cache yok)');
    const startTime1 = Date.now();
    const prices1 = await goldService.getCurrentGoldPrices();
    const duration1 = Date.now() - startTime1;
    
    console.log('✅ Başarılı!');
    console.log(`⏱️  Süre: ${duration1}ms`);
    console.log('📊 Veriler:', {
      gramPrice: goldService.formatPrice(prices1.gramPrice || prices1.buyPrice),
      buyPrice: goldService.formatPrice(prices1.buyPrice),
      sellPrice: goldService.formatPrice(prices1.sellPrice),
      change: goldService.formatChange(prices1.change),
      changeAmount: `${prices1.changeAmount > 0 ? '+' : ''}${prices1.changeAmount.toFixed(2)} ₺`,
      source: prices1.source,
      lastUpdate: prices1.lastUpdate.toLocaleString('tr-TR'),
    });

    // İkinci test - Cache ile
    console.log('\n📍 Test 2: Cache\'den veri çekme');
    const startTime2 = Date.now();
    const prices2 = await goldService.getCurrentGoldPrices();
    const duration2 = Date.now() - startTime2;
    
    console.log('✅ Başarılı!');
    console.log(`⏱️  Süre: ${duration2}ms (cache kullanıldı)`);
    console.log('📊 Cache çalışıyor:', duration2 < 50);

    // Üçüncü test - Manual refresh
    console.log('\n📍 Test 3: Manuel yenileme');
    const startTime3 = Date.now();
    const prices3 = await goldService.refreshPrices();
    const duration3 = Date.now() - startTime3;
    
    console.log('✅ Başarılı!');
    console.log(`⏱️  Süre: ${duration3}ms`);
    
    // Kar/zarar hesaplama testi
    console.log('\n📍 Test 4: Kar/zarar hesaplama');
    const holding = { grams: 10, purchasePrice: 4000 }; // 10 gram, 4000 TL'den alınmış
    const profitLoss = goldService.calculateHoldingProfitLoss(holding, prices3.buyPrice);
    
    console.log('💰 Kar/Zarar Analizi:');
    console.log(`   Alınan gram: ${holding.grams}g`);
    console.log(`   Alış fiyatı: ${goldService.formatPrice(holding.purchasePrice)}`);
    console.log(`   Güncel fiyat: ${goldService.formatPrice(prices3.buyPrice)}`);
    console.log(`   Alış değeri: ${goldService.formatPrice(profitLoss.purchaseValue)}`);
    console.log(`   Güncel değer: ${goldService.formatPrice(profitLoss.currentValue)}`);
    console.log(`   Kar/Zarar: ${goldService.formatPrice(Math.abs(profitLoss.profitLoss))} (${profitLoss.profitLossPercentage.toFixed(2)}%)`);
    console.log(`   Durum: ${profitLoss.profitLoss >= 0 ? '📈 Kar' : '📉 Zarar'}`);

    console.log('\n🎉 Tüm testler başarıyla tamamlandı!');
    
    return {
      success: true,
      testResults: {
        fetchTime: duration1,
        cacheTime: duration2,
        refreshTime: duration3,
        currentPrices: prices3,
        profitLossCalculation: profitLoss,
      }
    };

  } catch (error) {
    console.error('❌ Test başarısız:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
};

// React Native ortamında kullanım için
export const logGoldPrices = async () => {
  const goldService = GoldPriceService.getInstance();
  
  try {
    const prices = await goldService.getCurrentGoldPrices();
    
    console.log('🏆 GÜNCEL ALTIN FİYATLARI');
    console.log('========================');
    console.log(`📊 Gram Altın: ${goldService.formatPrice(prices.gramPrice || prices.buyPrice)}`);
    console.log(`🟢 Alış: ${goldService.formatPrice(prices.buyPrice)}`);
    console.log(`🔴 Satış: ${goldService.formatPrice(prices.sellPrice)}`);
    console.log(`📈 Değişim: ${goldService.formatChange(prices.change)} (${prices.changeAmount > 0 ? '+' : ''}${prices.changeAmount.toFixed(2)} ₺)`);
    console.log(`🌐 Kaynak: ${prices.source}`);
    console.log(`🕐 Son güncelleme: ${prices.lastUpdate.toLocaleString('tr-TR')}`);
    console.log('========================');
    
    return prices;
  } catch (error) {
    console.error('❌ Altın fiyatları alınamadı:', error);
    throw error;
  }
};

// Sadece console'da çalıştırmak için
if (typeof window === 'undefined') {
  // Node.js ortamında (debug için)
  testGoldPriceService().then(result => {
    console.log('\n🏁 Test sonucu:', result);
  });
} 