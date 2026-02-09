/**
 * Utilities for handling phone.email JWT tokens
 */

export interface PhoneEmailPayload {
  mobile: string;
  email?: string;
}

/**
 * Decodes a phone.email JWT token and extracts the verified phone number and email.
 * 
 * @param token - The JWT token from phone.email
 * @returns Object containing mobile (country_code + phone_no) and optional email, or null if invalid
 */
export function decodePhoneEmailToken(token: string): PhoneEmailPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    // Extract phone number from payload
    if (payload.phone_no && payload.country_code) {
      return {
        mobile: payload.country_code + payload.phone_no,
        email: payload.email || undefined,
      };
    }

    console.error('Missing phone_no or country_code in JWT payload');
    return null;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}