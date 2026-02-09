# Build Issues and Solutions

This document tracks common build issues encountered and their solutions for RouteMate.

## Issue 1: React Native Maps Module Not Found

### Error Message
```
ERROR [Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found.]
```

### Root Cause
- `react-native-maps` was installed incorrectly
- Native modules not properly linked
- Attempting to use Expo Go instead of development build

### Solution
1. Install packages correctly:
```bash
npx expo install react-native-maps expo-maps
```

2. Remove incorrect plugin from `app.config.js` (react-native-maps doesn't have a config plugin)

3. Use development build instead of Expo Go:
```bash
npx expo run:ios
# or
npx expo run:android
```

### Prevention
- Always use `npx expo install` for Expo-compatible packages
- Don't use Expo Go for apps with custom native modules
- Run `npx expo-doctor` before building

---

## Issue 2: Package Version Mismatch Warning

### Error Message
```
✖ Check that packages match versions required by installed Expo SDK
⚠️ Minor version mismatches
package            expected  found   
react-native-maps  1.20.1    1.27.1
```

### Root Cause
- Package installed with `npm install` instead of `npx expo install`
- Cached version information

### Solution
1. Verify correct versions are installed:
```bash
npm list react-native-maps expo-maps
```

2. Reinstall if needed:
```bash
npm uninstall react-native-maps
npx expo install react-native-maps expo-maps
```

3. Run doctor to verify:
```bash
npx expo-doctor
```

### Prevention
- Always use `npx expo install` for native modules
- Run `npx expo install --check` regularly
- Check `npx expo-doctor` before building for production

---

## Issue 3: Config Plugin Error

### Error Message
```
PluginError: Unable to resolve a valid config plugin for react-native-maps.
```

### Root Cause
- `react-native-maps` added to plugins array in `app.config.js`
- `react-native-maps` doesn't provide a config plugin

### Solution
Remove `"react-native-maps"` from the plugins array in `app.config.js`:

```javascript
// INCORRECT:
plugins: [
  "expo-router",
  "react-native-maps",  // ❌ Remove this
  "expo-location"
]

// CORRECT:
plugins: [
  "expo-router",
  "expo-location"
]
```

The package still works, but doesn't need a plugin entry. The `expo-maps` package handles compatibility.

### Prevention
- Check package documentation before adding to plugins
- Not all packages need plugin configuration
- Run `npx expo-doctor` to catch config issues

---

## Issue 4: Maps Not Displaying

### Symptoms
- App runs but map shows blank/gray screen
- No error messages

### Possible Causes & Solutions

#### A. Using Expo Go
**Solution**: Use development build
```bash
npx expo run:ios  # or run:android
```

#### B. Missing Google Maps API Key
**Solution**: Add to `.env.local`
```bash
GOOGLE_MAPS_API_KEY=your_api_key_here
```

#### C. API Key Not Configured
**Solution**: Verify `app.config.js` reads from environment:
```javascript
ios: {
  config: {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  }
},
android: {
  config: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    }
  }
}
```

#### D. Google Maps SDK Not Enabled
**Solution**: 
1. Go to Google Cloud Console
2. Enable "Maps SDK for Android" and "Maps SDK for iOS"
3. Wait a few minutes for propagation

#### E. API Key Restrictions Too Strict
**Solution**: 
- Temporarily remove all restrictions to test
- Add restrictions back gradually

---

## Issue 5: Build Fails on First Run

### Error Message
```
error: Build input file cannot be found
```

### Root Cause
- Native dependencies not installed
- Pods not installed (iOS)
- Gradle cache issues (Android)

### Solution

#### iOS:
```bash
cd ios
pod install
cd ..
npx expo run:ios --clear
```

#### Android:
```bash
cd android
./gradlew clean
cd ..
npx expo run:android --clear
```

### Prevention
- Let Expo handle the build process
- Don't manually modify ios/android folders unless necessary
- Use `--clear` flag when having issues

---

## Issue 6: Environment Variables Not Loading

### Symptoms
- `process.env.GOOGLE_MAPS_API_KEY` is undefined
- Maps API key not working
- Firebase connection fails

### Solution
1. Verify `.env.local` file exists in project root
2. Restart Expo dev server with clean cache:
```bash
npx expo start -c
```

3. For builds, ensure EAS Build has environment variables configured:
```bash
eas secret:push --scope project --env-file .env.local
```

4. Check file format (no quotes needed):
```bash
# CORRECT:
GOOGLE_MAPS_API_KEY=AIzaSyDxxxxx

# INCORRECT:
GOOGLE_MAPS_API_KEY="AIzaSyDxxxxx"
```

### Prevention
- Always restart dev server after changing `.env.local`
- Use `eas secret:list` to verify secrets in EAS Build
- Never commit `.env.local` to git

---

## Issue 7: Production Build Warnings

### Warning Message
```
Running "expo doctor"
16/17 checks passed. 1 checks failed.
```

### Solution
Always run before building:
```bash
# Check for issues
npx expo-doctor

# Fix dependencies
npx expo install --check

# Verify everything is correct
npx expo-doctor --verbose
```

### Prevention
- Run `npx expo-doctor` before every production build
- Keep packages updated with `npx expo install --fix`
- Review warnings even if build succeeds

---

## General Troubleshooting Steps

### Step 1: Clean Everything
```bash
# Clear all caches
rm -rf node_modules package-lock.json
npm install

# Clear Expo cache
npx expo start -c

# Clean native builds
rm -rf ios android
npx expo prebuild --clean
```

### Step 2: Verify Environment
```bash
# Check versions
node --version  # Should be 16+
npm --version
npx expo --version

# Check packages
npx expo-doctor
npx expo install --check
```

### Step 3: Rebuild
```bash
# For development
npx expo run:ios --clear
# or
npx expo run:android --clear

# For production
eas build --platform all --clear-cache
```

---

## EAS Build Specific Issues

### Issue: Build Fails on EAS
**Solution**: Check build logs and common issues:

1. **Environment Variables Missing**
```bash
eas secret:push --scope project --env-file .env.local
```

2. **Package Version Mismatch**
```bash
npx expo install --fix
git add package.json package-lock.json
git commit -m "Fix package versions"
```

3. **Cache Issues**
```bash
eas build --platform all --clear-cache
```

### Issue: Build Succeeds but App Crashes
**Solution**:
1. Test with development build first
2. Check Sentry/error logs
3. Verify all environment variables are set
4. Test on real device before submitting

---

## Diagnostic Commands

Run these to gather information for troubleshooting:

```bash
# Check Expo environment
npx expo-doctor --verbose

# List all packages and versions
npm list --depth=0

# Check for outdated packages
npm outdated

# Verify native module linking (after build)
npx react-native info

# Check environment variables
env | grep -E "(GOOGLE_MAPS|FIREBASE|WALLET)"
```

---

## When to Use Each Build Command

### Development (Daily Work)
```bash
npx expo run:ios      # Fastest for development
npx expo run:android
```

### Testing Production
```bash
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

### App Store Submission
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Support Resources

- Expo Documentation: https://docs.expo.dev/
- React Native Maps: https://github.com/react-native-maps/react-native-maps
- EAS Build Issues: https://expo.dev/eas
- Stack Overflow: Tag with `expo`, `react-native-maps`

---

## Reporting New Issues

When reporting a new build issue, include:

1. Error message (full text)
2. Platform (iOS/Android/both)
3. Build type (development/production)
4. Output of `npx expo-doctor --verbose`
5. Output of `npm list react-native-maps expo-maps`
6. Package.json dependencies
7. Relevant parts of app.config.js

---

**Last Updated**: 2024
**Maintained By**: RouteMate Development Team