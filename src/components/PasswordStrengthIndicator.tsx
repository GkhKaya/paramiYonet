import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { validatePassword, PASSWORD_RULES } from '../utils/validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRules?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ 
  password, 
  showRules = true 
}) => {
  const validation = validatePassword(password);
  const { errors } = validation;
  
  // Güçlülük seviyesi hesaplama
  const totalRules = 5; // minLength, uppercase, lowercase, number, special
  const passedRules = totalRules - errors.length;
  const strengthPercentage = (passedRules / totalRules) * 100;
  
  // Renk belirleme
  const getStrengthColor = () => {
    if (strengthPercentage < 40) return '#ff4757'; // Kırmızı - Zayıf
    if (strengthPercentage < 70) return '#ffa502'; // Turuncu - Orta
    if (strengthPercentage < 90) return '#2ed573'; // Yeşil - İyi
    return '#5f27cd'; // Mor - Çok güçlü
  };
  
  // Güçlülük metni
  const getStrengthText = () => {
    if (strengthPercentage < 40) return 'Zayıf';
    if (strengthPercentage < 70) return 'Orta';
    if (strengthPercentage < 90) return 'İyi';
    return 'Çok Güçlü';
  };
  
  // Kural kontrolü
  const checkRule = (ruleCheck: () => boolean) => {
    return password.length > 0 ? ruleCheck() : false;
  };

  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* Güçlülük çubuğu */}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBarBackground}>
          <View 
            style={[
              styles.strengthBarFill,
              {
                width: `${strengthPercentage}%`,
                backgroundColor: getStrengthColor()
              }
            ]}
          />
        </View>
        <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
          {getStrengthText()}
        </Text>
      </View>

      {/* Şifre kuralları */}
      {showRules && (
        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>Şifre Kuralları:</Text>
          
          <View style={styles.ruleItem}>
            <Text style={[
              styles.ruleText,
              { color: checkRule(() => password.length >= PASSWORD_RULES.minLength) ? '#2ed573' : '#ff4757' }
            ]}>
              {checkRule(() => password.length >= PASSWORD_RULES.minLength) ? '✓' : '✗'} 
              En az {PASSWORD_RULES.minLength} karakter
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={[
              styles.ruleText,
              { color: checkRule(() => /[A-Z]/.test(password)) ? '#2ed573' : '#ff4757' }
            ]}>
              {checkRule(() => /[A-Z]/.test(password)) ? '✓' : '✗'} 
              En az bir büyük harf
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={[
              styles.ruleText,
              { color: checkRule(() => /[a-z]/.test(password)) ? '#2ed573' : '#ff4757' }
            ]}>
              {checkRule(() => /[a-z]/.test(password)) ? '✓' : '✗'} 
              En az bir küçük harf
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={[
              styles.ruleText,
              { color: checkRule(() => /\d/.test(password)) ? '#2ed573' : '#ff4757' }
            ]}>
              {checkRule(() => /\d/.test(password)) ? '✓' : '✗'} 
              En az bir sayı
            </Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Text style={[
              styles.ruleText,
              { color: checkRule(() => /[@$!%*?&]/.test(password)) ? '#2ed573' : '#ff4757' }
            ]}>
              {checkRule(() => /[@$!%*?&]/.test(password)) ? '✓' : '✗'} 
              En az bir özel karakter ({PASSWORD_RULES.specialChars})
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#e1e8ed',
    borderRadius: 3,
    marginRight: 8,
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  rulesContainer: {
    marginTop: 8,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#657786',
    marginBottom: 4,
  },
  ruleItem: {
    marginVertical: 2,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 