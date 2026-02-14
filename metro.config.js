const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude API routes from native builds
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For native platforms, return empty module for any app/api imports
  if (platform === 'android' || platform === 'ios') {
    if (moduleName.includes('/app/api/') || moduleName.includes('\\app\\api\\')) {
      return {
        type: 'empty',
      };
    }
  }

  // Exclude react-native-maps on web
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'empty',
    };
  }

  // Exclude react-native-webview on web
  if (platform === 'web' && moduleName === 'react-native-webview') {
    return {
      type: 'empty',
    };
  }

  // Use default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;