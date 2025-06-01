import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = observer(({ 
  onNavigateToLogin, 
  onRegisterSuccess 
}) => {
  const { signUp, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    const result = await signUp(email, password, displayName);
    if (result) {
      onRegisterSuccess();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet-outline" size={80} color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>
              Yeni hesabınızı oluşturup finansal yönetimi başlatın
            </Text>
          </View>

          {/* Register Form */}
          <Card style={styles.formCard}>
            <View style={styles.formContent}>
              <Input
                label="Ad Soyad"
                placeholder="Ad ve soyadınızı girin"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                leftIcon="person-outline"
              />

              <Input
                label="E-posta"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="mail-outline"
                containerStyle={styles.input}
              />

              <Input
                label="Şifre"
                placeholder="En az 6 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                containerStyle={styles.input}
              />

              <Input
                label="Şifre Tekrar"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                leftIcon="lock-closed-outline"
                rightIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                containerStyle={styles.input}
              />

              <Button
                title="Hesap Oluştur"
                onPress={handleRegister}
                loading={loading}
                disabled={!displayName || !email || !password || !confirmPassword}
                style={styles.registerButton}
              />
            </View>
          </Card>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              Hesap oluşturarak{' '}
              <Text style={styles.linkText}>Kullanım Şartları</Text>
              {' '}ve{' '}
              <Text style={styles.linkText}>Gizlilik Politikası</Text>
              'nı kabul etmiş olursunuz.
            </Text>
          </View>

          {/* Login Navigation */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formContent: {
    padding: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.sm,
  },
  registerButton: {
    marginTop: SPACING.lg,
  },
  termsSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  termsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_TERTIARY,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  loginText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  loginLink: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default RegisterScreen; 