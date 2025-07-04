const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Firebase Auth için .cjs dosyalarını destekle
defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false;

// Web için assets desteği
defaultConfig.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');

// Production build optimizasyonları
if (process.env.NODE_ENV === 'production') {
  // Minification ve obfuscation için transformer ayarları
  defaultConfig.transformer = {
    ...defaultConfig.transformer,
    minifierConfig: {
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
      },
      output: {
        ascii_only: true,
        beautify: false,
        comments: false,
      },
      sourceMap: false,
      toplevel: false,
      warnings: false,
    },
  };
}

module.exports = defaultConfig; 