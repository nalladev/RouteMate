const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude native-only modules from web builds
config.resolver.resolveRequest = (context, moduleName, platform) => {
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