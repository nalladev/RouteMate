const appVersion = process.env.APP_VERSION || "1.0.0";
const parsedVersionCode = Number.parseInt(process.env.APP_VERSION_CODE || "1", 10);
const androidVersionCode = Number.isNaN(parsedVersionCode) ? 1 : parsedVersionCode;

module.exports = {
  expo: {
    name: "RouteMate",
    slug: "routemate",
    version: appVersion,
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "routemate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      associatedDomains: [
        "applinks:routemate.tech",
        "applinks:www.routemate.tech"
      ],
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "RouteMate needs your location to show nearby drivers and track rides.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "RouteMate needs your location to provide real-time ride tracking and match you with drivers.",
        NSLocationAlwaysUsageDescription: "RouteMate needs your location in the background to track active rides.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      bundleIdentifier: "tech.routemate.app"
    },
    android: {
      versionCode: androidVersionCode,
      package: "tech.routemate.app",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "INTERNET"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "routemate.tech", pathPrefix: "/community/join" },
            { scheme: "https", host: "www.routemate.tech", pathPrefix: "/community/join" },
            { scheme: "https", host: "routemate.tech", pathPrefix: "/ride-share" },
            { scheme: "https", host: "www.routemate.tech", pathPrefix: "/ride-share" }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      usesCleartextTraffic: true
    },
    web: {
      output: "server",
      favicon: "./assets/icon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow RouteMate to use your location to track rides and match with drivers.",
          locationAlwaysPermission: "Allow RouteMate to track your location in the background during active rides.",
          locationWhenInUsePermission: "Allow RouteMate to access your location while using the app."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow RouteMate to access your camera for identity verification (KYC).",
          microphonePermission: "Allow RouteMate to access your microphone for the verification process.",
          recordAudioAndroid: true
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "0163e419-a387-43bb-b94f-eb338694141c"
      },
      appUrl: "https://www.routemate.tech",
      phoneEmailClientId: "11787517661743701617"
    },
    owner: "octavian007"
  }
};
