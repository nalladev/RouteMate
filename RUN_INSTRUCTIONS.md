# Running RouteMate

## Important: Development Build Required

**This app CANNOT run in Expo Go** because it uses `react-native-maps` which requires native code.

You MUST use a development build.

## Option 1: Run on Android (Recommended)

```bash
npx expo run:android
```

This will:
1. Build the Android native code
2. Install the development build on your device/emulator
3. Start the Metro bundler
4. Launch the app

## Option 2: Run on iOS (Mac only)

```bash
npx expo run:ios
```

## Option 3: Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build development client for Android
eas build --profile development --platform android

# Build development client for iOS
eas build --profile development --platform ios
```

## Troubleshooting

If you deleted `node_modules`:
1. Run `npm install`
2. Run `npx expo prebuild --clean` (generates native folders)
3. Run `npx expo run:android` or `npx expo run:ios`

## Why Not Expo Go?

Expo Go is a sandbox that only supports certain Expo modules. Since we use:
- react-native-maps (requires Google Play Services/Apple MapKit)
- Custom native configurations

We need a development build which includes these native dependencies.
