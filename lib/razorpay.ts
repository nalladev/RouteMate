import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

/**
 * Create Basic Auth header for Razorpay API
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Create Razorpay order for top-up
 */
export async function createRazorpayOrder(amount: number, userId: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
}> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }

  if (amount < 100 || amount > 10000) {
    throw new Error('Amount must be between ₹100 and ₹10,000');
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `topup_${userId}_${Date.now()}`,
      notes: {
        userId,
        type: 'wallet_topup',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Razorpay order creation failed:', error);
    throw new Error('Failed to create payment order');
  }

  const data = await response.json();
  return {
    orderId: data.id,
    amount: data.amount / 100, // Convert back to rupees
    currency: data.currency,
  };
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret not configured');
  }

  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Razorpay webhook secret not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string): Promise<{
  id: string;
  amount: number;
  status: string;
  orderId: string;
}> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment details');
  }

  const data = await response.json();
  return {
    id: data.id,
    amount: data.amount / 100, // Convert to rupees
    status: data.status,
    orderId: data.order_id,
  };
}

/**
 * Validate UPI ID format
 */
export function validateUpiId(upiId: string): boolean {
  // Format: username@bank (e.g., user@paytm, 9876543210@ybl)
  const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
  return upiRegex.test(upiId);
}

/**
 * Create contact for payout (required by Razorpay)
 */
async function createContact(name: string, mobile: string, userId: string): Promise<string> {
  const response = await fetch(`${RAZORPAY_API_BASE}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      contact: mobile,
      type: 'customer',
      reference_id: userId,
      notes: {
        userId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Contact creation failed:', error);
    throw new Error('Failed to create contact for payout');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create fund account for UPI payout
 */
async function createFundAccount(contactId: string, upiId: string): Promise<string> {
  const response = await fetch(`${RAZORPAY_API_BASE}/fund_accounts`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contact_id: contactId,
      account_type: 'vpa',
      vpa: {
        address: upiId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Fund account creation failed:', error);
    throw new Error('Failed to create fund account for payout');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Create payout to UPI ID
 */
export async function createPayout(
  amount: number,
  upiId: string,
  name: string,
  mobile: string,
  userId: string
): Promise<{
  payoutId: string;
  status: string;
  utr?: string;
}> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }

  if (amount <= 0) {
    throw new Error('Payout amount must be greater than 0');
  }

  if (!validateUpiId(upiId)) {
    throw new Error('Invalid UPI ID format');
  }

  try {
    // Step 1: Create contact
    const contactId = await createContact(name, mobile, userId);

    // Step 2: Create fund account
    const fundAccountId = await createFundAccount(contactId, upiId);

    // Step 3: Create payout
    const response = await fetch(`${RAZORPAY_API_BASE}/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'X-Payout-Idempotency': `payout_${userId}_${Date.now()}`,
      },
      body: JSON.stringify({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '0000000000000000',
        fund_account_id: fundAccountId,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        queue_if_low_balance: false,
        reference_id: `payout_${userId}_${Date.now()}`,
        narration: 'RouteMate Withdrawal',
        notes: {
          userId,
          type: 'wallet_payout',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Payout creation failed:', error);
      throw new Error(error.error?.description || 'Failed to create payout');
    }

    const data = await response.json();
    return {
      payoutId: data.id,
      status: data.status,
      utr: data.utr,
    };
  } catch (error) {
    console.error('Payout process failed:', error);
    throw error;
  }
}

/**
 * Fetch payout status
 */
export async function fetchPayoutStatus(payoutId: string): Promise<{
  id: string;
  status: string;
  utr?: string;
}> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/payouts/${payoutId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payout status');
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    utr: data.utr,
  };
}