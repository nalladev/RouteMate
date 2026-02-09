import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { verifyRazorpayPayment } from '../../../../lib/razorpay';
import { updateDocument, getDocumentById, addDocument } from '../../../../lib/firestore';
import { User, Transaction } from '../../../../types';

export async function POST(request: Request) {
  // Feature temporarily disabled - Razorpay compliance requirement
  return Response.json(
    { 
      error: 'Feature Temporarily Disabled',
      message: 'Deposit feature is temporarily disabled. Razorpay regulations require a valid Play Store link for payment gateway integration. This feature will be enabled once the app is published on Play Store.',
      disabled: true
    },
    { status: 503 }
  );

  /* DISABLED CODE - Will be re-enabled after Play Store publication
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return Response.json(
        { error: 'Missing payment verification parameters' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return Response.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);

    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      return Response.json(
        { error: 'Payment not successful' },
        { status: 400 }
      );
    }

    const amount = paymentDetails.amount;

    // Get current user balance
    const currentUser = await getDocumentById('users', user.Id) as User;
    const currentBalance = currentUser.WalletBalance || 0;
    const newBalance = currentBalance + amount;

    // Update user balance
    await updateDocument('users', user.Id, {
      WalletBalance: newBalance,
    });

    // Create transaction record
    await addDocument('transactions', {
      UserId: user.Id,
      Type: 'topup',
      Amount: amount,
      BalanceBefore: currentBalance,
      BalanceAfter: newBalance,
      Status: 'success',
      RazorpayOrderId: razorpayOrderId,
      RazorpayPaymentId: razorpayPaymentId,
      Description: `Wallet top-up of ₹${amount}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    } as Omit<Transaction, 'Id'>);

    return Response.json({
      success: true,
      balance: newBalance,
      amount,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return Response.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
  */
}