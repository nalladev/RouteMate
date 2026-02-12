module.exports = {
  expo: {
    name: "routemate",
    slug: "routemate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "routemate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "RouteMate needs your location to show nearby drivers and track rides.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "RouteMate needs your location to provide real-time ride tracking and match you with drivers.",
        NSLocationAlwaysUsageDescription: "RouteMate needs your location in the background to track active rides.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      },
      // No Google Maps API key needed - using native maps
    },
    android: {
      package: "tech.routemate.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "INTERNET"
      ],
      // No Google Maps API key needed - using native maps
      usesCleartextTraffic: true
    },
    web: {
      output: "server",
      favicon: "./assets/images/favicon.png"
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
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
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
      }
    },
    owner: "octavian007"
  }
};
