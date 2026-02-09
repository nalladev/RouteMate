import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { validateUpiId } from '../../../../lib/razorpay';
import { updateDocument } from '../../../../lib/firestore';

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
    const { upiId } = body;

    if (!upiId || typeof upiId !== 'string') {
      return Response.json(
        { error: 'UPI ID is required' },
        { status: 400 }
      );
    }

    // Validate UPI ID format
    if (!validateUpiId(upiId)) {
      return Response.json(
        { error: 'Invalid UPI ID format. Use format: username@bank (e.g., user@paytm)' },
        { status: 400 }
      );
    }

    // Update user's UPI ID
    await updateDocument('users', user.Id, {
      UpiId: upiId,
    });

    return Response.json({
      success: true,
      upiId,
    });
  } catch (error: any) {
    console.error('UPI ID update error:', error);
    return Response.json(
      { error: error.message || 'Failed to update UPI ID' },
      { status: 500 }
    );
  }
}