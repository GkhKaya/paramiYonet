# 💰 ParamıYönet - Kişisel Finans Yönetim Uygulaması

ParamıYönet, modern ve kullanıcı dostu bir kişisel finans yönetim uygulamasıdır. React Native ve Expo ile geliştirilmiş olup, mobil ve web platformlarında çalışmaktadır.

## 📱 Özellikler

### 🎯 Ana Özellikler
- **Gelir/Gider Takibi**: Detaylı işlem kayıtları ve kategorilendirme
- **Hesap Yönetimi**: Banka hesapları, kredi kartları ve altın hesapları
- **Borç Yönetimi**: Verilen ve alınan borçların takibi
- **Bütçe Planlama**: Kategori bazlı bütçe oluşturma ve takip
- **Tekrarlayan Ödemeler**: Otomatik ödeme hatırlatmaları
- **Raporlar ve Analizler**: Grafik ve chart'larla detaylı analizler
- **Altın Fiyat Takibi**: Güncel altın fiyatları ve trend analizi

### 🌟 Gelişmiş Özellikler
- **Multi-Platform**: iOS, Android ve Web desteği
- **Gerçek Zamanlı Senkronizasyon**: Firebase Firestore ile bulut desteği
- **Güvenli Kimlik Doğrulama**: Firebase Auth ile güvenli giriş
- **Responsive Tasarım**: Tüm cihaz boyutlarına uyumlu
- **Dark/Light Theme**: Otomatik tema desteği
- **Çoklu Para Birimi**: TRY, USD, EUR, GBP desteği

## 🏗️ Teknoloji Yığını

### Frontend
- **React Native** (0.79.3) - Cross-platform mobil uygulama
- **Expo** (53.0.9) - Geliştirme ve deployment platformu
- **TypeScript** - Tip güvenli kod geliştirme
- **React Navigation** - Sayfa yönlendirme
- **Material-UI** - Web UI bileşenleri
- **Framer Motion** - Animasyonlar

### State Management
- **MobX** (6.13.7) - Reaktif state yönetimi
- **MobX React Lite** - React entegrasyonu

### Backend & Database
- **Firebase Firestore** - NoSQL veritabanı
- **Firebase Auth** - Kimlik doğrulama
- **Firebase Hosting** - Web hosting

### Grafik ve Görselleştirme
- **Recharts** - Web grafikler
- **React Native Chart Kit** - Mobil grafikler
- **Victory Native** - İleri seviye chart'lar

## 🚀 Kurulum

### Gereksinimler
- Node.js (18+)
- npm veya yarn
- Expo CLI
- Firebase projesi

### 1. Projeyi Klonlama
```bash
git clone https://github.com/yourusername/paramiyonet.git
cd paramiyonet
```

### 2. Bağımlılıkların Yüklenmesi
```bash
npm install
# veya
yarn install
```

### 3. Firebase Konfigürasyonu
`src/config/firebase.ts` dosyasını Firebase console'dan aldığınız bilgilerle güncelleyin:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 4. Uygulamayı Çalıştırma

#### Mobil Geliştirme
```bash
# Development server başlatma
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android
```

#### Web Geliştirme
```bash
# Web versiyonu
npm run web
```

## 📁 Proje Yapısı

```
paramiYonet/
├── src/
│   ├── components/          # UI bileşenleri
│   │   ├── budget/         # Bütçe bileşenleri
│   │   ├── charts/         # Grafik bileşenleri
│   │   ├── common/         # Ortak bileşenler
│   │   ├── dashboard/      # Dashboard bileşenleri
│   │   └── recurring/      # Tekrarlayan ödeme bileşenleri
│   ├── config/             # Konfigürasyon dosyaları
│   ├── constants/          # Sabitler ve tema
│   ├── contexts/           # React Context'leri
│   ├── hooks/              # Custom hook'lar
│   ├── models/             # Veri modelleri
│   ├── navigation/         # Navigasyon yapısı
│   ├── services/           # API servisleri
│   ├── types/              # TypeScript tip tanımları
│   ├── utils/              # Yardımcı fonksiyonlar
│   ├── viewmodels/         # MobX ViewModel'leri
│   ├── views/              # Mobil ekranlar
│   └── web/                # Web uygulaması
│       ├── components/     # Web bileşenleri
│       ├── contexts/       # Web context'leri
│       ├── pages/          # Web sayfaları
│       └── styles/         # Web stilleri
├── assets/                 # Görseller ve ikonlar
├── android/                # Android konfigürasyonu
└── public/                 # Web static dosyaları
```

## 🎨 Tasarım Sistemi

### Renkler
- **Primary**: #007AFF (iOS Blue)
- **Secondary**: #FFD60A (Gold)
- **Success**: #00E676 (Green)
- **Error**: #FF1744 (Red)
- **Background**: #000000 (Dark) / #FFFFFF (Light)

### Tipografi
- **Font Sizes**: 12px - 32px
- **Font Weights**: Regular, Medium, Semibold, Bold

## 📱 Ekranlar ve Özellikler

### Mobil Uygulaması
1. **Dashboard**: Genel bakış ve hızlı aksiyonlar
2. **İşlemler**: Gelir/gider listesi ve filtreleme
3. **Hesaplar**: Banka hesapları ve bakiye takibi
4. **Borçlar**: Verilen/alınan borç yönetimi
5. **Bütçe**: Kategori bazlı bütçe planlaması
6. **Raporlar**: Grafik ve analizler
7. **Ayarlar**: Uygulama konfigürasyonu

### Web Uygulaması
1. **Dashboard**: Responsive dashboard
2. **Hesaplar**: Detaylı hesap yönetimi
3. **İşlemler**: Gelişmiş filtreleme ve arama
4. **Kredi Kartları**: Kredi kartı özel yönetimi
5. **Borçlar**: Pie chart ile borç analizi
6. **Bütçe**: İnteraktif bütçe yönetimi
7. **Raporlar**: Gelişmiş grafik analizleri
8. **Profil**: Kullanıcı bilgileri ve güvenlik

## 🔧 API Servisleri

### Ana Servisler
- **TransactionService**: İşlem CRUD operasyonları
- **AccountService**: Hesap yönetimi
- **DebtService**: Borç yönetimi
- **BudgetService**: Bütçe operasyonları
- **CategoryService**: Kategori yönetimi
- **RecurringPaymentService**: Tekrarlayan ödemeler
- **GoldPriceService**: Altın fiyat API'si
- **UserService**: Kullanıcı profil yönetimi

### Firebase Koleksiyonları
- `users`: Kullanıcı profilleri
- `transactions`: Finansal işlemler
- `accounts`: Hesap bilgileri
- `categories`: İşlem kategorileri
- `budgets`: Bütçe planları
- `debts`: Borç kayıtları
- `recurringPayments`: Tekrarlayan ödemeler

## 🔒 Güvenlik

- Firebase Authentication ile güvenli giriş
- Firestore Security Rules ile veri koruması
- Client-side validasyon
- Güvenli API anahtarı yönetimi

## 📊 State Management (MobX)

### Ana ViewModel'ler
- **AuthViewModel**: Kimlik doğrulama durumu
- **TransactionViewModel**: İşlem yönetimi
- **AccountViewModel**: Hesap durumları
- **DebtViewModel**: Borç takibi
- **BudgetViewModel**: Bütçe yönetimi
- **DashboardViewModel**: Dashboard verileri

## 🌐 Browser Desteği

Web uygulaması modern browser'larda çalışır:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📈 Performans

- Lazy loading ile optimizasyon
- Image optimization
- Code splitting
- Firestore offline support
- Local storage caching

## 🚀 Deployment

### Web Deployment (Firebase Hosting)
```bash
# Build oluşturma
expo build:web

# Firebase'e deploy
firebase deploy --only hosting
```

### Mobil Deployment (EAS Build)
```bash
# Android APK
eas build --platform android

# iOS App Store
eas build --platform ios
```

## 🤝 Katkıda Bulunma

1. Fork'layın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit'leyin (`git commit -m 'Add amazing feature'`)
4. Push'layın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

**Gökhan Kaya**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🆘 Destek

Herhangi bir sorun yaşarsanız:
1. GitHub Issues sayfasını kontrol edin
2. Yeni issue açın
3. Detaylı bilgi ve ekran görüntüleri ekleyin

---

⭐ Bu projeyi beğendiyseniz yıldızlamayı unutmayın! 