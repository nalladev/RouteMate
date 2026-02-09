# RouteMate - Quick Command Reference

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Setup Environment Variables
```bash
# Create .env.local file
touch .env.local

# Add required variables (see ENV_SETUP.md for details)
```

## 📱 Running the App

### Development Build (Required for Maps)

#### iOS
```bash
# Build and run on iOS Simulator
npx expo run:ios

# Build with clean cache
npx expo run:ios --clear

# Run on specific device
npx expo run:ios --device
```

#### Android
```bash
# Build and run on Android Emulator
npx expo run:android

# Build with clean cache
npx expo run:android --clear

# Run on specific device
npx expo run:android --device
```

### Development Server Only
```bash
# Start Expo dev server (for non-map testing with Expo Go)
npm start

# Start with clean cache
npm start -- --clear

# Start with tunnel (for testing on physical device)
npm start -- --tunnel
```

## 🔧 Development Tools

### TypeScript
```bash
# Check TypeScript errors
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npx eslint . --fix
```

### Clear Cache
```bash
# Clear Expo cache
npx expo start -c

# Clear Metro bundler cache
npx react-native start --reset-cache

# Clear all caches
rm -rf node_modules .expo ios android
npm install
npx expo prebuild --clean
```

## 🏗️ Build Commands

### Prebuild (Generate Native Folders)
```bash
# Generate iOS and Android folders
npx expo prebuild

# Clean and regenerate
npx expo prebuild --clean
```

### Production Builds with EAS

#### Setup EAS
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS for your project
eas build:configure
```

#### Build for App Stores
```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Build for Google Play Store
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production
```

#### Development Builds with EAS
```bash
# Build development client for iOS
eas build --platform ios --profile development

# Build development client for Android
eas build --platform android --profile development
```

### Local Production Builds
```bash
# iOS Release build
npx expo run:ios --configuration Release

# Android Release build
npx expo run:android --variant release
```

## 🧪 Testing & Debugging

### Test API Endpoints
```bash
# Test login endpoint
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile": "+1234567890", "password": "testpassword"}'

# Test with token
curl http://localhost:8081/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Debug Tools
```bash
# Open React DevTools
npx react-devtools

# View logs in real-time
npx expo start --dev-client
```

## 🔑 Environment Setup

### Generate Secure Keys
```bash
# Generate wallet encryption key (32-byte hex)
openssl rand -hex 32

# Generate password hashing seed
openssl rand -base64 32

# Base64 encode Firebase service account
cat service-account.json | base64 -w 0
```

## 📦 Package Management

### Update Dependencies
```bash
# Update all packages
npm update

# Update Expo SDK
npx expo install --fix

# Install specific Expo SDK version
npx expo install expo@latest
```

### Add New Dependencies
```bash
# Install Expo-compatible package
npx expo install package-name

# Install regular npm package
npm install package-name
```

## 🗄️ Firebase Operations

### Initialize Firestore (Manual)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore in project
firebase init firestore
```

### Deploy Firebase Rules
```bash
firebase deploy --only firestore:rules
```

## 🔍 Troubleshooting Commands

### Fix Common Issues
```bash
# Fix iOS pods
cd ios && pod install && cd ..

# Clean Android build
cd android && ./gradlew clean && cd ..

# Reset Metro bundler
npx react-native start --reset-cache

# Complete reset
rm -rf node_modules package-lock.json
npm install
```

### Check Environment
```bash
# Check Node version
node --version

# Check npm version
npm --version

# Check Expo CLI version
npx expo --version

# Check React Native info
npx react-native info

# Verify environment variables are loaded
env | grep GOOGLE_MAPS_API_KEY
```

## 📊 Project Info

### View Project Structure
```bash
# List all files
tree -I 'node_modules|.expo|ios|android'

# Count lines of code
find . -name '*.ts' -o -name '*.tsx' | xargs wc -l
```

### Check Package Info
```bash
# List installed packages
npm list --depth=0

# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit
```

## 🚀 Deployment

### Submit to App Stores with EAS
```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android

# Submit to both
eas submit --platform all
```

## 📝 Common Workflows

### Fresh Start
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp ENV_SETUP.md .env.local
# Edit .env.local with your keys

# 3. Build and run
npx expo run:ios  # or run:android
```

### Daily Development
```bash
# Start development
npx expo run:ios  # Builds and runs

# Hot reload is automatic, just save files
```

### Before Committing
```bash
# Check TypeScript
npx tsc --noEmit

# Run linter
npm run lint

# Clear sensitive data
git status  # Verify .env.local is not tracked
```

### Production Release
```bash
# 1. Update version in app.config.js
# 2. Build production app
eas build --platform all --profile production

# 3. Submit to stores
eas submit --platform all
```

## 🆘 Emergency Commands

### App Won't Start
```bash
npx expo start -c
npx expo prebuild --clean
npx expo run:ios
```

### Maps Not Showing
```bash
# Verify you're NOT using Expo Go
# Must use development build:
npx expo run:ios  # or run:android
```

### Module Not Found Errors
```bash
rm -rf node_modules
npm install
npx expo prebuild --clean
npx expo run:ios
```

### Environment Variables Not Loading
```bash
# Restart with clean cache
npx expo start -c

# Verify file exists
cat .env.local

# Check file name is exactly .env.local
ls -la | grep env
```

## 📚 Documentation Links

- Main README: `README.md`
- Setup Guide: `docs/SETUP.md`
- Quick Start: `docs/QUICKSTART.md`
- API Docs: `openapi.yaml`
- Environment Setup: `ENV_SETUP.md`
- Implementation Guide: `docs/API_IMPLEMENTATION.md`
- Project Summary: `docs/PROJECT_SUMMARY.md`

## 💡 Pro Tips

- Always use `npx expo run:ios|android` for development (not Expo Go)
- Keep `.env.local` secure and never commit it
- Clear cache if you see weird errors: `npx expo start -c`
- Use EAS Build for production apps
- Test on real devices before submitting to stores
- Monitor Firebase usage to avoid unexpected costs

---

**Need help?** Check the troubleshooting sections in `docs/SETUP.md` or `docs/QUICKSTART.md`
