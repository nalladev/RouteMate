# Environment Variables Setup

This file documents all environment variables required for RouteMate.

## Create .env.local File

Create a `.env.local` file in the root directory of the project:

```bash
touch .env.local
```

## Required Variables

Copy and paste the following template into your `.env.local` file and replace the placeholder values:

```bash
# ============================================
# FIREBASE CONFIGURATION
# ============================================
# Base64 encoded Firebase service account JSON
# Get from: Firebase Console > Project Settings > Service Accounts
# Generate: cat service-account.json | base64 -w 0
FIREBASE_SERVICE_ACCOUNT_ENCODED=your_base64_encoded_firebase_service_account_json_here

# ============================================
# GOOGLE MAPS API
# ============================================
# Google Maps API key for Android and iOS
# Get from: https://console.cloud.google.com/
# Enable: Maps SDK for Android, Maps SDK for iOS
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# ============================================
# AUTHENTICATION (Optional - Placeholders)
# ============================================
# Phone.email API key for OTP authentication
# Get from: https://phone.email/
# Note: Currently using placeholder implementation
PHONE_EMAIL_API_KEY=your_phone_email_api_key_here

# ============================================
# KYC VERIFICATION (Optional - Placeholder)
# ============================================
# Didit API key for KYC verification
# Get from: https://didit.com/
# Note: Currently using placeholder implementation
DIDIT_API_KEY=your_didit_api_key_here

# ============================================
# SECURITY - CRITICAL
# ============================================
# 32-byte hex string for encrypting Solana wallet private keys
# Generate: openssl rand -hex 32
# KEEP THIS SECRET AND SECURE!
WALLET_ENCRYPTION_KEY=your_32_byte_hex_string_here

# Random seed for password hashing
# Generate: openssl rand -base64 32
# KEEP THIS SECRET AND SECURE!
PASSWORD_HASHING_SEED=your_random_seed_here
```

## Generate Secure Keys

Use the following commands to generate secure keys:

### Wallet Encryption Key
```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`

### Password Hashing Seed
```bash
openssl rand -base64 32
```

Example output: `Xk7mP9qR2sT5vW8yB1cD4fG6hJ9kL0nM3pQ5rS8tU1vX4yZ7aB0cD3eF6gH9jK2m`

## Firebase Service Account Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) > Service Accounts
4. Click "Generate new private key"
5. Save the downloaded JSON file securely
6. Base64 encode it:
   ```bash
   cat path/to/service-account.json | base64 -w 0
   ```
7. Copy the output to `FIREBASE_SERVICE_ACCOUNT_ENCODED`

## Google Maps API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API (optional for web)
4. Go to Credentials > Create Credentials > API Key
5. Copy the API key to `GOOGLE_MAPS_API_KEY`

### Restrict API Key (Recommended)

For production:
1. Click on your API key in Google Cloud Console
2. Under "Application restrictions":
   - For Android: Add your package name and SHA-1 certificate fingerprint
   - For iOS: Add your bundle identifier
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose only required APIs

## Optional Services Setup

### Phone.email (For OTP Authentication)

1. Sign up at [phone.email](https://phone.email/)
2. Create a new project
3. Get your API key from the dashboard
4. Add to `PHONE_EMAIL_API_KEY`

**Note**: The current implementation has placeholder code. See `docs/API_IMPLEMENTATION.md` for integration guide.

### Didit (For KYC Verification)

1. Sign up at [Didit](https://didit.com/)
2. Create a new project
3. Get your API credentials
4. Add to `DIDIT_API_KEY`

**Note**: The current implementation has placeholder code. See `docs/API_IMPLEMENTATION.md` for integration guide.

## Verification

After setting up your `.env.local` file, verify the configuration:

```bash
# Check if file exists and is not tracked by git
cat .env.local

# Ensure it's in .gitignore (should already be there)
grep "\.env.*\.local" .gitignore
```

## Environment-Specific Configurations

### Development
Use the template above with devnet Solana RPC URL (already configured in code).

### Production
For production deployment:
1. Use production values for all services
2. Switch to Solana mainnet in `lib/wallet.ts`
3. Use secure secret management (not plain text files)
4. Set up CI/CD environment variables
5. Enable Firebase App Check
6. Implement rate limiting

## Security Best Practices

1. **Never commit `.env.local` to version control**
   - Already included in `.gitignore`
   
2. **Use different keys for development and production**
   - Generate new keys for each environment
   
3. **Rotate keys regularly**
   - Change `WALLET_ENCRYPTION_KEY` and `PASSWORD_HASHING_SEED` periodically
   - Update Firebase service accounts
   
4. **Store production secrets securely**
   - Use secret management services (AWS Secrets Manager, etc.)
   - Never share keys in chat/email
   
5. **Restrict API keys**
   - Add application restrictions
   - Limit to specific APIs
   - Monitor usage

## Troubleshooting

### Firebase connection failed
- Verify base64 encoding is correct
- Check service account has Firestore permissions
- Ensure Firestore is enabled in Firebase Console

### Maps not showing
- Verify `GOOGLE_MAPS_API_KEY` is correct
- Check if Maps SDK is enabled
- Try without restrictions first, then add them

### Wallet encryption errors
- Ensure `WALLET_ENCRYPTION_KEY` is exactly 32 bytes (64 hex characters)
- Regenerate if corrupted

### Environment variables not loading
- Restart Expo development server
- Clear cache: `expo start -c`
- Check file is named exactly `.env.local`

## Example Development Configuration

For quick testing (DO NOT USE IN PRODUCTION):

```bash
# Development example - generate your own keys!
FIREBASE_SERVICE_ACCOUNT_ENCODED=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50...
GOOGLE_MAPS_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxx
PHONE_EMAIL_API_KEY=
DIDIT_API_KEY=
WALLET_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
PASSWORD_HASHING_SEED=Xk7mP9qR2sT5vW8yB1cD4fG6hJ9kL0nM3pQ5rS8tU1vX4yZ7aB0cD3eF
```

## Next Steps

After setting up environment variables:

1. Test the configuration: `npm start`
2. Create test user in Firestore
3. Test login functionality
4. Verify map displays correctly
5. Test location permissions

For detailed setup instructions, see:
- `README.md` - Complete documentation
- `docs/SETUP.md` - Detailed setup guide
- `docs/QUICKSTART.md` - Quick start guide