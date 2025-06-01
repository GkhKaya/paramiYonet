import React, { useState, useEffect } from 'react';
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

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = observer(({ 
  onNavigateToRegister, 
  onLoginSuccess 
}) => {
  const { signIn, loading, getSavedCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Sayfa yüklendiğinde kayıtlı bilgileri kontrol et
  useEffect(() => {
    const loadSavedCredentials = async () => {
      const credentials = await getSavedCredentials();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        setRememberMe(true);
      }
    };
    
    loadSavedCredentials();
  }, [getSavedCredentials]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    const result = await signIn(email, password, rememberMe);
    if (result) {
      onLoginSuccess();
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
            <Text style={styles.title}>Giriş Yap</Text>
            <Text style={styles.subtitle}>
              Hesabınıza giriş yaparak paranızı yönetmeye devam edin
            </Text>
          </View>

          {/* Login Form */}
          <Card style={styles.formCard}>
            <View style={styles.formContent}>
              <Input
                label="E-posta"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="mail-outline"
              />

              <Input
                label="Şifre"
                placeholder="Şifrenizi girin"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon="lock-closed-outline"
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                containerStyle={styles.passwordInput}
              />

              <TouchableOpacity style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
              </TouchableOpacity>

              {/* Beni Hatırla Checkbox */}
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked
                ]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Beni Hatırla</Text>
              </TouchableOpacity>

              <Button
                title="Giriş Yap"
                onPress={handleLogin}
                loading={loading}
                disabled={!email || !password}
                style={styles.loginButton}
              />
            </View>
          </Card>

          {/* Register Navigation */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
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
  passwordInput: {
    marginBottom: SPACING.sm,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.PRIMARY,
  },
  rememberMeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  registerText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
  },
  registerLink: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default LoginScreen; 