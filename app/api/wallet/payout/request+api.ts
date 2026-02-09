import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { createPayout, validateUpiId } from '../../../../lib/razorpay';
import { updateDocument, getDocumentById, addDocument } from '../../../../lib/firestore';
import { User, Transaction } from '../../../../types';

export async function POST(request: Request) {
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
    const { amount, upiId } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return Response.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get current user data
    const currentUser = await getDocumentById('users', user.Id) as User;
    const currentBalance = currentUser.WalletBalance || 0;

    // Check if balance is sufficient
    if (currentBalance < amount) {
      return Response.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Prevent negative balance
    if (currentBalance - amount < 0) {
      return Response.json(
        { error: 'Cannot process payout. Balance cannot go negative.' },
        { status: 400 }
      );
    }

    // Get UPI ID (from request or user profile)
    let finalUpiId = upiId || currentUser.UpiId;

    if (!finalUpiId) {
      return Response.json(
        { error: 'UPI ID is required. Please provide your UPI ID.' },
        { status: 400 }
      );
    }

    // Validate UPI ID format
    if (!validateUpiId(finalUpiId)) {
      return Response.json(
        { error: 'Invalid UPI ID format. Use format: username@bank' },
        { status: 400 }
      );
    }

    // Update UPI ID in user profile if provided
    if (upiId && upiId !== currentUser.UpiId) {
      await updateDocument('users', user.Id, {
        UpiId: upiId,
      });
    }

    // Create payout via Razorpay
    const payout = await createPayout(
      amount,
      finalUpiId,
      currentUser.Name || 'User',
      currentUser.Mobile,
      user.Id
    );

    // Deduct amount from balance
    const newBalance = currentBalance - amount;

    await updateDocument('users', user.Id, {
      WalletBalance: newBalance,
    });

    // Create transaction record
    const transactionId = await addDocument('transactions', {
      UserId: user.Id,
      Type: 'payout',
      Amount: amount,
      BalanceBefore: currentBalance,
      BalanceAfter: newBalance,
      Status: payout.status === 'processing' || payout.status === 'processed' ? 'success' : 'pending',
      RazorpayPayoutId: payout.payoutId,
      UpiId: finalUpiId,
      Description: `Payout of ₹${amount} to ${finalUpiId}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    } as Omit<Transaction, 'Id'>);

    return Response.json({
      success: true,
      payoutId: payout.payoutId,
      status: payout.status,
      utr: payout.utr,
      balance: newBalance,
      transactionId,
    });
  } catch (error: any) {
    console.error('Payout request error:', error);

    // If payout failed, we should have already not deducted the balance
    // But if we did deduct and payout failed, we need to refund
    // This is handled by the payout creation logic which throws error before deduction

    return Response.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}