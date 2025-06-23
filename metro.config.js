const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Firebase Auth için .cjs dosyalarını destekle
defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false;

// Web için assets desteği
defaultConfig.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');

module.exports = defaultConfig; 