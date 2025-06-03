import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { isWeb } from '../utils/platform';

interface HelpAndSupportScreenProps {
  navigation: any;
}

const devInfo = {
  name: 'Gökhan Kaya',
  linkedin: 'https://www.linkedin.com/in/gkhkaya/',
  github: 'https://github.com/gkhkaya',
  website: 'https://gkhkaya.info',
  devosuit: 'https://devosuit.com',
};

const faqData = [
  {
    id: '1',
    question: 'Uygulamaya nasıl yeni bir işlem ekleyebilirim?',
    answer:
      'Ana ekrandaki (Dashboard) "Hızlı İşlemler" bölümünden "Gelir Ekle" veya "Gider Ekle" butonlarını kullanabilir veya navigasyon menüsündeki "Ekle" seçeneğine giderek yeni işlem oluşturabilirsiniz. Gerekli alanları (tutar, açıklama, kategori, hesap, tarih) doldurduktan sonra "Kaydet" butonuna tıklamanız yeterlidir.',
  },
  {
    id: '2',
    question: 'Hesap bakiyem neden güncel değil?',
    answer:
      'Hesap bakiyeleri, eklediğiniz işlemler baz alınarak otomatik olarak güncellenir. Eğer bir tutarsızlık fark ederseniz, internet bağlantınızı kontrol edin ve uygulamayı yenileyin. Bazı durumlarda, çok sayıda işlem yapıldıysa veya anlık bir senkronizasyon sorunu yaşandıysa kısa süreli gecikmeler olabilir.',
  },
  {
    id: '3',
    question: 'Raporlar bölümünde neler bulabilirim?',
    answer:
      'Raporlar bölümü, mali durumunuz hakkında detaylı analizler sunar. Haftalık ve aylık gelir-gider özetlerinizi, kategori bazlı harcamalarınızı ve gelir dağılımınızı grafiksel olarak görebilirsiniz. Bu sayede harcama alışkanlıklarınızı daha iyi anlayabilir ve bütçenizi daha etkin yönetebilirsiniz.',
  },
  {
    id: '4',
    question: 'Verilerim güvende mi?',
    answer:
      'Evet, verileriniz Firebase platformunda güvenli bir şekilde saklanmaktadır. Firebase, Google tarafından sunulan güçlü güvenlik altyapılarına sahiptir. Kişisel verilerinizin gizliliğine ve güvenliğine büyük önem veriyoruz.',
  },
  {
    id: '5',
    question: 'Uygulamayı farklı para birimlerinde kullanabilir miyim?',
    answer:
      'Şu an için uygulama varsayılan olarak Türk Lirası (TRY) para birimini desteklemektedir. Gelecek güncellemelerde farklı para birimi seçenekleri eklemeyi planlıyoruz.',
  },
];

const contactEmail = 'parayonetimi@devosuit.com';

const HelpAndSupportScreen: React.FC<HelpAndSupportScreenProps> = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleLinkPress = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log('Don\'t know how to open URI: ' + url);
      }
    });
  };
  
  const FaqItem: React.FC<{ item: typeof faqData[0]; onPress: () => void; expanded: boolean }> = ({ item, onPress, expanded }) => {
    return (
      <View style={styles.faqItemContainer}>
        <TouchableOpacity onPress={onPress} style={styles.faqQuestionButton} activeOpacity={0.8}>
          <Text style={styles.faqQuestionText}>{item.question}</Text>
          <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        {expanded && (
          <View style={styles.faqAnswerContainer}>
            <Text style={styles.faqAnswerText}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDevInfo = () => (
    <View style={styles.devInfoContainer}>
      <Text style={styles.devName}>{devInfo.name}</Text>
      <View style={styles.devLinksContainer}>
        <TouchableOpacity onPress={() => handleLinkPress(devInfo.linkedin)} style={styles.devLink}>
          <Ionicons name="logo-linkedin" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.devLinkText}>LinkedIn</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleLinkPress(devInfo.github)} style={styles.devLink}>
          <Ionicons name="logo-github" size={20} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.devLinkText}>GitHub</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.devLinksContainer}>
         <TouchableOpacity onPress={() => handleLinkPress(devInfo.website)} style={styles.devLink}>
          <Ionicons name="globe-outline" size={20} color={COLORS.SUCCESS} />
          <Text style={styles.devLinkText}>gkhkaya.info</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleLinkPress(devInfo.devosuit)} style={styles.devLink}>
          <Ionicons name="cube-outline" size={20} color={COLORS.WARNING} />
          <Text style={styles.devLinkText}>Devosuit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
      {!isWeb && (
         <View style={styles.mobileHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Yardım ve Destek</Text>
          <View style={styles.backButton} />{/* Placeholder for balance */}
        </View>
      )}
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Geliştirici Bilgileri</Text>
        {renderDevInfo()}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular (S.S.S.)</Text>
        {faqData.map((item) => (
          <FaqItem
            key={item.id}
            item={item}
            onPress={() => toggleFaq(item.id)}
            expanded={expandedFaq === item.id}
          />
        ))}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>İletişim</Text>
        <TouchableOpacity 
          style={styles.contactButton}
          onPress={() => handleLinkPress('mailto:' + contactEmail)}
        >
          <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} />
          <Text style={styles.contactEmailText}>{contactEmail}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (isWeb) {
    return (
      <WebLayout title="Yardım ve Destek" activeRoute="settings" navigation={navigation}>
        <View style={styles.webContainer}>
         {renderContent()}
        </View>
      </WebLayout>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  webContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: SPACING.xl,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40, // to balance the title
  },
  mobileHeaderTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  sectionContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  devInfoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  devName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  devLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  devLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND, // Subtle background for the link
  },
  devLinkText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  faqItemContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    overflow: 'hidden', // Important for LayoutAnimation
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  faqQuestionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  faqQuestionText: {
    fontSize: TYPOGRAPHY.sizes.sm + 1,
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: SPACING.sm,
    fontWeight: '500',
  },
  faqAnswerContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  faqAnswerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  contactEmailText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.PRIMARY,
    marginLeft: SPACING.sm,
  },
});

export default HelpAndSupportScreen; 