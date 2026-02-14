import { getAuthToken, validateSession } from '../../middleware';
import { updateDocument } from '../../firestore';
import { validateUpiId } from '../../razorpay';

export async function handleUpiUpdate(request: Request) {
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
}