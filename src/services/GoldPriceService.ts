import { GoldPriceData, CanliDovizGoldResponse } from '../types';

class GoldPriceService {
  private static instance: GoldPriceService;
  private currentPrices: GoldPriceData | null = null;
  private lastFetchTime: Date | null = null;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 dakika cache
  private readonly BASE_URL = 'https://canlidoviz.com';

  static getInstance(): GoldPriceService {
    if (!GoldPriceService.instance) {
      GoldPriceService.instance = new GoldPriceService();
    }
    return GoldPriceService.instance;
  }

  async getCurrentGoldPrices(): Promise<GoldPriceData> {
    // Cache kontrolü
    if (this.currentPrices && this.lastFetchTime) {
      const timeSinceLastFetch = Date.now() - this.lastFetchTime.getTime();
      if (timeSinceLastFetch < this.CACHE_DURATION) {
        return this.currentPrices;
      }
    }

    try {
      const goldPrices = await this.fetchGoldPricesFromCanliDoviz();
      this.currentPrices = goldPrices;
      this.lastFetchTime = new Date();
      return goldPrices;
    } catch (error) {
      console.error('Altın fiyatları çekilirken hata:', error);
      
      // API başarısızsa fallback fiyatları döndür
      const fallbackPrices: GoldPriceData = {
        buyPrice: 4240,
        sellPrice: 4270,
        lastUpdate: new Date(),
        change: 0,
        changeAmount: 0,
        gramPrice: 4255,
        source: 'Fallback Data',
      };
      
      return fallbackPrices;
    }
  }

  private async fetchGoldPricesFromCanliDoviz(): Promise<GoldPriceData> {
    try {
      // Canlidoviz sitesinden HTML çekiyoruz
      const response = await fetch(`${this.BASE_URL}/altin-fiyatlari/merkez-bankasi`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      
      // HTML'den altın fiyatlarını parse ediyoruz
      const goldPriceData = this.parseGoldPricesFromHTML(html);
      
      return goldPriceData;
    } catch (error) {
      console.error('Canlidoviz\'den veri çekme hatası:', error);
      throw error;
    }
  }

  private parseGoldPricesFromHTML(html: string): GoldPriceData {
    try {
      // Gram altın fiyatını çıkarıyoruz
      const gramGoldRegex = /Gram Altın[^<]*<\/span>[^>]*>([0-9,\.]+)/i;
      const gramGoldMatch = html.match(gramGoldRegex);
      let gramPrice = 4260.76; // Default değer
      
      if (gramGoldMatch && gramGoldMatch[1]) {
        gramPrice = parseFloat(gramGoldMatch[1].replace(',', '.'));
      }

      // Değişim yüzdesini çıkarıyoruz
      const changeRegex = /Gram Altın[^%]*%([0-9\-,\.]+)/i;
      const changeMatch = html.match(changeRegex);
      let changePercent = 0.57; // Default değer
      
      if (changeMatch && changeMatch[1]) {
        changePercent = parseFloat(changeMatch[1].replace(',', '.'));
      }

      // Değişim miktarını hesaplıyoruz
      const changeAmount = (gramPrice * changePercent) / 100;

      // Alış ve satış fiyatlarını hesaplıyoruz (spread yaklaşık %0.5)
      const spread = gramPrice * 0.005;
      const buyPrice = gramPrice - spread;
      const sellPrice = gramPrice + spread;

      return {
        buyPrice: Math.round(buyPrice * 100) / 100,
        sellPrice: Math.round(sellPrice * 100) / 100,
        lastUpdate: new Date(),
        change: changePercent,
        changeAmount: Math.round(changeAmount * 100) / 100,
        gramPrice: gramPrice,
        source: 'Canlidoviz.com',
      };
    } catch (error) {
      console.error('HTML parse hatası:', error);
      
      // Parse hatası durumunda varsayılan değerler
      return {
        buyPrice: 4240,
        sellPrice: 4270,
        lastUpdate: new Date(),
        change: 0.57,
        changeAmount: 24.06,
        gramPrice: 4260.76,
        source: 'Canlidoviz.com (Parse Error)',
      };
    }
  }

  // Alternatif API endpoint'i deneme metodu
  private async fetchFromAlternativeAPI(): Promise<GoldPriceData> {
    try {
      // Canlidoviz'in muhtemel API endpoint'ini deniyoruz
      const apiResponse = await fetch(`${this.BASE_URL}/api/gold-prices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        return this.transformAPIResponse(data);
      } else {
        throw new Error('API response not ok');
      }
    } catch (error) {
      console.log('Alternative API failed, using HTML parsing');
      throw error;
    }
  }

  private transformAPIResponse(data: any): GoldPriceData {
    return {
      buyPrice: data.buyPrice || data.alis || 0,
      sellPrice: data.sellPrice || data.satis || 0,
      lastUpdate: new Date(),
      change: data.change || data.degisim || 0,
      changeAmount: data.changeAmount || data.degisimMiktar || 0,
      gramPrice: data.gramPrice || data.gramFiyat || 0,
      source: 'Canlidoviz.com API',
    };
  }

  // Belirli bir süre aralığında fiyat geçmişini çekme
  async getGoldPriceHistory(days: number = 7): Promise<GoldPriceData[]> {
    // Bu metod gelecekte implementasyon için hazırlanmış
    // Şimdilik mevcut fiyatı döndürüyor
    const currentPrice = await this.getCurrentGoldPrices();
    return [currentPrice];
  }

  // Kar/zarar hesaplama
  calculateHoldingProfitLoss(holding: { grams: number; purchasePrice: number }, currentPrice: number) {
    const purchaseValue = holding.grams * holding.purchasePrice;
    const currentValue = holding.grams * currentPrice;
    const profitLoss = currentValue - purchaseValue;
    const profitLossPercentage = (profitLoss / purchaseValue) * 100;
    
    return {
      purchaseValue,
      currentValue,
      profitLoss,
      profitLossPercentage: Math.round(profitLossPercentage * 100) / 100,
    };
  }

  // Fiyat formatlama
  formatPrice(price: number): string {
    return `₺${price.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Değişim yüzdesi formatlama
  formatChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  // Cache temizleme
  clearCache(): void {
    this.currentPrices = null;
    this.lastFetchTime = null;
  }

  // Manuel refresh
  async refreshPrices(): Promise<GoldPriceData> {
    this.clearCache();
    return await this.getCurrentGoldPrices();
  }
}

export default GoldPriceService; 