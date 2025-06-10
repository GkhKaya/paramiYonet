import { GoldPriceData } from '../types';

interface TruncgilGoldResponse {
  GRA: {
    Selling: number;
    Type: string;
    Name: string;
    Change: number;
    Buying: number;
  };
}

class GoldPriceService {
  private static instance: GoldPriceService;
  private currentPrices: GoldPriceData | null = null;
  private lastFetchTime: Date | null = null;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 dakika cache
  private readonly TRUNCGIL_GOLD_URL = 'https://finance.truncgil.com/api/gold-rates/GRA';

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
      console.log('Fetching current gold prices from Truncgil API...');
      
      const response = await fetch(this.TRUNCGIL_GOLD_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; GoldPriceService/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Truncgil API error: ${response.status}`);
      }

      const data: TruncgilGoldResponse = await response.json();
      
      if (!data.GRA) {
        throw new Error('Invalid response from Truncgil API');
      }

      const gramGold = data.GRA;
      const buyPrice = gramGold.Buying;
      const sellPrice = gramGold.Selling;
      const gramPrice = (buyPrice + sellPrice) / 2; // Ortalama fiyat
      const change = gramGold.Change;
      const changeAmount = (gramPrice * change) / 100;

      const goldPrices: GoldPriceData = {
        buyPrice: Math.round(buyPrice * 100) / 100,
        sellPrice: Math.round(sellPrice * 100) / 100,
        lastUpdate: new Date(),
        change: Math.round(change * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        gramPrice: Math.round(gramPrice * 100) / 100,
        source: 'Truncgil Finance API',
      };

      this.currentPrices = goldPrices;
      this.lastFetchTime = new Date();
      console.log('Truncgil API success:', goldPrices);
      
      return goldPrices;
    } catch (error) {
      console.error('Truncgil API error:', error);
      throw new Error('Altın fiyatları şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  // Belirli bir süre aralığında fiyat geçmişini çekme
  async getGoldPriceHistory(days: number = 7): Promise<GoldPriceData[]> {
    // Truncgil API'sinde geçmiş veriler yok, mevcut fiyatı döndür
    const currentPrice = await this.getCurrentGoldPrices();
    return [currentPrice];
  }

  // Kar/zarar hesaplama
  calculateHoldingProfitLoss(holding: { grams: number; purchasePrice: number }, currentPrice: number) {
    const purchaseValue = holding.grams * holding.purchasePrice;
    const currentValue = holding.grams * currentPrice;
    const profitLoss = currentValue - purchaseValue;
    const profitLossPercentage = purchaseValue > 0 ? (profitLoss / purchaseValue) * 100 : 0;
    
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