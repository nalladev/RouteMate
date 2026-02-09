# API Implementation Notes

This document provides guidance on implementing the placeholder API integrations in RouteMate.

## Phone.email Integration

The following files contain placeholder code for phone.email integration:

### Files to Update
- `app/api/auth/otp-login+api.ts`
- `app/api/auth/signup+api.ts`

### Current Placeholder

```typescript
async function verifyPhoneEmailToken(token: string): Promise<{ mobile: string; email?: string } | null> {
  const phoneEmailApiKey = process.env.PHONE_EMAIL_API_KEY;
  if (!phoneEmailApiKey) {
    throw new Error('PHONE_EMAIL_API_KEY is not set');
  }

  try {
    // TODO: Replace with actual phone.email API call
    return null;
  } catch (error) {
    console.error('Phone.email verification error:', error);
    return null;
  }
}
```

### Implementation Steps

1. **Install phone.email SDK** (if available):
   ```bash
   npm install @phone-email/sdk
   ```

2. **Update the verification function**:
   ```typescript
   import { PhoneEmail } from '@phone-email/sdk';
   
   async function verifyPhoneEmailToken(token: string): Promise<{ mobile: string; email?: string } | null> {
     const phoneEmailApiKey = process.env.PHONE_EMAIL_API_KEY;
     if (!phoneEmailApiKey) {
       throw new Error('PHONE_EMAIL_API_KEY is not set');
     }

     try {
       const client = new PhoneEmail(phoneEmailApiKey);
       const result = await client.verify(token);
       
       return {
         mobile: result.phoneNumber,
         email: result.email,
       };
     } catch (error) {
       console.error('Phone.email verification error:', error);
       return null;
     }
   }
   ```

3. **Frontend Integration**:
   
   In `app/login.tsx`, update the OTP login handler:
   
   ```typescript
   import * as WebBrowser from 'expo-web-browser';
   
   async function handleOTPLogin() {
     try {
       // Open phone.email authentication flow
       const result = await WebBrowser.openAuthSessionAsync(
         'https://phone.email/auth?apiKey=YOUR_API_KEY',
         'routemate://auth-callback'
       );
       
       if (result.type === 'success') {
         const token = extractTokenFromUrl(result.url);
         await otpLogin(token);
         router.replace('/(tabs)');
       }
     } catch (error) {
       Alert.alert('Error', 'OTP authentication failed');
     }
   }
   
   function extractTokenFromUrl(url: string): string {
     const params = new URLSearchParams(url.split('?')[1]);
     return params.get('token') || '';
   }
   ```

4. **Configure deep linking** in `app.json`:
   ```json
   {
     "expo": {
       "scheme": "routemate",
       "ios": {
         "bundleIdentifier": "com.yourcompany.routemate"
       },
       "android": {
         "package": "com.yourcompany.routemate"
       }
     }
   }
   ```

### API Reference

Refer to phone.email documentation for:
- Authentication flow setup
- Token verification endpoint
- Webhook configuration
- Error handling

## Didit KYC Integration

### File to Update
- `app/api/kyc/verify+api.ts`

### Current Placeholder

```typescript
async function verifyWithDidit(kycData: any): Promise<boolean> {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    throw new Error('DIDIT_API_KEY is not set');
  }

  try {
    // TODO: Implement actual Didit API verification
    return false;
  } catch (error) {
    console.error('Didit verification error:', error);
    return false;
  }
}
```

### Implementation Steps

1. **Install Didit SDK** (if available):
   ```bash
   npm install @didit/sdk
   ```

2. **Update the verification function**:
   ```typescript
   import { DiditClient } from '@didit/sdk';
   
   async function verifyWithDidit(kycData: any): Promise<boolean> {
     const diditApiKey = process.env.DIDIT_API_KEY;
     if (!diditApiKey) {
       throw new Error('DIDIT_API_KEY is not set');
     }

     try {
       const client = new DiditClient({
         apiKey: diditApiKey,
         environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
       });
       
       const verification = await client.kyc.verify({
         document: kycData.document,
         selfie: kycData.selfie,
         personalInfo: kycData.personalInfo,
       });
       
       return verification.status === 'verified';
     } catch (error) {
       console.error('Didit verification error:', error);
       return false;
     }
   }
   ```

3. **Frontend KYC Screen**:
   
   Create `app/kyc.tsx`:
   
   ```typescript
   import React, { useState } from 'react';
   import { View, Button, Alert } from 'react-native';
   import * as ImagePicker from 'expo-image-picker';
   import { api } from '@/utils/api';
   
   export default function KYCScreen() {
     const [documentImage, setDocumentImage] = useState<string | null>(null);
     const [selfieImage, setSelfieImage] = useState<string | null>(null);
     
     async function pickDocument() {
       const result = await ImagePicker.launchImageLibraryAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
         quality: 1,
       });
       
       if (!result.canceled) {
         setDocumentImage(result.assets[0].uri);
       }
     }
     
     async function takeSelfie() {
       const result = await ImagePicker.launchCameraAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
         quality: 1,
       });
       
       if (!result.canceled) {
         setSelfieImage(result.assets[0].uri);
       }
     }
     
     async function submitKYC() {
       if (!documentImage || !selfieImage) {
         Alert.alert('Error', 'Please provide both document and selfie');
         return;
       }
       
       try {
         const kycData = {
           document: documentImage,
           selfie: selfieImage,
           personalInfo: {
             // Collect from form
           }
         };
         
         const { verified } = await api.verifyKyc(kycData);
         
         if (verified) {
           Alert.alert('Success', 'KYC verification successful!');
         } else {
           Alert.alert('Failed', 'KYC verification failed');
         }
       } catch (error) {
         Alert.alert('Error', 'Failed to submit KYC');
       }
     }
     
     return (
       <View>
         <Button title="Upload Document" onPress={pickDocument} />
         <Button title="Take Selfie" onPress={takeSelfie} />
         <Button title="Submit KYC" onPress={submitKYC} />
       </View>
     );
   }
   ```

4. **Install required dependencies**:
   ```bash
   npm install expo-image-picker
   ```

5. **Update signup flow** to include KYC:
   
   After successful signup, navigate to KYC screen:
   ```typescript
   async function handleSignup(otpToken: string, password: string) {
     const { token, user } = await api.signup(otpToken, password);
     await setAuthToken(token);
     router.push('/kyc'); // Navigate to KYC screen
   }
   ```

### API Reference

Refer to Didit documentation for:
- Document types accepted
- Image quality requirements
- Verification webhook setup
- Compliance requirements

## Google Places API Integration

For destination search functionality, implement Google Places Autocomplete:

### Implementation

1. **Install Google Places library**:
   ```bash
   npm install react-native-google-places-autocomplete
   ```

2. **Update home screen** in `app/(tabs)/index.tsx`:
   
   ```typescript
   import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
   
   function DestinationSearch() {
     return (
       <GooglePlacesAutocomplete
         placeholder='Search destination...'
         onPress={(data, details = null) => {
           const location = {
             lat: details.geometry.location.lat,
             lng: details.geometry.location.lng,
           };
           setDestination(location);
         }}
         query={{
           key: 'YOUR_GOOGLE_MAPS_API_KEY',
           language: 'en',
         }}
         fetchDetails={true}
       />
     );
   }
   ```

## Environment Variables Checklist

Ensure all required environment variables are set in `.env.local`:

```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT_ENCODED=<base64-encoded-json>

# Phone.email
PHONE_EMAIL_API_KEY=<your-api-key>
PHONE_EMAIL_WEBHOOK_SECRET=<webhook-secret>

# Didit
DIDIT_API_KEY=<your-api-key>
DIDIT_WEBHOOK_SECRET=<webhook-secret>

# Google Maps
GOOGLE_MAPS_API_KEY=<your-api-key>

# Security
WALLET_ENCRYPTION_KEY=<32-byte-hex-string>
PASSWORD_HASHING_SEED=<random-string>
```

## Testing Integrations

### Phone.email Test Flow

1. Start the app
2. Click "Login with OTP"
3. Enter phone number
4. Verify OTP code
5. Check backend receives token
6. Verify user is created/logged in

### Didit KYC Test Flow

1. Sign up new user
2. Navigate to KYC screen
3. Upload document photo
4. Take selfie
5. Submit for verification
6. Check webhook receives result
7. Verify user record is updated

### Mock Responses (for development)

You can temporarily mock successful responses for testing:

```typescript
// In development only
if (process.env.NODE_ENV === 'development') {
  return {
    mobile: '+1234567890',
    email: 'test@example.com',
  };
}
```

## Production Considerations

1. **Rate Limiting**: Implement rate limiting for API calls
2. **Caching**: Cache verification results appropriately
3. **Error Handling**: Implement comprehensive error handling
4. **Logging**: Log all API interactions for debugging
5. **Monitoring**: Set up monitoring for API failures
6. **Webhooks**: Configure webhooks for async notifications
7. **Compliance**: Ensure GDPR/data protection compliance
8. **Security**: Validate all user inputs
9. **Retry Logic**: Implement exponential backoff for retries
10. **Fallbacks**: Have fallback mechanisms for API failures

## Support Resources

- Phone.email: https://phone.email/docs
- Didit: https://didit.com/docs
- Google Places: https://developers.google.com/maps/documentation/places
- Expo WebBrowser: https://docs.expo.dev/versions/latest/sdk/webbrowser/
- Expo ImagePicker: https://docs.expo.dev/versions/latest/sdk/imagepicker/

## Common Issues

### Phone.email

- **Invalid Token**: Ensure token is properly extracted from callback URL
- **Expired Token**: Tokens typically expire after 5-10 minutes
- **Rate Limiting**: Implement proper rate limiting

### Didit

- **Image Quality**: Ensure images meet minimum quality requirements
- **Document Type**: Verify correct document type is being sent
- **Verification Time**: KYC verification may take several minutes

### General

- **CORS Issues**: Configure CORS properly for API requests
- **Timeout**: Set appropriate timeout values (30s recommended)
- **Network Errors**: Handle network failures gracefully