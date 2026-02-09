import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, updateDocument } from '../../../../lib/firestore';
import { transferSol } from '../../../../lib/wallet';

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
    const { connectionId } = body;

    if (!connectionId) {
      return Response.json(
        { error: 'connectionId is required' },
        { status: 400 }
      );
    }

    const connection = await getDocumentById('rideconnections', connectionId);

    if (!connection) {
      return Response.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.DriverId !== user.Id && connection.PassengerId !== user.Id) {
      return Response.json(
        { error: 'Unauthorized to complete this connection' },
        { status: 403 }
      );
    }

    if (connection.State !== 'picked_up') {
      return Response.json(
        { error: 'Connection must be in picked_up state' },
        { status: 400 }
      );
    }

    // Get passenger and driver wallet info
    const passenger = await getDocumentById('users', connection.PassengerId);
    const driver = await getDocumentById('users', connection.DriverId);

    if (!passenger || !driver) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Process payment
    let paymentTx = '';
    try {
      const fareInSol = connection.Fare / 100; // Assuming $100 per SOL, adjust as needed
      paymentTx = await transferSol(
        passenger.Wallet.EncryptedKey,
        driver.Wallet.address,
        fareInSol
      );
    } catch (paymentError) {
      console.error('Payment error:', paymentError);
      return Response.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      );
    }

    // Mark connection as completed
    await updateDocument('rideconnections', connectionId, {
      State: 'completed',
      CompletedAt: new Date(),
      PaymentTx: paymentTx,
    });

    // Update user states back to idle
    await updateDocument('users', connection.PassengerId, {
      state: 'idle',
      Destination: null,
    });

    return Response.json({
      success: true,
      paymentTx,
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}