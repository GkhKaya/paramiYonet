# 🔑 Google Authentication Kurulum Rehberi

Google Sign In özelliğini aktif hale getirmek için aşağıdaki adımları takip edin:

## 1. Firebase Console Ayarları

### Firebase Authentication'ı Etkinleştir
1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Projenizi seçin
3. **Authentication** > **Sign-in method** bölümüne gidin
4. **Google** provider'ını etkinleştirin
5. **Web SDK configuration** bölümünden **Web client ID**'nizi kopyalayın

## 2. Google Cloud Console Ayarları

### OAuth 2.0 Client IDs Oluşturma
1. [Google Cloud Console](https://console.cloud.google.com/) gidin
2. Projenizi seçin (Firebase projeniyle aynı olmalı)
3. **APIs & Services** > **Credentials** bölümüne gidin
4. **+ CREATE CREDENTIALS** > **OAuth 2.0 Client IDs** tıklayın

### Her platform için Client ID oluşturun:

#### Web Application:
- **Application type**: Web application
- **Authorized redirect URIs**: 
  - `https://auth.expo.io/@adevelopr/paramiyonet`
  - `http://localhost:19000`

#### iOS Application:
- **Application type**: iOS
- **Bundle ID**: `com.adevelopr.paramiyonet`

#### Android Application:
- **Application type**: Android
- **Package name**: `com.adevelopr.paramiyonet`
- **SHA-1 certificate fingerprint**: (Debug ve Release için)

### SHA-1 Fingerprint Alma:
```bash
# Debug için
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey

# Release için (kendi keystore dosyanızla)
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

## 3. Uygulama Konfigürasyonu

### Client ID'leri Güncelleme
`src/contexts/AuthContext.tsx` dosyasındaki GOOGLE_OAUTH_CONFIG objesini güncelleyin:

```typescript
const GOOGLE_OAUTH_CONFIG = {
  expoClientId: "YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com", 
  androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
};
```

## 4. Test Etme

### Development Build:
```bash
expo start
```

### Production Build:
```bash
# iOS
eas build --platform ios

# Android  
eas build --platform android
```

## 5. Sorun Giderme

### Yaygın Hatalar:
- **"OAuth client not found"**: Client ID'lerin doğru olduğundan emin olun
- **"Redirect URI mismatch"**: Authorized redirect URIs'i kontrol edin
- **"Package name mismatch"**: Bundle ID/Package name'lerin eşleştiğinden emin olun

### Debug İpuçları:
- Browser'da geliştirici araçlarını açın
- Network tab'inde OAuth isteklerini kontrol edin
- Console'da hata mesajlarını inceleyin

## 6. Güvenlik Notları

- Client ID'leri **asla** public repository'lerde paylaşmayın
- Production'da environment variables kullanın
- SHA-1 fingerprint'leri güvenli bir şekilde saklayın

---

✅ Kurulum tamamlandığında users.firebase.google.com'dan test kullanıcısı ekleyebilirsiniz
✅ Google Sign In butonu çalışmaya başlayacaktır
✅ Kullanıcı profilleri otomatik olarak Firestore'da oluşturulacaktır 