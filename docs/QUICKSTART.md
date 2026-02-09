# RouteMate Quick Start Guide

Get RouteMate up and running in 10 minutes.

## Prerequisites

- Node.js 16+ installed
- npm installed
- Expo CLI: `npm install -g expo-cli`

## 1. Install Dependencies

```bash
cd routemate
npm install
```

## 2. Set Up Environment Variables

Create `.env.local` file in the root directory:

```bash
# Minimum required for local development
FIREBASE_SERVICE_ACCOUNT_ENCODED=your_base64_encoded_firebase_key
WALLET_ENCRYPTION_KEY=your_32_character_random_key
PASSWORD_HASHING_SEED=your_random_seed

# Optional (can be left empty for now)
PHONE_EMAIL_API_KEY=
DIDIT_API_KEY=
```

### Quick Generate Keys

```bash
# Generate wallet encryption key
openssl rand -hex 32

# Generate password seed
openssl rand -base64 32
```

## 3. Firebase Setup (5 minutes)

1. Go to https://console.firebase.google.com/
2. Create new project: "RouteMate"
3. Enable Firestore Database
4. Go to Project Settings > Service Accounts
5. Generate new private key (downloads JSON)
6. Base64 encode it:
   ```bash
   cat service-account.json | base64 -w 0
   ```
7. Copy to `.env.local` as `FIREBASE_SERVICE_ACCOUNT_ENCODED`

## 4. Configure Google Maps

Edit `app.json` and add your Google Maps API key:

```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

Get API key from: https://console.cloud.google.com/

## 5. Start the App

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## 6. Create Test User

Since phone.email integration is not implemented yet, create a test user directly in Firestore:

1. Go to Firebase Console > Firestore Database
2. Create collection: `users`
3. Add document with auto-ID:
   ```json
   {
     "Name": "Test User",
     "Mobile": "+1234567890",
     "PasswordHash": "$2b$10$...",
     "Session": { "token": "" },
     "Wallet": {
       "address": "test_address",
       "EncryptedKey": "test_key"
     },
     "state": "idle",
     "IsKycVerified": false
   }
   ```

### Generate Password Hash

Use this Node.js script to generate password hash:

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('testpassword', 10, (err, hash) => {
  console.log(hash);
});
```

Or use an online bcrypt generator.

## 7. Login

1. Open the app
2. Enter mobile: `+1234567890`
3. Enter password: `testpassword` (or whatever you used)
4. Click Login

## 8. Test Basic Features

### As Passenger:
1. Allow location permissions
2. Tap search bar (will show placeholder)
3. Toggle to Passenger mode
4. View map with your location

### As Driver:
1. Toggle to Driver mode
2. Set a destination
3. Wait for ride requests

## Current Limitations

Due to placeholder integrations:

- **OTP Login**: Not functional (needs phone.email)
- **Signup**: Not functional (needs phone.email)
- **KYC**: Not functional (needs Didit)
- **Destination Search**: Placeholder (needs Google Places)
- **Payments**: May fail without sufficient SOL in wallet

## Fund Test Wallet

To test payments:

1. Go to Account tab
2. Copy wallet address
3. Send devnet SOL from: https://faucet.solana.com/
4. Refresh balance

## API Testing

Test API endpoints using the OpenAPI spec:

```bash
# Import openapi.yaml into Postman
# Or use curl:

curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+1234567890",
    "password": "testpassword"
  }'
```

## Troubleshooting

### Location Not Working
- Enable location permissions in device settings
- Check if location services are enabled
- Try on physical device (simulator may have issues)

### Map Not Showing
- Verify Google Maps API key is correct
- Check if Maps SDK is enabled in Google Cloud Console
- Clear cache: `expo start -c`

### Firebase Connection Error
- Verify service account JSON is correctly base64 encoded
- Check Firestore is enabled in Firebase Console
- Verify project ID matches

### App Won't Start
```bash
# Clear cache and restart
expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Next Steps

Once basic setup is working:

1. Implement phone.email integration (see `docs/API_IMPLEMENTATION.md`)
2. Implement Didit KYC integration
3. Add Google Places for destination search
4. Test ride flow end-to-end
5. Review security settings
6. Set up proper monitoring

## Getting Help

- Check `README.md` for complete documentation
- See `docs/SETUP.md` for detailed setup instructions
- Review `docs/API_IMPLEMENTATION.md` for integration guides
- Check `openapi.yaml` for API specifications

## Development Mode Features

- Hot reload enabled
- Console logs in terminal
- React DevTools available
- Debug menu: Shake device or Cmd+D (iOS) / Cmd+M (Android)

## Useful Commands

```bash
# Start with cache clear
npm start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Check diagnostics
npx tsc --noEmit

# Format code (if configured)
npm run lint
```

## Ready to Deploy?

See `docs/SETUP.md` section "Production Deployment" for:
- Building iOS/Android apps
- Setting up production environment variables
- Configuring mainnet Solana
- Implementing real API integrations
- Security hardening

---

**You're all set! Start building your ride-sharing app! 🚗**