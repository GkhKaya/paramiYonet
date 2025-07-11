import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = observer(({ 
  onNavigateToLogin, 
  onRegisterSuccess 
}) => {
  const { signUp, loading, dataLoading } = useAuth();
  const { showError } = useError();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      showError('Lütfen tüm alanları doldurun', 'warning', 'Eksik Bilgi');
      return;
    }

    if (password !== confirmPassword) {
      showError('Şifreler eşleşmiyor', 'error', 'Şifre Hatası');
      return;
    }

    if (password.length < 6) {
      showError('Şifre en az 6 karakter olmalıdır', 'warning', 'Şifre Uzunluğu');
      return;
    }

    const result = await signUp(email, password, displayName);
    if (result) {
      onRegisterSuccess();
    }
  };

  const isFormValid = displayName && email && password && confirmPassword;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <KeyboardAvoidingView 
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Welcome Title */}
                <Text style={styles.welcomeTitle}>Hesap oluştur.</Text>
                
                {/* Full Name Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Ad Soyad</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={displayName}
                      onChangeText={setDisplayName}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      autoCapitalize="words"
                      placeholderTextColor="#666666"
                    />
                    <View style={[
                      styles.underline,
                      nameFocused && styles.underlineFocused
                    ]} />
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>E-posta adresi</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor="#666666"
                    />
                    <View style={[
                      styles.underline,
                      emailFocused && styles.underlineFocused
                    ]} />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Şifre</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      secureTextEntry={!showPassword}
                      placeholderTextColor="#666666"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#666666" 
                      />
                    </TouchableOpacity>
                    <View style={[
                      styles.underline,
                      passwordFocused && styles.underlineFocused
                    ]} />
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Şifre tekrar</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setConfirmPasswordFocused(true)}
                      onBlur={() => setConfirmPasswordFocused(false)}
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor="#666666"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#666666" 
                      />
                    </TouchableOpacity>
                    <View style={[
                      styles.underline,
                      confirmPasswordFocused && styles.underlineFocused
                    ]} />
                  </View>
                </View>

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[
                    styles.signUpButton,
                    !isFormValid && styles.signUpButtonDisabled
                  ]}
                  onPress={handleRegister}
                  disabled={!isFormValid || dataLoading}
                >
                  <Text style={styles.signUpButtonText}>
                    {dataLoading ? 'Hesap oluşturuluyor...' : 'Hesap oluştur'}
                  </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={onNavigateToLogin}
                >
                  <Text style={styles.signInButtonText}>Giriş yap</Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    minHeight: height,
  },
  content: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    fontSize: 18,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 12,
    padding: 4,
  },
  underline: {
    height: 1,
    backgroundColor: '#333333',
    marginTop: 8,
  },
  underlineFocused: {
    backgroundColor: '#007AFF',
    height: 2,
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signUpButtonDisabled: {
    backgroundColor: '#333333',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RegisterScreen; 