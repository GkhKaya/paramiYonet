import React, { useState } from 'react';
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

interface HelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'Uygulamaya nasıl işlem eklerim?',
    answer: 'Ana sayfadaki "Gelir Ekle" veya "Gider Ekle" butonlarına tıklayarak yeni işlem ekleyebilirsiniz. İşlemler sayfasından da "+" butonuyla yeni işlem ekleyebilirsiniz.'
  },
  {
    question: 'Verilerim güvende mi?',
    answer: 'Evet, tüm verileriniz Firebase güvenlik protokolleri ile korunmaktadır. Veriler şifrelenerek saklanır ve sadece sizin erişiminizde olur.'
  },
  {
    question: 'Hesap nasıl oluştururum?',
    answer: 'Hesaplar sayfasından "Yeni Hesap" butonuna tıklayarak banka hesabı, kredi kartı veya nakit hesap oluşturabilirsiniz.'
  },
  {
    question: 'Raporları nasıl görüntülerim?',
    answer: 'Raporlar sayfasından aylık, yıllık harcama raporlarınızı ve kategori bazlı analizlerinizi görüntüleyebilirsiniz.'
  },
  {
    question: 'Verilerimi nasıl yedeklerim?',
    answer: 'Verileriniz otomatik olarak Firebase\'de yedeklenmektedir. Ayrıca Ayarlar > Verileri İndir ile JSON formatında verilerinizi indirebilirsiniz.'
  },
  {
    question: 'Şifremi unuttum, ne yapmalıyım?',
    answer: 'Giriş ekranındaki "Şifremi Unuttum" linkine tıklayarak e-posta adresinize şifre sıfırlama linki gönderebilirsiniz.'
  }
];

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'developer'>('faq');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const renderFAQ = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular</Text>
      
      {faqData.map((item, index) => (
        <View key={index} style={styles.faqItem}>
          <TouchableOpacity
            style={styles.faqQuestion}
            onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
          >
            <Text style={styles.faqQuestionText}>{item.question}</Text>
            <Ionicons 
              name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.TEXT_SECONDARY} 
            />
          </TouchableOpacity>
          
          {expandedFAQ === index && (
            <View style={styles.faqAnswer}>
              <Text style={styles.faqAnswerText}>{item.answer}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderDeveloper = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Geliştirici Bilgileri</Text>
      
      <View style={styles.developerCard}>
        <View style={styles.developerHeader}>
          <Ionicons name="person-circle" size={60} color={COLORS.PRIMARY} />
          <View style={styles.developerInfo}>
            <Text style={styles.developerName}>Gökhan Kaya</Text>
            <Text style={styles.developerTitle}>Full Stack Developer</Text>
          </View>
        </View>
        
        <View style={styles.socialLinks}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleLinkPress('https://github.com/gokhankaya')}
          >
            <Ionicons name="logo-github" size={24} color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.socialText}>GitHub</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleLinkPress('https://linkedin.com/in/gokhankaya')}
          >
            <Ionicons name="logo-linkedin" size={24} color={COLORS.PRIMARY} />
            <Text style={styles.socialText}>LinkedIn</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleLinkPress('https://gokhankaya.dev')}
          >
            <Ionicons name="globe-outline" size={24} color={COLORS.SUCCESS} />
            <Text style={styles.socialText}>Personal Website</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleLinkPress('https://devosuit.com')}
          >
            <Ionicons name="business-outline" size={24} color={COLORS.WARNING} />
            <Text style={styles.socialText}>Devosuit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contactInfo}>
          <Text style={styles.contactTitle}>İletişim</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => handleLinkPress('mailto:gokhan@devosuit.com')}
          >
            <Ionicons name="mail-outline" size={20} color={COLORS.PRIMARY} />
            <Text style={styles.contactText}>gokhan@devosuit.com</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Yardım ve Destek</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
            onPress={() => setActiveTab('faq')}
          >
            <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
              S.S.S.
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'developer' && styles.activeTab]}
            onPress={() => setActiveTab('developer')}
          >
            <Text style={[styles.tabText, activeTab === 'developer' && styles.activeTabText]}>
              Geliştirici
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'faq' ? renderFAQ() : renderDeveloper()}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: 12,
    padding: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    color: COLORS.WHITE,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.lg,
  },
  
  // FAQ Styles
  faqItem: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.sm,
  },
  faqAnswer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  faqAnswerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
    color: COLORS.TEXT_SECONDARY,
  },
  
  // Developer Styles
  developerCard: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  developerInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  developerName: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  developerTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  socialLinks: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  socialText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
  },
  contactInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.lg,
  },
  contactTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  contactText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.PRIMARY,
  },
}); 