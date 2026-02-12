import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, runTransaction, initializeFirestore } from '../../../../lib/firestore';
import { User, RideConnection } from '../../../../types';

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

    const connection = await getDocumentById('rideconnections', connectionId) as RideConnection;

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

    // Get passenger and driver info
    const passenger = await getDocumentById('users', connection.PassengerId) as User;
    const driver = await getDocumentById('users', connection.DriverId) as User;

    if (!passenger || !driver) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const fare = connection.Fare;

    // Process payment atomically using Firestore transaction
    const db = initializeFirestore();
    const result = await runTransaction(async (transaction) => {
      // Re-fetch documents within transaction for consistency
      const passengerRef = db.collection('users').doc(connection.PassengerId);
      const driverRef = db.collection('users').doc(connection.DriverId);
      const connectionRef = db.collection('rideconnections').doc(connectionId);

      const passengerDoc = await transaction.get(passengerRef);
      const driverDoc = await transaction.get(driverRef);

      if (!passengerDoc.exists || !driverDoc.exists) {
        throw new Error('User not found in transaction');
      }

      const passengerData = { Id: passengerDoc.id, ...passengerDoc.data() } as User;
      const driverData = { Id: driverDoc.id, ...driverDoc.data() } as User;

      const passengerBalance = passengerData.WalletBalance || 0;
      const driverBalance = driverData.WalletBalance || 0;

      // Validate passenger has sufficient balance
      if (passengerBalance < fare) {
        // Mark payment as failed
        transaction.update(connectionRef, {
          PaymentStatus: 'failed',
        });
        throw new Error('Insufficient balance for payment');
      }

      // Critical validation: Prevent negative balance
      if (passengerBalance - fare < 0) {
        transaction.update(connectionRef, {
          PaymentStatus: 'failed',
        });
        throw new Error('Payment validation failed. Balance cannot go negative.');
      }

      // Calculate new balances
      const newPassengerBalance = passengerBalance - fare;
      const newDriverBalance = driverBalance + fare;

      // Update passenger balance
      transaction.update(passengerRef, {
        WalletBalance: newPassengerBalance,
        state: 'idle',
        Destination: null,
      });

      // Update driver balance
      transaction.update(driverRef, {
        WalletBalance: newDriverBalance,
        state: 'idle',
        Destination: null,
      });

      // Create transaction record for passenger (debit)
      const passengerTransactionRef = db.collection('transactions').doc();
      transaction.set(passengerTransactionRef, {
        UserId: connection.PassengerId,
        Type: 'ride_payment',
        Amount: fare,
        BalanceBefore: passengerBalance,
        BalanceAfter: newPassengerBalance,
        Status: 'success',
        RideConnectionId: connectionId,
        Description: `Ride payment of ₹${fare.toFixed(2)} to ${driverData.Name || 'driver'}`,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });

      // Create transaction record for driver (credit)
      const driverTransactionRef = db.collection('transactions').doc();
      transaction.set(driverTransactionRef, {
        UserId: connection.DriverId,
        Type: 'ride_earning',
        Amount: fare,
        BalanceBefore: driverBalance,
        BalanceAfter: newDriverBalance,
        Status: 'success',
        RideConnectionId: connectionId,
        Description: `Ride earning of ₹${fare.toFixed(2)} from ${passengerData.Name || 'passenger'}`,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });

      // Mark connection as completed with successful payment
      transaction.update(connectionRef, {
        State: 'completed',
        PaymentStatus: 'success',
        CompletedAt: new Date(),
      });

      return {
        success: true,
        paymentStatus: 'success',
        fare,
        passengerBalance: newPassengerBalance,
        driverBalance: newDriverBalance,
      };
    });

    return Response.json(result);
  } catch (error) {
    console.error('Complete ride error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}