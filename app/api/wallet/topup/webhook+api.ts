import { verifyWebhookSignature } from '../../../../lib/razorpay';
import { updateDocument, getDocumentById, addDocument } from '../../../../lib/firestore';
import { User, Transaction } from '../../../../types';

export async function POST(request: Request) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return Response.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return Response.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    // Handle payment.captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.userId;

      if (!userId) {
        console.error('No userId in payment notes');
        return Response.json({ received: true });
      }

      const amount = payment.amount / 100; // Convert paise to rupees

      // Get current user balance
      const user = await getDocumentById('users', userId) as User;
      if (!user) {
        console.error('User not found:', userId);
        return Response.json({ received: true });
      }

      const currentBalance = user.WalletBalance || 0;
      const newBalance = currentBalance + amount;

      // Update user balance
      await updateDocument('users', userId, {
        WalletBalance: newBalance,
      });

      // Create transaction record
      await addDocument('transactions', {
        UserId: userId,
        Type: 'topup',
        Amount: amount,
        BalanceBefore: currentBalance,
        BalanceAfter: newBalance,
        Status: 'success',
        RazorpayOrderId: payment.order_id,
        RazorpayPaymentId: payment.id,
        Description: `Wallet top-up of ₹${amount}`,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      } as Omit<Transaction, 'Id'>);

      console.log(`Webhook: Updated balance for user ${userId}: ${newBalance}`);
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const userId = payment.notes?.userId;

      if (userId) {
        // Create failed transaction record
        await addDocument('transactions', {
          UserId: userId,
          Type: 'topup',
          Amount: payment.amount / 100,
          BalanceBefore: 0,
          BalanceAfter: 0,
          Status: 'failed',
          RazorpayOrderId: payment.order_id,
          RazorpayPaymentId: payment.id,
          Description: `Failed top-up attempt`,
          CreatedAt: new Date(),
          UpdatedAt: new Date(),
        } as Omit<Transaction, 'Id'>);

        console.log(`Webhook: Payment failed for user ${userId}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to acknowledge receipt even on error to prevent retries
    return Response.json({ received: true });
  }
}