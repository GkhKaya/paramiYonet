// Kategori ikonları - Ionicons icon isimleri
export interface CategoryIcon {
  name: string;
  label: string;
  category?: 'yemek' | 'ulaşım' | 'alışveriş' | 'eğlence' | 'sağlık' | 'ev' | 'finans' | 'teknoloji' | 'genel';
}

export const CATEGORY_ICONS: CategoryIcon[] = [
  // Yemek & İçecek
  { name: 'restaurant', label: 'Restoran', category: 'yemek' },
  { name: 'cafe', label: 'Kafe', category: 'yemek' },
  { name: 'wine', label: 'İçki', category: 'yemek' },
  { name: 'pizza', label: 'Pizza', category: 'yemek' },
  { name: 'ice-cream', label: 'Dondurma', category: 'yemek' },
  { name: 'fast-food', label: 'Fast Food', category: 'yemek' },
  { name: 'beer', label: 'Bira', category: 'yemek' },

  // Alışveriş
  { name: 'basket', label: 'Market', category: 'alışveriş' },
  { name: 'storefront', label: 'Mağaza', category: 'alışveriş' },
  { name: 'bag', label: 'Çanta', category: 'alışveriş' },
  { name: 'shirt', label: 'Giyim', category: 'alışveriş' },
  { name: 'gift', label: 'Hediye', category: 'alışveriş' },
  { name: 'diamond', label: 'Mücevher', category: 'alışveriş' },

  // Ulaşım
  { name: 'car', label: 'Araba', category: 'ulaşım' },
  { name: 'bus', label: 'Otobüs', category: 'ulaşım' },
  { name: 'train', label: 'Tren', category: 'ulaşım' },
  { name: 'airplane', label: 'Uçak', category: 'ulaşım' },
  { name: 'bicycle', label: 'Bisiklet', category: 'ulaşım' },
  { name: 'boat', label: 'Gemi', category: 'ulaşım' },
  { name: 'walk', label: 'Yürüyüş', category: 'ulaşım' },

  // Eğlence
  { name: 'film', label: 'Sinema', category: 'eğlence' },
  { name: 'musical-notes', label: 'Müzik', category: 'eğlence' },
  { name: 'game-controller', label: 'Oyun', category: 'eğlence' },
  { name: 'book', label: 'Kitap', category: 'eğlence' },
  { name: 'camera', label: 'Fotoğraf', category: 'eğlence' },
  { name: 'tv', label: 'Televizyon', category: 'eğlence' },
  { name: 'football', label: 'Spor', category: 'eğlence' },

  // Sağlık & Fitness
  { name: 'medical', label: 'Sağlık', category: 'sağlık' },
  { name: 'fitness', label: 'Fitness', category: 'sağlık' },
  { name: 'body', label: 'Vücut Bakımı', category: 'sağlık' },
  { name: 'heart', label: 'Kalp', category: 'sağlık' },
  { name: 'eyedrop', label: 'İlaç', category: 'sağlık' },

  // Ev & Yaşam
  { name: 'home', label: 'Ev', category: 'ev' },
  { name: 'bed', label: 'Yatak Odası', category: 'ev' },
  { name: 'bulb', label: 'Elektrik', category: 'ev' },
  { name: 'water', label: 'Su', category: 'ev' },
  { name: 'flame', label: 'Doğalgaz', category: 'ev' },
  { name: 'trash', label: 'Temizlik', category: 'ev' },
  { name: 'rose', label: 'Kişisel Bakım', category: 'ev' },

  // Finans & İş
  { name: 'cash', label: 'Nakit', category: 'finans' },
  { name: 'card', label: 'Kart', category: 'finans' },
  { name: 'wallet', label: 'Cüzdan', category: 'finans' },
  { name: 'business', label: 'İş', category: 'finans' },
  { name: 'briefcase', label: 'Çanta', category: 'finans' },
  { name: 'trending-up', label: 'Yatırım', category: 'finans' },
  { name: 'receipt', label: 'Fatura', category: 'finans' },
  { name: 'school', label: 'Eğitim', category: 'finans' },

  // Teknoloji
  { name: 'phone-portrait', label: 'Telefon', category: 'teknoloji' },
  { name: 'laptop', label: 'Laptop', category: 'teknoloji' },
  { name: 'tablet-portrait', label: 'Tablet', category: 'teknoloji' },
  { name: 'headset', label: 'Kulaklık', category: 'teknoloji' },
  { name: 'desktop', label: 'Bilgisayar', category: 'teknoloji' },

  // Genel
  { name: 'star', label: 'Yıldız', category: 'genel' },
  { name: 'checkmark-circle', label: 'Onay', category: 'genel' },
  { name: 'flag', label: 'Bayrak', category: 'genel' },
  { name: 'location', label: 'Konum', category: 'genel' },
  { name: 'time', label: 'Zaman', category: 'genel' },
  { name: 'calendar', label: 'Takvim', category: 'genel' },
  { name: 'umbrella', label: 'Şemsiye', category: 'genel' },
  { name: 'shield-checkmark', label: 'Güvenlik', category: 'genel' },
  { name: 'help-circle', label: 'Yardım', category: 'genel' },
  { name: 'ellipsis-horizontal', label: 'Diğer', category: 'genel' },
];

// Kategori bazında ikonları getir
export const getIconsByCategory = (category?: string): CategoryIcon[] => {
  if (!category) return CATEGORY_ICONS;
  return CATEGORY_ICONS.filter(icon => icon.category === category);
};

// Popüler ikonları getir
export const getPopularIcons = (): CategoryIcon[] => {
  return CATEGORY_ICONS.filter(icon => 
    ['restaurant', 'car', 'basket', 'cash', 'home', 'medical', 'game-controller', 'gift', 'laptop', 'heart']
    .includes(icon.name)
  );
};

// İkon kategorilerini getir
export const getIconCategories = (): string[] => {
  const categories = new Set(CATEGORY_ICONS.map(icon => icon.category).filter(Boolean) as string[]);
  return Array.from(categories);
}; 