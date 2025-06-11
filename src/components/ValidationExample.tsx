import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { validateEmail, validatePassword, validateDisplayName, validateForm } from '../utils/validation';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

export const ValidationExample: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const newErrors = { ...errors };
    
    switch (field) {
      case 'email':
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) {
          newErrors.email = emailValidation.message!;
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.message!;
        } else {
          delete newErrors.password;
        }
        break;
        
      case 'displayName':
        const nameValidation = validateDisplayName(value);
        if (!nameValidation.isValid) {
          newErrors.displayName = nameValidation.message!;
        } else {
          delete newErrors.displayName;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = () => {
    const validation = validateForm(formData);
    setErrors(validation.errors);
    
    if (validation.isValid) {

    } else {
      
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Validation Test</Text>
      
      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email:</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          placeholder="test@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      {/* Display Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>İsim:</Text>
        <TextInput
          style={[styles.input, errors.displayName && styles.inputError]}
          value={formData.displayName}
          onChangeText={(value) => handleInputChange('displayName', value)}
          placeholder="Ad Soyad"
        />
        {errors.displayName && <Text style={styles.errorText}>{errors.displayName}</Text>}
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Şifre:</Text>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          placeholder="Güçlü bir şifre giriniz"
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        
        {/* Password Strength Indicator */}
        <PasswordStrengthIndicator password={formData.password} />
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Şifre Tekrar:</Text>
        <TextInput
          style={[styles.input, errors.confirmPassword && styles.inputError]}
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          placeholder="Şifreyi tekrar giriniz"
          secureTextEntry
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        <Text style={styles.button} onPress={handleSubmit}>
          Formu Doğrula
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#ff4757',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4757',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#2ed573',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 16,
    borderRadius: 8,
  },
}); 