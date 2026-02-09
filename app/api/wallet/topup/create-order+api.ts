import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { createRazorpayOrder } from '../../../../lib/razorpay';

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
    const { amount } = body;

    if (!amount || typeof amount !== 'number') {
      return Response.json(
        { error: 'Amount is required and must be a number' },
        { status: 400 }
      );
    }

    if (amount < 100 || amount > 10000) {
      return Response.json(
        { error: 'Amount must be between ₹100 and ₹10,000' },
        { status: 400 }
      );
    }

    const order = await createRazorpayOrder(amount, user.Id);

    return Response.json({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    return Response.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}