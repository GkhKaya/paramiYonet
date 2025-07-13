# 🚀 Deployment Guide

## Overview
This guide covers how to securely deploy ParamiYonet (Money Manager) application for production use.

## 📋 Prerequisites

### Required Tools
- Node.js 18+
- Expo CLI
- Firebase CLI
- Git
- Text editor

### Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Get your Firebase configuration values

## 🔧 Environment Configuration

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/paramiyonet.git
cd paramiyonet
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Setup
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### 4. Required Environment Variables
```env
# Firebase Configuration - GET THESE FROM YOUR FIREBASE PROJECT
EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# App Configuration
EXPO_PUBLIC_APP_NAME=ParamiYonet
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=production

# Security Configuration
EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS=5
EXPO_PUBLIC_SESSION_TIMEOUT=3600
EXPO_PUBLIC_RATE_LIMIT_REQUESTS=100
EXPO_PUBLIC_RATE_LIMIT_WINDOW=3600

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ENABLE_DEBUG_MODE=false
```

## 🔒 Security Configuration

### 1. Firebase Security Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy security rules
firebase deploy --only firestore:rules
```

### 2. Firestore Indexes
```bash
# Deploy indexes
firebase deploy --only firestore:indexes
```

### 3. Environment Validation
```bash
# Validate environment variables
npm run validate-env
```

## 🏗️ Build Process

### 1. Development Build
```bash
# Start development server
npm start

# Or with specific platform
npm run android
npm run ios
npm run web
```

### 2. Production Build
```bash
# Build for production
npm run build

# For specific platforms
npm run build:android
npm run build:ios
npm run build:web
```

## 📱 Platform-Specific Deployment

### Web Deployment
```bash
# Build for web
npm run build:web

# Deploy to Firebase Hosting (optional)
firebase deploy --only hosting

# Or deploy to Vercel/Netlify
# Follow their respective deployment guides
```

### Android Deployment
```bash
# Build APK
npm run build:android

# Or build AAB for Play Store
npm run build:android --variant release
```

### iOS Deployment
```bash
# Build for iOS
npm run build:ios

# Submit to App Store
npm run submit:ios
```

## 🔐 Security Checklist

### Pre-Deployment
- [ ] Environment variables configured correctly
- [ ] Debug mode disabled in production
- [ ] Firebase security rules deployed
- [ ] Firestore indexes deployed
- [ ] SSL/TLS enabled
- [ ] Dependencies updated and scanned
- [ ] Sensitive files in .gitignore
- [ ] Error handling configured properly

### Post-Deployment
- [ ] Test authentication flow
- [ ] Test rate limiting
- [ ] Test input validation
- [ ] Test error handling
- [ ] Monitor logs for security events
- [ ] Test backup and recovery

## 📊 Monitoring & Logging

### Firebase Analytics
```javascript
// Analytics is automatically enabled if configured
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

### Crashlytics
```javascript
// Crashlytics for error reporting
EXPO_PUBLIC_ENABLE_CRASHLYTICS=true
```

### Performance Monitoring
```javascript
// Performance monitoring
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Firebase Configuration Error
```
Error: Missing required environment variable
```
**Solution**: Check that all Firebase environment variables are set correctly

#### 2. Security Rules Error
```
Error: Permission denied
```
**Solution**: Deploy Firestore security rules with `firebase deploy --only firestore:rules`

#### 3. Build Error
```
Error: Environment variable not found
```
**Solution**: Ensure `.env` file exists and contains all required variables

#### 4. Authentication Error
```
Error: Firebase Auth domain not configured
```
**Solution**: Check `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` in environment variables

## 🔄 Maintenance

### Regular Tasks
- **Monthly**: Update dependencies
- **Quarterly**: Review security rules
- **Annually**: Rotate environment variables
- **Weekly**: Review access logs
- **Daily**: Monitor performance

### Security Updates
1. Monitor for security advisories
2. Update dependencies regularly
3. Review and update security rules
4. Monitor authentication patterns
5. Review error logs for security issues

## 📞 Support

### Getting Help
- Check the [Security Documentation](./SECURITY.md)
- Review Firebase documentation
- Check Expo documentation
- Create GitHub issue for bugs

### Emergency Contacts
- Security issues: Follow responsible disclosure in SECURITY.md
- Critical bugs: Create GitHub issue with "critical" label
- Performance issues: Check monitoring dashboard

## 🎯 Performance Optimization

### App Performance
- Enable performance monitoring
- Use lazy loading for components
- Implement proper caching
- Optimize images and assets

### Database Performance
- Monitor Firestore usage
- Optimize queries
- Use caching where appropriate
- Review index usage

### Network Performance
- Enable compression
- Use CDN for static assets
- Implement offline support
- Monitor network requests

## 💻 Development Workflow

### Branch Strategy
```bash
# Main branch for production
git checkout main

# Development branch
git checkout -b develop

# Feature branches
git checkout -b feature/your-feature

# Hotfix branches
git checkout -b hotfix/critical-fix
```

### Testing
```bash
# Run all tests
npm test

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 📈 Scaling Considerations

### Database Scaling
- Monitor Firestore usage
- Implement data archiving
- Use subcollections for large datasets
- Consider regional deployments

### Application Scaling
- Use CDN for static assets
- Implement caching strategies
- Monitor memory usage
- Consider code splitting

### Security Scaling
- Implement advanced monitoring
- Use security scanning tools
- Regular security audits
- Implement logging and alerting

---

## 🚀 Quick Start Commands

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/paramiyonet.git
cd paramiyonet
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Setup Firebase
firebase login
firebase init
firebase deploy --only firestore:rules

# 4. Start development
npm start

# 5. Build for production
npm run build
```

---

**Note**: This is a public repository. Never commit sensitive information like API keys, passwords, or personal data. Always use environment variables for sensitive configuration.

**Last Updated**: December 2024
**Version**: 1.0.0 