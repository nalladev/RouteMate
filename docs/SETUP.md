# RouteMate Setup Guide

This guide will walk you through setting up RouteMate from scratch.

## Prerequisites

Before you begin, ensure you have the following:

- Node.js 16 or higher
- npm or yarn package manager
- Expo CLI (`npm install -g expo-cli`)
- A Firebase account
- A Solana wallet (for testing)
- Phone.email account (for OTP authentication)
- Didit account (for KYC verification)

## Step 1: Clone and Install Dependencies

```bash
cd routemate
npm install

# Install maps packages
npx expo install react-native-maps expo-maps
```

## Step 2: Firebase Setup

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: "RouteMate"
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2.2 Enable Firestore

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Select "Start in production mode"
4. Choose a location close to your users
5. Click "Enable"

### 2.3 Get Service Account Key

1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Base64 encode the file:
   ```bash
   cat service-account.json | base64 -w 0
   ```
5. Copy the encoded string for later use

### 2.4 Configure Firestore Security Rules

In Firestore Console, go to Rules and update:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /rideconnections/{connectionId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 3: Environment Variables

Create a `.env.local` file in the root directory:

```bash
touch .env.local
```

Add the following variables:

```
# Firebase
FIREBASE_SERVICE_ACCOUNT_ENCODED=<base64-encoded-service-account-json>

# Phone.email API (for OTP authentication)
PHONE_EMAIL_API_KEY=<your-phone-email-api-key>

# Didit API (for KYC verification)
DIDIT_API_KEY=<your-didit-api-key>

# Google Maps API
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>

# Wallet Security
WALLET_ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
PASSWORD_HASHING_SEED=<generate-with-openssl-rand-base64-32>
```

### Generate Secure Keys

```bash
# Generate wallet encryption key
openssl rand -hex 32

# Generate password hashing seed
openssl rand -base64 32
```

## Step 4: Phone.email Setup

1. Sign up at [Phone.email](https://phone.email/)
2. Create a new project
3. Get your API key from the dashboard
4. Add the API key to `.env.local`

**Note:** The current implementation has placeholder code for phone.email integration. You'll need to implement the actual API calls according to their documentation.

## Step 5: Didit KYC Setup

1. Sign up at [Didit](https://didit.com/)
2. Create a new project for KYC verification
3. Get your API credentials
4. Add the API key to `.env.local`

**Note:** The current implementation has placeholder code for Didit integration. You'll need to implement the actual API calls according to their documentation.

## Step 6: Google Maps Setup

### 6.1 Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps SDK for Android and iOS
4. Go to Credentials > Create Credentials > API Key
5. Copy the API key

### 6.2 Configure API Key

Add your Google Maps API key to `.env.local`:

```bash
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY
```

The app uses `app.config.js` which automatically reads the API key from environment variables and configures it for both iOS and Android.

### 6.3 Restrict API Key (Recommended)

In Google Cloud Console:
1. Click on your API key
2. Under "Application restrictions", select appropriate platform
3. Under "API restrictions", select "Restrict key"
4. Select only required APIs (Maps SDK for Android/iOS)

## Step 7: Solana Wallet Setup

### For Development (Devnet)

1. The app automatically uses Solana devnet (`https://api.devnet.solana.com`)
2. Each user gets a wallet automatically on signup
3. Fund test wallets using [Solana Faucet](https://faucet.solana.com/)

### For Production (Mainnet)

1. Update RPC URL in `lib/wallet.ts`:
   ```typescript
   const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
   ```
2. Consider using a paid RPC provider for better performance

## Step 8: Run the Application

**Important:** React Native Maps requires native modules and won't work with Expo Go. You must build a development client.

### Build and Run Development Client

#### For iOS Simulator

```bash
npx expo run:ios
```

This will:
1. Generate native iOS project
2. Install CocoaPods dependencies
3. Build the app
4. Launch in iOS Simulator

#### For Android Emulator

```bash
npx expo run:android
```

This will:
1. Generate native Android project
2. Install Gradle dependencies
3. Build the app
4. Launch in Android Emulator

#### First-Time Setup Notes

- **iOS**: Requires Xcode installed (macOS only)
- **Android**: Requires Android Studio and Android SDK
- Build time: 5-10 minutes on first run
- Subsequent builds are much faster

### Alternative: Test Without Maps

If you want to quickly test other features without maps:

```bash
npm start
```

Then scan QR code with Expo Go app. Note: Map screen will not work, but login/auth/API endpoints can be tested.

## Step 9: Testing the API

### Using Postman

1. Import `openapi.yaml` into Postman
2. Create a new environment
3. Add variable `baseUrl` = `http://localhost:8081`
4. Test endpoints starting with authentication

### Create Test User

```bash
curl -X POST http://localhost:8081/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "otpToken": "test-token",
    "password": "testpassword123"
  }'
```

**Note:** You'll need to implement actual phone.email OTP flow for this to work.

### Test Login

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+1234567890",
    "password": "testpassword123"
  }'
```

## Step 10: Initial Database Setup

### Create Test Users (Optional)

You can manually create test users in Firestore Console:

1. Go to Firestore Database
2. Create collection `users`
3. Add document with auto-ID
4. Add fields:
   - `Name`: "Test Driver"
   - `Mobile`: "+1234567890"
   - `PasswordHash`: (use bcrypt to hash "password123")
   - `Session`: { token: "" }
   - `Wallet`: { address: "...", EncryptedKey: "..." }
   - `state`: "idle"
   - `IsKycVerified`: false

## Troubleshooting

### Location Permission Issues

**iOS:**
- Go to Settings > Privacy > Location Services
- Find RouteMate and select "Always" or "While Using"

**Android:**
- Go to Settings > Apps > RouteMate > Permissions
- Enable Location permission

### Firebase Connection Failed

- Verify `FIREBASE_SERVICE_ACCOUNT_ENCODED` is correct
- Check Firebase project has Firestore enabled
- Ensure service account has proper permissions

### Map Not Showing

- **Most Common**: Using Expo Go instead of development build
  - Solution: Run `npx expo run:ios` or `npx expo run:android`
- Verify `GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Check if Maps SDK is enabled in Google Cloud Console
- Ensure both `react-native-maps` and `expo-maps` are installed
- Clear cache and rebuild: `npx expo run:ios --clear` or `npx expo run:android --clear`

### Wallet Issues

- Verify `WALLET_ENCRYPTION_KEY` is set
- Check Solana RPC endpoint is accessible
- Ensure sufficient devnet SOL for testing

### API Request Failing

- Check if `API_URL` in `utils/api.ts` is correct
- Verify authentication token is being sent
- Check network connectivity
- View logs in terminal for error messages

## Development Tips

### Hot Reload

Expo supports hot reloading. Simply save your files and changes will reflect immediately in the app.

### Debugging

- Press `m` in terminal to open developer menu on device
- Enable Remote JS Debugging
- Use React Native Debugger for better experience

### Backend Logs

All API logs will appear in your terminal where you ran `npm start`.

### Database Queries

Monitor Firestore queries in Firebase Console under "Firestore Database".

## Production Deployment

### Using EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Using Local Builds

```bash
# Build for iOS
npx expo run:ios --configuration Release

# Build for Android
npx expo run:android --variant release
```

### Environment Variables for Production

Set up environment variables in your CI/CD pipeline or hosting platform:
- Never commit `.env.local` to version control
- Use secure secret management
- Rotate keys regularly

## Security Checklist

- [ ] Firebase security rules are properly configured
- [ ] API keys are not committed to git
- [ ] Wallet encryption key is strong and secure
- [ ] Password hashing seed is random
- [ ] Google Maps API key is restricted
- [ ] Implement rate limiting on API endpoints
- [ ] Enable Firebase App Check
- [ ] Use HTTPS in production
- [ ] Implement proper error handling
- [ ] Add logging and monitoring

## Next Steps

1. Implement actual phone.email integration
2. Implement actual Didit KYC integration
3. Add Google Places API for destination search
4. Implement push notifications for ride updates
5. Add analytics and crash reporting
6. Set up CI/CD pipeline
7. Write unit and integration tests
8. Configure production Solana RPC
9. Implement proper error tracking (Sentry)
10. Add user support chat

## Getting Help

- Check the main README.md for API documentation
- Review openapi.yaml for endpoint specifications
- Check Firebase documentation for Firestore issues
- Review Expo documentation for mobile-specific issues

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [React Navigation](https://reactnavigation.org/)