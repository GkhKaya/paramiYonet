import { GoldPriceData } from '../types';
import { GoldType, GoldPrices } from '../models/Account';

interface TruncgilGoldResponse {
  Meta_Data: {
    Minutes_Ago: number;
    Current_Date: string;
    Update_Date: string;
  };
  Rates: {
    GRA: {
      Selling: number;
      Type: string;
      Name: string;
      Change: number;
      Buying: number;
    };
    CEYREKALTIN: {
      Selling: number;
      Type: string;
      Name: string;
      Change: number;
      Buying: number;
    };
    YARIMALTIN: {
      Selling: number;
      Type: string;
      Name: string;
      Change: number;
      Buying: number;
    };
    TAMALTIN: {
      Selling: number;
      Type: string;
      Name: string;
      Change: number;
      Buying: number;
    };
  };
}

export interface AllGoldPricesData {
  prices: GoldPrices;
  changes: {
    [GoldType.GRAM]: number;
    [GoldType.QUARTER]: number;
    [GoldType.HALF]: number;
    [GoldType.FULL]: number;
  };
  lastUpdate: Date;
  source: string;
}

class GoldPriceService {
  private static instance: GoldPriceService;
  private currentPrices: AllGoldPricesData | null = null;
  private lastFetchTime: Date | null = null;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 dakika cache
  private readonly TRUNCGIL_GOLD_URL = 'https://finance.truncgil.com/api/gold-rates/';

  static getInstance(): GoldPriceService {
    if (!GoldPriceService.instance) {
      GoldPriceService.instance = new GoldPriceService();
    }
    return GoldPriceService.instance;
  }

  async getAllGoldPrices(): Promise<AllGoldPricesData> {
    // Cache kontrolü
    if (this.currentPrices && this.lastFetchTime) {
      const timeSinceLastFetch = Date.now() - this.lastFetchTime.getTime();
      if (timeSinceLastFetch < this.CACHE_DURATION) {
        return this.currentPrices;
      }
    }

    try {
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
      
      if (!data.Rates) {
        throw new Error('Invalid response from Truncgil API');
      }

      const rates = data.Rates;
      
      // Tüm altın türleri için fiyatları hesapla
      const prices: GoldPrices = {
        [GoldType.GRAM]: (rates.GRA.Buying + rates.GRA.Selling) / 2,
        [GoldType.QUARTER]: (rates.CEYREKALTIN.Buying + rates.CEYREKALTIN.Selling) / 2,
        [GoldType.HALF]: (rates.YARIMALTIN.Buying + rates.YARIMALTIN.Selling) / 2,
        [GoldType.FULL]: (rates.TAMALTIN.Buying + rates.TAMALTIN.Selling) / 2,
      };

      const changes = {
        [GoldType.GRAM]: rates.GRA.Change,
        [GoldType.QUARTER]: rates.CEYREKALTIN.Change,
        [GoldType.HALF]: rates.YARIMALTIN.Change,
        [GoldType.FULL]: rates.TAMALTIN.Change,
      };

      const allGoldPrices: AllGoldPricesData = {
        prices: {
          [GoldType.GRAM]: Math.round(prices[GoldType.GRAM] * 100) / 100,
          [GoldType.QUARTER]: Math.round(prices[GoldType.QUARTER] * 100) / 100,
          [GoldType.HALF]: Math.round(prices[GoldType.HALF] * 100) / 100,
          [GoldType.FULL]: Math.round(prices[GoldType.FULL] * 100) / 100,
        },
        changes: {
          [GoldType.GRAM]: Math.round(changes[GoldType.GRAM] * 100) / 100,
          [GoldType.QUARTER]: Math.round(changes[GoldType.QUARTER] * 100) / 100,
          [GoldType.HALF]: Math.round(changes[GoldType.HALF] * 100) / 100,
          [GoldType.FULL]: Math.round(changes[GoldType.FULL] * 100) / 100,
        },
        lastUpdate: new Date(),
        source: 'Truncgil Finance API',
      };

      this.currentPrices = allGoldPrices;
      this.lastFetchTime = new Date();
      
      return allGoldPrices;
    } catch (error) {
      console.error('Truncgil API error:', error);
      throw new Error('Altın fiyatları şu anda alınamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  // Eski API uyumluluğu için
  async getCurrentGoldPrices(): Promise<GoldPriceData> {
    const allPrices = await this.getAllGoldPrices();
    
    return {
      buyPrice: allPrices.prices[GoldType.GRAM],
      sellPrice: allPrices.prices[GoldType.GRAM],
      lastUpdate: allPrices.lastUpdate,
      change: allPrices.changes[GoldType.GRAM],
      changeAmount: (allPrices.prices[GoldType.GRAM] * allPrices.changes[GoldType.GRAM]) / 100,
      gramPrice: allPrices.prices[GoldType.GRAM],
      source: allPrices.source,
    };
  }

  // Altın türü adlarını döndüren yardımcı fonksiyon
  getGoldTypeName(type: GoldType): string {
    switch (type) {
      case GoldType.GRAM:
        return 'Gram Altın';
      case GoldType.QUARTER:
        return 'Çeyrek Altın';
      case GoldType.HALF:
        return 'Yarım Altın';
      case GoldType.FULL:
        return 'Tam Altın';
      default:
        return 'Bilinmeyen Altın Türü';
    }
  }

  // Belirli bir altın türü için fiyat geçmişini çekme
  async getGoldPriceHistory(goldType: GoldType = GoldType.GRAM, days: number = 7): Promise<number[]> {
    // Truncgil API'sinde geçmiş veriler yok, mevcut fiyatı döndür
    const allPrices = await this.getAllGoldPrices();
    return [allPrices.prices[goldType]];
  }

  // Kar/zarar hesaplama - güncellenmiş versiyon
  calculateGoldHoldingProfitLoss(
    holdings: { type: GoldType; quantity: number; purchasePrice: number }[],
    currentPrices: GoldPrices
  ) {
    let totalPurchaseValue = 0;
    let totalCurrentValue = 0;
    
    const breakdown = holdings.map(holding => {
      const purchaseValue = holding.quantity * holding.purchasePrice;
      const currentValue = holding.quantity * currentPrices[holding.type];
      const profitLoss = currentValue - purchaseValue;
      const profitLossPercentage = purchaseValue > 0 ? (profitLoss / purchaseValue) * 100 : 0;
      
      totalPurchaseValue += purchaseValue;
      totalCurrentValue += currentValue;
      
      return {
        type: holding.type,
        typeName: this.getGoldTypeName(holding.type),
        quantity: holding.quantity,
        purchaseValue,
        currentValue,
        profitLoss,
        profitLossPercentage: Math.round(profitLossPercentage * 100) / 100,
      };
    });
    
    const totalProfitLoss = totalCurrentValue - totalPurchaseValue;
    const totalProfitLossPercentage = totalPurchaseValue > 0 ? (totalProfitLoss / totalPurchaseValue) * 100 : 0;
    
    return {
      totalPurchaseValue,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage: Math.round(totalProfitLossPercentage * 100) / 100,
      breakdown,
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
  async refreshPrices(): Promise<AllGoldPricesData> {
    this.clearCache();
    return await this.getAllGoldPrices();
  }
}

export default GoldPriceService; 