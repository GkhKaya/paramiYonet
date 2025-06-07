# Utils ve Hooks Refactoring

Bu döküman, uygulama genelindeki tekrar eden kodların düzenlenmesi sonrası yeni yapıyı açıklar.

## 🔄 Yapılan Değişiklikler

### Önceki Durum
- Her component/screen'de aynı formatCurrency, formatDate fonksiyonları tekrar ediyordu
- Kategori işlemleri her yerde ayrı ayrı yazılıyordu
- Code duplication çok fazlaydı

### Yeni Yapı
- **Merkezi utility fonksiyonları**: `src/utils/` klasöründe
- **Custom hook'lar**: `src/hooks/` klasöründe
- **Clean, reusable, DRY kod**

## 📁 Yeni Dosya Yapısı

```
src/
├── utils/
│   ├── index.ts              # Merkezi export
│   ├── currency.ts           # Para formatı utilities
│   ├── date.ts              # Tarih formatı utilities
│   ├── category.ts          # Kategori utilities
│   ├── formatters.ts        # [DEPRECATED] Eski formatters
│   └── validation.ts        # Validation utilities
├── hooks/
│   ├── index.ts             # Merkezi export
│   ├── useCurrency.ts       # Para formatı hook
│   ├── useDate.ts           # Tarih formatı hook
│   └── useCategory.ts       # Kategori hook
```

## 🛠 Utility Fonksiyonları

### Currency Utils (`utils/currency.ts`)
```typescript
import { formatCurrency, getCurrencySymbol, parseBalanceInput } from '../utils';

// Para formatı
const amount = formatCurrency(1234.56); // "₺1.234,56"

// Para birimi simgesi
const symbol = getCurrencySymbol('TRY'); // "₺"

// Input parsing
const parsed = parseBalanceInput("1,234.56 TL"); // 1234.56
```

### Date Utils (`utils/date.ts`)
```typescript
import { formatDate, formatRelativeDate } from '../utils';

// Tarih formatı
const date = formatDate(new Date(), 'short'); // "01/01/2024"
const relative = formatRelativeDate(new Date()); // "Bugün"
```

### Category Utils (`utils/category.ts`)
```typescript
import { getCategoryDetails, getCategoriesByType } from '../utils';

// Kategori detayları
const category = getCategoryDetails('Yemek', TransactionType.EXPENSE);

// Tüm kategoriler
const categories = getCategoriesByType(TransactionType.EXPENSE);
```

## 🎣 Custom Hook'lar

### useCurrency Hook
```typescript
import { useCurrency } from '../hooks';

const MyComponent = () => {
  const { formatCurrency, currencySymbol, parseInput } = useCurrency();
  
  return (
    <Text>{formatCurrency(1234.56)}</Text> // "₺1.234,56"
  );
};
```

### useDate Hook
```typescript
import { useDate } from '../hooks';

const MyComponent = () => {
  const { formatShort, formatRelative } = useDate();
  
  return (
    <Text>{formatRelative(new Date())}</Text> // "Bugün"
  );
};
```

### useCategory Hook
```typescript
import { useCategory } from '../hooks';

const MyComponent = () => {
  const { getDetails, getAllCategories } = useCategory({ 
    type: TransactionType.EXPENSE 
  });
  
  const category = getDetails('Yemek');
  const categories = getAllCategories();
  
  return <CategoryList categories={categories} />;
};
```

## 📦 Import Şekilleri

### Merkezi Import (Önerilen)
```typescript
// Tüm utilities
import { formatCurrency, formatDate, getCategoryDetails } from '../utils';

// Tüm hooks
import { useCurrency, useDate, useCategory } from '../hooks';
```

### Spesifik Import
```typescript
// Sadece currency
import { formatCurrency } from '../utils/currency';
import { useCurrency } from '../hooks/useCurrency';
```

## 🔧 Güncellenen Dosyalar

### Screens
- ✅ `AddTransactionScreen.tsx` - useCurrency, useCategory, useDate
- ✅ `DashboardScreen.tsx` - useCurrency, useCategory, useDate  
- ✅ `ReportsScreen.tsx` - useCurrency, useCategory, useDate
- ✅ `TransactionsScreen.tsx` - useCurrency, useCategory, useDate
- ✅ `AddAccountScreen.tsx` - useCurrency

### Components
- ✅ `BudgetSummary.tsx` - useCurrency
- ✅ `BudgetCard.tsx` - useCurrency
- ✅ `AccountCard.tsx` - useCurrency
- ✅ `CategoryChart.tsx` - useCurrency
- ✅ `RecentTransactions.tsx` - useCurrency, useCategory, useDate

### ViewModels
- ✅ `BudgetViewModel.ts` - Removed duplicate formatCurrency
- ✅ `RecurringPaymentViewModel.ts` - Removed duplicate formatCurrency

### Services
- ✅ `GoldPriceService.ts` - Comment added for future refactoring

## 🚀 Faydalar

### Code Quality
- **DRY Principle**: Tekrar eden kod eliminate edildi
- **Single Responsibility**: Her utility tek bir iş yapıyor
- **Reusability**: Hook'lar ve utilities her yerde kullanılabilir

### Developer Experience
- **Type Safety**: TypeScript ile tip güvenliği
- **Auto-complete**: IDE'de otomatik tamamlama
- **Consistency**: Tüm uygulamada tutarlı formatlar

### Maintenance
- **Centralized**: Değişiklikler tek yerden yapılır
- **Easy Testing**: Utility fonksiyonları test edilebilir
- **Documentation**: Her fonksiyon dokümante edilmiş

## 📋 Kullanım Örnekleri

### Para Formatı
```typescript
// Eski yöntem ❌
const formatCurrency = (amount: number) => {
  return `₺${amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

// Yeni yöntem ✅
import { useCurrency } from '../hooks';
const { formatCurrency } = useCurrency();
```

### Tarih Formatı
```typescript
// Eski yöntem ❌
const formatDate = (date: Date) => {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Yeni yöntem ✅
import { useDate } from '../hooks';
const { formatShort } = useDate();
```

### Kategori İşlemleri
```typescript
// Eski yöntem ❌
const getCategoryDetails = (categoryName: string, type: TransactionType) => {
  const categories = type === TransactionType.INCOME 
    ? DEFAULT_INCOME_CATEGORIES 
    : DEFAULT_EXPENSE_CATEGORIES;
  
  return categories.find(cat => cat.name === categoryName) || categories[0];
};

// Yeni yöntem ✅
import { useCategory } from '../hooks';
const { getDetails } = useCategory();
const category = getDetails(categoryName, type);
```

## 🔮 Gelecek Planları

1. **formatters.ts** dosyası tamamen kaldırılacak
2. Daha fazla utility fonksionu eklenecek
3. Unit testler yazılacak
4. Performance optimizasyonları yapılacak
5. i18n desteği eklenecek

## 📝 Notlar

- Eski `formatters.ts` dosyası backward compatibility için korunmuştur
- Yeni projeler mutlaka yeni hook'ları kullanmalıdır
- Mevcut kodlar zamanla yeni yapıya migrate edilecektir 