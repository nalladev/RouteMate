import { getAuthToken, validateSession } from '../../../../lib/middleware';
import { getDocumentById, updateDocument, addDocument } from '../../../../lib/firestore';
import { User, RideConnection, Transaction } from '../../../../types';

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
    const passengerBalance = passenger.WalletBalance || 0;
    const driverBalance = driver.WalletBalance || 0;

    // Validate passenger has sufficient balance
    if (passengerBalance < fare) {
      // Mark payment as failed
      await updateDocument('rideconnections', connectionId, {
        PaymentStatus: 'failed',
      });

      return Response.json(
        { error: 'Insufficient balance for payment' },
        { status: 400 }
      );
    }

    // Critical validation: Prevent negative balance
    if (passengerBalance - fare < 0) {
      await updateDocument('rideconnections', connectionId, {
        PaymentStatus: 'failed',
      });

      return Response.json(
        { error: 'Payment validation failed. Balance cannot go negative.' },
        { status: 400 }
      );
    }

    // Process payment atomically
    const newPassengerBalance = passengerBalance - fare;
    const newDriverBalance = driverBalance + fare;

    // Deduct from passenger
    await updateDocument('users', connection.PassengerId, {
      WalletBalance: newPassengerBalance,
    });

    // Add to driver
    await updateDocument('users', connection.DriverId, {
      WalletBalance: newDriverBalance,
    });

    // Create transaction record for passenger (debit)
    await addDocument('transactions', {
      UserId: connection.PassengerId,
      Type: 'ride_payment',
      Amount: fare,
      BalanceBefore: passengerBalance,
      BalanceAfter: newPassengerBalance,
      Status: 'success',
      RideConnectionId: connectionId,
      Description: `Ride payment of ₹${fare.toFixed(2)} to ${driver.Name || 'driver'}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    } as Omit<Transaction, 'Id'>);

    // Create transaction record for driver (credit)
    await addDocument('transactions', {
      UserId: connection.DriverId,
      Type: 'ride_earning',
      Amount: fare,
      BalanceBefore: driverBalance,
      BalanceAfter: newDriverBalance,
      Status: 'success',
      RideConnectionId: connectionId,
      Description: `Ride earning of ₹${fare.toFixed(2)} from ${passenger.Name || 'passenger'}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    } as Omit<Transaction, 'Id'>);

    // Mark connection as completed with successful payment
    await updateDocument('rideconnections', connectionId, {
      State: 'completed',
      PaymentStatus: 'success',
      CompletedAt: new Date(),
    });

    // Update user states back to idle
    await updateDocument('users', connection.PassengerId, {
      state: 'idle',
      Destination: null,
    });

    await updateDocument('users', connection.DriverId, {
      state: 'idle',
      Destination: null,
    });

    return Response.json({
      success: true,
      paymentStatus: 'success',
      fare,
      passengerBalance: newPassengerBalance,
      driverBalance: newDriverBalance,
    });
  } catch (error) {
    console.error('Complete ride error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}