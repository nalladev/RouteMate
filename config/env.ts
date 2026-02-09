import Constants from 'expo-constants';

// Get the Google Maps API Key from expo config
const getGoogleMapsApiKey = (): string => {
  // Try to get from Android config
  const androidKey = Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  if (androidKey && typeof androidKey === 'string') {
    return androidKey;
  }

  // Try to get from iOS config
  const iosKey = Constants.expoConfig?.ios?.config?.googleMapsApiKey;
  if (iosKey && typeof iosKey === 'string') {
    return iosKey;
  }

  // Fallback to empty string
  return '';
};

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

export const config = {
  GOOGLE_MAPS_API_KEY,
};