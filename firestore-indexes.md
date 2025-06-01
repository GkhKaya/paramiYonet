# Firebase Firestore İndeksler

Bu dosya, paramiYonet uygulaması için gerekli Firestore composite index'lerini açıklar.

## Gerekli İndeksler

Eğer performans iyileştirmesi için sorguları Firebase tarafında sıralamak istiyorsanız, aşağıdaki composite index'leri Firebase Console'da oluşturabilirsiniz:

### 1. Transactions Collection İndeksi

**Collection ID:** `transactions`
**Query Scope:** Collection
**Fields:**
- `userId` - Ascending
- `date` - Descending

### 2. Accounts Collection İndeksi

**Collection ID:** `accounts`
**Query Scope:** Collection
**Fields:**
- `userId` - Ascending
- `createdAt` - Descending

## İndeks Oluşturma Adımları

1. [Firebase Console](https://console.firebase.google.com) açın
2. Projenizi seçin
3. Sol menüden "Firestore Database" seçin
4. "Indexes" sekmesine tıklayın
5. "Create Index" butonuna tıklayın
6. Yukarıdaki bilgileri girin
7. "Create" butonuna tıklayın

## Not

Şu anda uygulama, index gereksinimiini önlemek için sıralamayı memory'de yapıyor. Bu küçük veri setleri için yeterlidir, ancak büyük veri setleri için performans optimizasyonu olarak index'ler oluşturulabilir.

## Hata Mesajları

Eğer console'da şu tip hata mesajları görürseniz:

```
The query requires an index. You can create it here: [URL]
```

Bu, yukarıdaki index'leri oluşturmanız gerektiği anlamına gelir. Firebase otomatik olarak hangi index'in gerekli olduğunu gösterir ve link verir. 