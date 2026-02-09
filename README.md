# RouteMate

A ride-sharing application built with Expo and React Native, featuring real-time location tracking, route matching, and Solana-based payments.

## ⚠️ Important: Development Build Required

**React Native Maps requires native modules and will NOT work with Expo Go.**

You must build a development client to run this app:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

See [Installation](#installation) section for complete setup instructions.

## Features

- Password and OTP-based authentication
- Real-time location tracking
- Intelligent driver-passenger matching based on route overlap
- Driver and Passenger modes
- Ride request management with auto-expiry
- OTP verification for pickup confirmation
- Solana wallet integration for payments
- Ride history tracking
- KYC verification support

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Firestore
- Solana devnet/mainnet access
- Phone.email API key (for OTP authentication)
- Didit API credentials (for KYC verification)

## Installation

1. Clone the repository:
```bash
cd routemate
npm install
```

2. Set up environment variables in `.env.local`:
```
FIREBASE_SERVICE_ACCOUNT_ENCODED=<base64-encoded-firebase-service-account-json>
PHONE_EMAIL_API_KEY=<your-phone-email-api-key>
DIDIT_API_KEY=<your-didit-api-key>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
WALLET_ENCRYPTION_KEY=<random-32-character-string>
PASSWORD_HASHING_SEED=<random-string>
```

3. Build and run the development client (required for react-native-maps):

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

**Note:** React Native Maps requires native modules and won't work with Expo Go. You must use a development build.

## Environment Variables Setup

### FIREBASE_SERVICE_ACCOUNT_ENCODED
1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate new private key (downloads JSON file)
3. Base64 encode the JSON:
```bash
cat service-account.json | base64 -w 0
```
4. Copy the encoded string to `.env.local`

### WALLET_ENCRYPTION_KEY
Generate a secure random key:
```bash
openssl rand -hex 32
```

### PASSWORD_HASHING_SEED
Generate a random seed:
```bash
openssl rand -base64 32
```

## Firestore Database Structure

### Collections

#### users
```
{
  Id: string (auto-generated)
  Name: string
  Mobile: string
  PasswordHash: string
  Session: { token: string }
  Wallet: { address: string, EncryptedKey: string }
  state: 'driving' | 'riding' | 'idle'
  LastLocation: { lat: number, lng: number }
  Destination: { lat: number, lng: number }
  KycData: any
  IsKycVerified: boolean
}
```

#### rideconnections
```
{
  Id: string (auto-generated)
  PassengerId: string
  DriverId: string
  PickupLocation: { lat: number, lng: number }
  Destination: { lat: number, lng: number }
  Distance: number
  Fare: number
  RideTotalTime: number
  OtpCode: string
  State: 'requested' | 'accepted' | 'rejected' | 'picked_up' | 'completed'
  CreatedAt: Timestamp
  ExpiresAt: Timestamp
  CompletedAt: Timestamp
  PaymentTx: string
}
```

## API Documentation

See `openapi.yaml` for complete API specification.

### Base URL
- Development: `http://localhost:8081`

### Authentication
All endpoints (except auth endpoints) require Bearer token:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Password login
- `POST /api/auth/otp-login` - OTP login
- `POST /api/auth/signup` - Create account
- `POST /api/auth/logout` - Logout

#### User Management
- `GET /api/user/me` - Get profile
- `POST /api/user/state` - Update state
- `POST /api/user/location` - Update location

#### Discovery & Matching
- `GET /api/match/markers` - Get filtered drivers/passengers

#### Rides
- `POST /api/rides/request` - Request ride
- `POST /api/rides/request/cancel` - Cancel request
- `GET /api/rides/requests` - Get pending requests (driver)
- `POST /api/rides/request/respond` - Accept/reject request
- `POST /api/rides/connection/verify-otp` - Verify OTP
- `POST /api/rides/connection/complete` - Complete ride
- `GET /api/rides/connections` - Get active connections
- `GET /api/rides/history` - Get ride history

#### Wallet
- `GET /api/wallet/balance` - Get balance

## App Usage

### As a Passenger

1. **Login**: Enter mobile and password, or use OTP login
2. **Set Destination**: Tap search bar and select destination
3. **View Drivers**: See filtered drivers whose routes overlap yours
4. **Request Ride**: Tap driver marker and press "Request Ride"
   - Minimum balance: $10 worth of SOL required
5. **Wait for Acceptance**: Request expires in 10 minutes
6. **View OTP**: When accepted, OTP is displayed
7. **Share OTP**: Give OTP to driver at pickup
8. **Complete Ride**: Automatic payment on completion

### As a Driver

1. **Login**: Same as passenger
2. **Toggle to Driver Mode**: Switch to driver at bottom
3. **Set Destination**: Enter your destination route
4. **Receive Requests**: Accept or reject ride requests
5. **Navigate to Pickup**: App shows passenger location
6. **Enter OTP**: Get OTP from passenger to confirm pickup
7. **Complete Ride**: Mark ride complete at destination

### Navigation

- **Home**: Map view with real-time tracking
- **History**: View completed rides
- **Account**: Profile, wallet balance, logout

## Development

### Project Structure
```
routemate/
├── app/
│   ├── (tabs)/          # Main app screens
│   ├── api/             # Backend API routes
│   ├── login.tsx        # Login screen
│   └── _layout.tsx      # Root layout
├── contexts/            # React contexts
├── lib/                 # Backend utilities
├── types/               # TypeScript types
├── utils/               # Frontend utilities
└── openapi.yaml         # API specification
```

### Testing APIs

Use the OpenAPI specification with tools like:
- Postman (import `openapi.yaml`)
- Swagger UI
- Insomnia

## Deployment

### Backend (Expo API Routes)
The API routes run on Expo's backend. For production deployment:

1. Set up environment variables in your hosting platform
2. Deploy using Expo EAS or your preferred method
3. Update `API_URL` in `utils/api.ts` to production URL

### Mobile App

For production builds, use EAS Build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

Or use local builds:
```bash
# Build for iOS locally
npx expo run:ios --configuration Release

# Build for Android locally
npx expo run:android --variant release
```

## Security Notes

- Never commit `.env.local` to version control
- Keep Firebase service account secure
- Use strong encryption keys
- Rotate API keys regularly
- Implement rate limiting in production
- Enable Firebase security rules

## Troubleshooting

### Map not showing
- **Most Common Issue:** Using Expo Go instead of development build
  - Solution: Run `npx expo run:ios` or `npx expo run:android`
- Verify `GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Check if Maps SDK is enabled in Google Cloud Console
- Ensure both `react-native-maps` and `expo-maps` packages are installed
- Run `npx expo-doctor` to check for package version mismatches

### Location permission not granted
- iOS: Settings > RouteMate > Location > Always
- Android: Settings > Apps > RouteMate > Permissions > Location

### API connection failed
- Ensure backend is running
- Check `API_URL` in `utils/api.ts`
- Verify network connectivity

### Wallet balance not updating
- Confirm Solana RPC URL is accessible
- Check wallet address is correct
- Ensure sufficient devnet/mainnet SOL

## License

MIT

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request