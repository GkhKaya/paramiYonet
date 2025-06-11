# Firebase Firestore İndeksler

Bu dosya, paramiYonet uygulaması için Firestore composite index'leri hakkında bilgi verir.

## Önemli Not

**Uygulama artık composite index gerektirmeyen şekilde optimize edilmiştir.**

Tüm Firestore sorguları, "The query requires an index" hatasını önlemek için yeniden yazılmıştır:

- `where` + `orderBy` kombinasyonları kaldırılmıştır
- Sıralama işlemleri client-side'da yapılmaktadır
- Limit işlemleri client-side'da uygulanmaktadır

## Performans Optimizasyonu (Opsiyonel)

Büyük veri setleri ile çalışırken daha iyi performans için aşağıdaki index'leri oluşturabilirsiniz:

### 1. Transactions Collection İndeksi (Opsiyonel)

**Collection ID:** `transactions`
**Query Scope:** Collection
**Fields:**
- `userId` - Ascending
- `date` - Descending

### 2. Accounts Collection İndeksi (Opsiyonel)

**Collection ID:** `accounts`
**Query Scope:** Collection
**Fields:**
- `userId` - Ascending
- `createdAt` - Descending

### 3. Monthly Transactions İndeksi (Opsiyonel)

**Collection ID:** `transactions`
**Query Scope:** Collection
**Fields:**
- `userId` - Ascending
- `date` - Ascending
- `date` - Descending

## İndeks Oluşturma (Opsiyonel)

1. [Firebase Console](https://console.firebase.google.com) açın
2. Projenizi seçin
3. Sol menüden "Firestore Database" seçin
4. "Indexes" sekmesine tıklayın
5. "Create Index" butonuna tıklayın
6. Yukarıdaki bilgileri girin
7. "Create" butonuna tıklayın

## Mevcut Durum

Uygulama şu anda index'siz çalışacak şekilde tasarlanmıştır. Bu yaklaşım:

✅ **Artıları:**
- Index oluşturma gerektirmez
- Hemen çalışır
- Basit deployment

❌ **Eksileri:**
- Büyük veri setlerinde client-side sıralama yavaş olabilir
- Daha fazla network trafiği (tüm veriler çekilir)

## Öneriler

- **Küçük uygulamalar** için mevcut yaklaşım yeterlidir
- **Büyük uygulamalar** için yukarıdaki index'leri oluşturun ve sorguları geri çevirin 