import { getAuthToken, validateSession } from '../../middleware';
import { getDocumentById, updateDocument, runTransaction, initializeFirestore } from '../../firestore';
import { RideConnection, User } from '../../../types';
import { calculateDriverCancellationPenalty } from '../../../constants/cancellation';

export async function handleConnectionCancel(request: Request) {
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

  // Check if user is either passenger or driver
  const isPassenger = connection.PassengerId === user.Id;
  const isDriver = connection.DriverId === user.Id;

  if (!isPassenger && !isDriver) {
    return Response.json(
      { error: 'Unauthorized to cancel this connection' },
      { status: 403 }
    );
  }

  // Check if connection can be cancelled
  if (connection.State === 'completed') {
    return Response.json(
      { error: 'Cannot cancel a completed ride' },
      { status: 400 }
    );
  }

  if (connection.State === 'cancelled' || connection.State === 'rejected') {
    return Response.json(
      { error: 'Connection is already cancelled or rejected' },
      { status: 400 }
    );
  }

  // Only accepted or picked_up rides can be cancelled with penalties
  if (connection.State !== 'accepted' && connection.State !== 'picked_up') {
    return Response.json(
      { error: 'Connection must be in accepted or picked_up state to cancel' },
      { status: 400 }
    );
  }

  // Passengers cannot cancel after pickup (ride in progress)
  if (isPassenger && connection.State === 'picked_up') {
    return Response.json(
      { error: 'Cannot cancel ride after pickup. Please complete the ride.' },
      { status: 400 }
    );
  }

  const cancelledAt = new Date();
  let penalty = 0;
  const cancelledBy = isDriver ? 'driver' : 'passenger';

  // Calculate penalty only if driver cancels an accepted ride
  if (isDriver && connection.State === 'accepted' && connection.AcceptedAt) {
    const acceptedAt = connection.AcceptedAt?.toDate
      ? connection.AcceptedAt.toDate()
      : new Date(connection.AcceptedAt);
    
    penalty = calculateDriverCancellationPenalty(acceptedAt, cancelledAt);
  }

  // If there's a penalty, use transaction to deduct from driver's wallet
  if (penalty > 0) {
    const db = initializeFirestore();

    try {
      const result = await runTransaction(async (transaction) => {
        const driverRef = db.collection('users').doc(connection.DriverId);
        const connectionRef = db.collection('rideconnections').doc(connectionId);

        const driverDoc = await transaction.get(driverRef);

        if (!driverDoc.exists) {
          throw new Error('Driver not found in transaction');
        }

        const driverData = { Id: driverDoc.id, ...driverDoc.data() } as User;
        const currentBalance = driverData.WalletBalance || 0;

        // Check if driver has sufficient balance
        if (currentBalance < penalty) {
          throw new Error('Insufficient balance to pay cancellation penalty');
        }

        const newBalance = currentBalance - penalty;

        // Update driver's wallet balance
        transaction.update(driverRef, {
          WalletBalance: newBalance,
        });

        // Update connection with cancellation details
        transaction.update(connectionRef, {
          State: 'cancelled',
          CancelledAt: cancelledAt,
          CancelledBy: cancelledBy,
          CancellationPenalty: penalty,
        });

        // Create transaction record for penalty
        const transactionRef = db.collection('transactions').doc();
        transaction.set(transactionRef, {
          UserId: connection.DriverId,
          Type: 'ride_payment',
          Amount: penalty,
          BalanceBefore: currentBalance,
          BalanceAfter: newBalance,
          Status: 'success',
          RideConnectionId: connectionId,
          Description: `Cancellation penalty of ₹${penalty.toFixed(2)} for cancelling ride`,
          CreatedAt: cancelledAt,
          UpdatedAt: cancelledAt,
        });

        return { newBalance, penalty };
      });

      return Response.json({
        success: true,
        cancelled: true,
        cancelledBy,
        penalty: result.penalty,
        newBalance: result.newBalance,
        message: `Ride cancelled. Penalty of ₹${result.penalty} has been deducted from your wallet.`,
      });
    } catch (error: any) {
      console.error('Transaction error:', error);
      return Response.json(
        { error: error.message || 'Failed to process cancellation with penalty' },
        { status: 500 }
      );
    }
  } else {
    // No penalty, simple update
    await updateDocument('rideconnections', connectionId, {
      State: 'cancelled',
      CancelledAt: cancelledAt,
      CancelledBy: cancelledBy,
      CancellationPenalty: 0,
    });

    return Response.json({
      success: true,
      cancelled: true,
      cancelledBy,
      penalty: 0,
      message: isPassenger 
        ? 'Ride cancelled successfully.' 
        : 'Ride cancelled within grace period. No penalty charged.',
    });
  }
}

export default function Handler() { return null; }