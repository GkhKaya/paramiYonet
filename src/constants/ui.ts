/**
 * UI Constants - Kullanıcı Arayüzü Sabitleri
 * 
 * Bu dosya uygulamanın görsel tasarımı ile ilgili sabit değerleri içerir.
 * Renkler, yazı tipleri, spacing değerleri gibi UI elementleri burada tanımlanır.
 */

/**
 * Uygulama Renk Paleti
 * Tüm renkler merkezi olarak burada tanımlanır - Koyu Tema
 */
export const COLORS = {
  // Ana Renkler
  PRIMARY: '#2196F3',        // Ana mavi renk
  SECONDARY: '#FF9800',      // İkincil turuncu renk
  
  // Sistem Renkleri
  SUCCESS: '#4CAF50',        // Başarı yeşili
  ERROR: '#F44336',          // Hata kırmızısı
  WARNING: '#FFC107',        // Uyarı sarısı
  INFO: '#2196F3',           // Bilgi mavisi
  
  // Nötr Renkler (Koyu Tema)
  WHITE: '#FFFFFF',          // Beyaz
  BLACK: '#000000',          // Siyah
  BACKGROUND: '#121212',     // Ana arkaplan (koyu)
  SURFACE: '#1E1E1E',        // Yüzey rengi (koyu gri)
  
  // Metin Renkleri (Koyu Tema)
  TEXT_PRIMARY: '#FFFFFF',   // Ana metin (beyaz)
  TEXT_SECONDARY: '#B3B3B3', // İkincil metin (açık gri)
  TEXT_DISABLED: '#666666',  // Devre dışı metin
  TEXT_LIGHT: '#FFFFFF',     // Açık metin
  
  // Border ve Ayırıcı Renkler (Koyu Tema)
  BORDER: '#333333',         // Normal border (koyu)
  BORDER_LIGHT: '#2A2A2A',   // Açık border (koyu)
  DIVIDER: '#333333',        // Ayırıcı çizgi (koyu)
  
  // Overlay ve Gölge Renkleri
  OVERLAY: 'rgba(0, 0, 0, 0.8)',      // Modal overlay (daha koyu)
  SHADOW: 'rgba(0, 0, 0, 0.3)',       // Gölge rengi
  CARD_SHADOW: 'rgba(0, 0, 0, 0.2)',  // Kart gölgesi
  
  // Durum Renkleri (Koyu Tema Uyumlu)
  SUCCESS_LIGHT: '#1B5E20',  // Koyu yeşil arkaplan
  ERROR_LIGHT: '#B71C1C',    // Koyu kırmızı arkaplan
  WARNING_LIGHT: '#E65100',  // Koyu sarı arkaplan
  INFO_LIGHT: '#0D47A1',     // Koyu mavi arkaplan
} as const;

/**
 * Yazı Tipi Ayarları
 * Font boyutları, ağırlıkları ve ailesi
 */
export const TYPOGRAPHY = {
  // Font Ailesi
  fontFamily: {
    regular: 'System',       // Sistem fontu
    medium: 'System',        // Orta kalınlık
    bold: 'System',          // Kalın font
  },
  
  // Font Boyutları
  sizes: {
    xs: 12,    // Çok küçük (timestamp, badge vb.)
    sm: 14,    // Küçük (yardımcı metin)
    md: 16,    // Orta (normal metin)
    lg: 18,    // Büyük (alt başlık)
    xl: 20,    // Çok büyük (başlık)
    xxl: 24,   // Mega (ana başlık)
    xxxl: 32,  // Süper (hero başlık)
  },
  
  // Font Ağırlıkları
  weights: {
    normal: '400',    // Normal
    medium: '500',    // Orta kalın
    semiBold: '600',  // Yarı kalın
    bold: '700',      // Kalın
  },
  
  // Satır Yükseklikleri
  lineHeights: {
    tight: 1.2,    // Sıkı (başlıklar için)
    normal: 1.4,   // Normal (genel metin)
    relaxed: 1.6,  // Gevşek (paragraflar için)
  },
} as const;

/**
 * Spacing (Boşluk) Değerleri
 * Margin, padding ve layout için standart boşluklar
 */
export const SPACING = {
  xs: 4,    // Çok küçük boşluk
  sm: 8,    // Küçük boşluk
  md: 16,   // Orta boşluk (standart)
  lg: 24,   // Büyük boşluk
  xl: 32,   // Çok büyük boşluk
  xxl: 48,  // Mega boşluk
  xxxl: 64, // Süper boşluk
} as const;

/**
 * Border Radius Değerleri
 * Köşe yuvarlaması için standart değerler
 */
export const BORDER_RADIUS = {
  none: 0,     // Köşe yok
  xs: 2,       // Çok küçük köşe
  sm: 4,       // Küçük köşe
  md: 8,       // Orta köşe (standart)
  lg: 12,      // Büyük köşe
  xl: 16,      // Çok büyük köşe
  xxl: 24,     // Mega köşe
  round: 50,   // Tam yuvarlak (avatar vb.)
} as const;

/**
 * Gölge Ayarları
 * iOS ve Android uyumlu gölge değerleri
 */
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  sm: {
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  
  md: {
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  
  lg: {
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  
  xl: {
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
} as const;

/**
 * Layout Boyutları
 * Standart component boyutları
 */
export const LAYOUT = {
  // Header yükseklikleri
  headerHeight: 56,
  tabBarHeight: 64,
  
  // Buton boyutları
  buttonHeight: {
    sm: 32,    // Küçük buton
    md: 44,    // Orta buton (standart)
    lg: 56,    // Büyük buton
  },
  
  // Input boyutları
  inputHeight: {
    sm: 36,    // Küçük input
    md: 44,    // Orta input (standart)
    lg: 52,    // Büyük input
  },
  
  // Icon boyutları
  iconSize: {
    xs: 12,    // Çok küçük icon
    sm: 16,    // Küçük icon
    md: 24,    // Orta icon (standart)
    lg: 32,    // Büyük icon
    xl: 48,    // Çok büyük icon
  },
  
  // Avatar boyutları
  avatarSize: {
    sm: 32,    // Küçük avatar
    md: 48,    // Orta avatar
    lg: 64,    // Büyük avatar
    xl: 96,    // Çok büyük avatar
  },
} as const;

/**
 * Animasyon Süreleri
 * Standart animasyon duration değerleri
 */
export const ANIMATION = {
  duration: {
    fast: 150,     // Hızlı animasyon (button press vb.)
    normal: 300,   // Normal animasyon (geçişler)
    slow: 500,     // Yavaş animasyon (büyük değişiklikler)
  },
  
  easing: {
    easeInOut: 'ease-in-out',  // Yumuşak başlangıç ve bitiş
    easeOut: 'ease-out',       // Yumuşak bitiş
    linear: 'linear',          // Doğrusal
  },
} as const;

/**
 * Z-Index Değerleri
 * Katman sıralaması için standart değerler
 */
export const Z_INDEX = {
  base: 1,         // Temel katman
  dropdown: 10,    // Dropdown menüler
  modal: 100,      // Modal pencereler
  overlay: 200,    // Overlay katmanı
  tooltip: 300,    // Tooltip'ler
  toast: 400,      // Toast mesajları
  maximum: 999,    // Maksimum katman
} as const; 