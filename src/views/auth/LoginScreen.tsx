import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
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

const { width, height } = Dimensions.get('window');

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
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadSavedCredentials = async () => {
      const credentials = await getSavedCredentials();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
      }
    };
    
    loadSavedCredentials();
    
    // Simple fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    const result = await signIn(email, password, false);
    if (result) {
      onLoginSuccess();
    }
  };

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
                <Text style={styles.welcomeTitle}>Welcome back.</Text>
                
                {/* Email Input */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Email address</Text>
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
                  <Text style={styles.inputLabel}>Password</Text>
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

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.signInButton,
                    (!email || !password) && styles.signInButtonDisabled
                  ]}
                  onPress={handleLogin}
                  disabled={!email || !password || loading}
                >
                  <Text style={styles.signInButtonText}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={onNavigateToRegister}
                >
                  <Text style={styles.signUpButtonText}>Sign up</Text>
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
  forgotPassword: {
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonDisabled: {
    backgroundColor: '#333333',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  signUpButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

});

export default LoginScreen; 