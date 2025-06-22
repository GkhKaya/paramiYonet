import React from 'react';
import {
  Restaurant,
  DirectionsCar,
  ShoppingCart,
  LocalGroceryStore,
  Home,
  AccountBalance,
  LocalHospital,
  SportsEsports,
  CardGiftcard,
  Computer,
  Favorite,
  School,
  Work,
  LocalGasStation,
  Flight,
  DirectionsBus,
  Train,
  DirectionsBike,
  Movie,
  MusicNote,
  MenuBook,
  PhotoCamera,
  Tv,
  SportsSoccer,
  FitnessCenter,
  Lightbulb,
  Water,
  LocalFireDepartment,
  Delete,
  Face,
  CreditCard,
  AccountBalanceWallet,
  TrendingUp,
  Receipt,
  Phone,
  Laptop,
  Tablet,
  Headphones,
  DesktopWindows,
  Star,
  CheckCircle,
  Flag,
  LocationOn,
  AccessTime,
  CalendarToday,
  BeachAccess,
  Security,
  Help,
  MoreHoriz,
  AttachMoney,
  Fastfood,
  LocalCafe,
  LocalBar,
  LocalPizza,
  Icecream,
  SportsBar,
  Store,
  ShoppingBag,
  Checkroom,
  Diamond,
  Bed,
  CleaningServices,
  Spa,
  Business,
  BusinessCenter,
} from '@mui/icons-material';

// Kategori adı -> Material-UI Icon JSX mapping
const categoryIconMap: Record<string, React.ReactElement> = {
  // === GIDER KATEGORİLERİ ===
  // Yemek & İçecek
  'Yemek': <Restaurant fontSize="small" />,
  'İçecekler': <LocalCafe fontSize="small" />,
  'Market': <LocalGroceryStore fontSize="small" />,
  'Restoran': <Restaurant fontSize="small" />,
  'Kafe': <LocalCafe fontSize="small" />,
  'İçki': <LocalBar fontSize="small" />,
  'Pizza': <LocalPizza fontSize="small" />,
  'Dondurma': <Icecream fontSize="small" />,
  'Fast Food': <Fastfood fontSize="small" />,
  'Bira': <SportsBar fontSize="small" />,
  'Gıda': <LocalGroceryStore fontSize="small" />,
  'Alışveriş': <ShoppingCart fontSize="small" />,

  // Ulaşım
  'Ulaşım': <DirectionsCar fontSize="small" />,
  'Araba': <DirectionsCar fontSize="small" />,
  'Otobüs': <DirectionsBus fontSize="small" />,
  'Tren': <Train fontSize="small" />,
  'Uçak': <Flight fontSize="small" />,
  'Seyahat': <Flight fontSize="small" />,
  'Bisiklet': <DirectionsBike fontSize="small" />,
  'Benzin': <LocalGasStation fontSize="small" />,
  'Yakıt': <LocalGasStation fontSize="small" />,

  // Ev & Yaşam & Faturalar
  'Ev': <Home fontSize="small" />,
  'Fatura': <Receipt fontSize="small" />,
  'Kira': <Home fontSize="small" />,
  'Elektrik': <Lightbulb fontSize="small" />,
  'Su': <Water fontSize="small" />,
  'Doğalgaz': <LocalFireDepartment fontSize="small" />,
  'Temizlik': <CleaningServices fontSize="small" />,
  'Yatak Odası': <Bed fontSize="small" />,

  // Eğlence & Hobi
  'Eğlence': <MusicNote fontSize="small" />,
  'Sinema': <Movie fontSize="small" />,
  'Film': <Movie fontSize="small" />,
  'Müzik': <MusicNote fontSize="small" />,
  'Oyun': <SportsEsports fontSize="small" />,
  'Kitap': <MenuBook fontSize="small" />,
  'Fotoğraf': <PhotoCamera fontSize="small" />,
  'Televizyon': <Tv fontSize="small" />,

  // Spor & Sağlık
  'Spor': <SportsSoccer fontSize="small" />,
  'Fitness': <FitnessCenter fontSize="small" />,
  'Sağlık': <LocalHospital fontSize="small" />,
  'Hastane': <LocalHospital fontSize="small" />,
  'Doktor': <LocalHospital fontSize="small" />,
  'Spor Salonu': <FitnessCenter fontSize="small" />,

  // Teknoloji & Elektronik
  'Elektronik': <Computer fontSize="small" />,
  'Teknoloji': <Computer fontSize="small" />,
  'Telefon': <Phone fontSize="small" />,
  'Laptop': <Laptop fontSize="small" />,
  'Bilgisayar': <DesktopWindows fontSize="small" />,
  'Tablet': <Tablet fontSize="small" />,
  'Kulaklık': <Headphones fontSize="small" />,

  // Giyim & Alışveriş
  'Giyim': <Checkroom fontSize="small" />,
  'Mağaza': <Store fontSize="small" />,
  'Çanta': <ShoppingBag fontSize="small" />,
  'Hediye': <CardGiftcard fontSize="small" />,
  'Mücevher': <Diamond fontSize="small" />,

  // Kişisel Bakım & Güzellik
  'Kişisel Bakım': <Face fontSize="small" />,
  'Güzellik': <Spa fontSize="small" />,

  // Eğitim
  'Eğitim': <School fontSize="small" />,
  'Okul': <School fontSize="small" />,

  // === GELİR KATEGORİLERİ ===
  // İş & Maaş
  'Maaş': <AttachMoney fontSize="small" />,
  'Yan İş': <Business fontSize="small" />,
  'Freelance': <Laptop fontSize="small" />,
  'İş': <Work fontSize="small" />,
  'Çalışma': <Work fontSize="small" />,

  // Eğitim & Burs
  'Burs': <School fontSize="small" />,
  'Harçlık': <AccountBalanceWallet fontSize="small" />,

  // Yatırım & Finans
  'Yatırım': <TrendingUp fontSize="small" />,
  'Prim': <Star fontSize="small" />,
  'Temettü': <Diamond fontSize="small" />,
  'Satış': <Store fontSize="small" />,
  'Kira Geliri': <Home fontSize="small" />,
  'Borç İade': <AccountBalance fontSize="small" />,
  'İkramiye': <Star fontSize="small" />,

  // Finans & Bankacılık
  'Gelir': <AttachMoney fontSize="small" />,
  'Nakit': <AccountBalanceWallet fontSize="small" />,
  'Banka': <AccountBalance fontSize="small" />,
  'Kredi Kartı': <CreditCard fontSize="small" />,
  'Kart': <CreditCard fontSize="small" />,

  // Genel
  'Diğer': <MoreHoriz fontSize="small" />,
  'Genel': <Star fontSize="small" />,
  'Çeşitli': <MoreHoriz fontSize="small" />,
};

// Kategori adına göre icon JSX döndür
export const getCategoryIcon = (categoryName: string): React.ReactElement => {
  // Türkçe karakterleri normalize et ve büyük/küçük harf duyarsız arama yap
  const normalizedCategory = categoryName.trim();
  
  // Direkt eşleşme ara
  if (categoryIconMap[normalizedCategory]) {
    return categoryIconMap[normalizedCategory];
  }
  
  // Kısmi eşleşme ara (kategori adı içinde geçiyorsa)
  const partialMatch = Object.keys(categoryIconMap).find(key => 
    normalizedCategory.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(normalizedCategory.toLowerCase())
  );
  
  if (partialMatch) {
    return categoryIconMap[partialMatch];
  }
  
  // Varsayılan icon
  return <MoreHoriz fontSize="small" />;
};

// Tüm kategori iconlarını listele (admin paneli için)
export const getAllCategoryIcons = () => {
  return Object.entries(categoryIconMap).map(([name, IconComponent]) => ({
    name,
    component: IconComponent,
  }));
};

// Popüler kategoriler
export const getPopularCategoryIcons = () => {
  const popularCategories = [
    'Gıda', 'Ulaşım', 'Ev', 'Gelir', 'Eğlence', 'Sağlık', 'Teknoloji', 'Alışveriş'
  ];
  
  return popularCategories.map(category => ({
    name: category,
    component: getCategoryIcon(category),
  }));
}; 