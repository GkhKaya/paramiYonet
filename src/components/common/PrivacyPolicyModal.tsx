import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { isWeb } from '../../utils/platform';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const handleOpenWebsite = () => {
    const url = 'https://devosuit.com/privacy-policy'; // Gerçek website URL'si
    if (isWeb) {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
    onClose();
  };

  const privacyContent = `
GİZLİLİK POLİTİKASI

Son Güncelleme: 02 Aralık 2025

Bu Gizlilik Politikası, ParamiYönet uygulamasını ("Uygulama", "Hizmet") kullanırken kişisel bilgilerinizin nasıl toplandığı, kullanıldığı ve korunduğunu açıklar.

1. TOPLANAN BİLGİLER

1.1 Kişisel Bilgiler:
• E-posta adresi (hesap oluşturma için)
• Ad ve soyad
• Mali işlem bilgileri (gelir, gider kayıtları)
• Hesap bakiye bilgileri

1.2 Teknik Bilgiler:
• Cihaz bilgileri (işletim sistemi, model)
• Uygulama kullanım istatistikleri
• IP adresi
• Çerez ve benzeri teknolojiler

2. BİLGİLERİN KULLANIMI

Toplanan bilgiler şu amaçlarla kullanılır:
• Hizmetin sağlanması ve geliştirilmesi
• Kullanıcı desteği sağlanması
• Güvenlik ve dolandırıcılık önleme
• Yasal yükümlülüklerin yerine getirilmesi

3. BİLGİ PAYLAŞIMI

Kişisel bilgileriniz şu durumlar dışında üçüncü taraflarla paylaşılmaz:
• Yasal zorunluluklar
• Kullanıcının açık rızası
• Hizmet sağlayıcıları (güvenli şekilde)

4. VERİ GÜVENLİĞİ

Verileriniz endüstri standardı güvenlik önlemleriyle korunur:
• SSL/TLS şifreleme
• Firebase güvenlik protokolleri
• Düzenli güvenlik güncellemeleri

5. KULLANICI HAKLARI

KVKK kapsamında aşağıdaki haklarınız bulunmaktadır:
• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• Bilgi talep etme
• Düzeltme talep etme
• Silme talep etme
• Veri taşınabilirliği

6. VERİ SAKLAMA SÜRESİ

Kişisel veriler, işlenme amacının ortadan kalkması veya yasal saklama sürelerinin dolması halinde silinir.

7. ÇEREZLER

Uygulama, kullanıcı deneyimini geliştirmek için çerezler kullanabilir. Çerez ayarlarını cihazınızdan kontrol edebilirsiniz.

8. DEĞİŞİKLİKLER

Bu politika güncellenebilir. Önemli değişiklikler uygulama üzerinden bildirilir.

9. İLETİŞİM

Gizlilik ile ilgili sorularınız için:
E-posta: privacy@devosuit.com
Adres: Türkiye

10. YASAL ÇERÇEVE

Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili mevzuat kapsamında hazırlanmıştır.

© 2025 Devosuit - Tüm hakları saklıdır.
`;

  if (isWeb) {
    // Web'de direkt website'ye yönlendir
    handleOpenWebsite();
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gizlilik Politikası</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.contentText}>{privacyContent.trim()}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.websiteButton} onPress={handleOpenWebsite}>
            <Ionicons name="globe-outline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.websiteButtonText}>
              Tam Metni Web'de Görüntüle
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  contentText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 22,
    color: COLORS.TEXT_SECONDARY,
    paddingVertical: SPACING.lg,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  websiteButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
}); 