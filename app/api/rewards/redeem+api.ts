import { getAuthToken, validateSession } from '../../../lib/middleware';
import { initializeFirestore, runTransaction } from '../../../lib/firestore';
import { getVoucherById } from '../../../constants/rewards';
import type { RewardRole, User } from '../../../types';

export async function POST(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { role, voucherId } = body as { role?: RewardRole; voucherId?: string };

    if (!role || !voucherId || !['passenger', 'driver'].includes(role)) {
      return Response.json({ error: 'role and voucherId are required' }, { status: 400 });
    }

    const voucher = getVoucherById(role, voucherId);
    if (!voucher) {
      return Response.json({ error: 'Voucher not found' }, { status: 404 });
    }

    const db = initializeFirestore();
    const result = await runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(user.Id);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = { Id: userDoc.id, ...userDoc.data() } as User;
      const currentPoints = role === 'passenger'
        ? (userData.PassengerRewardPoints || 0)
        : (userData.DriverRewardPoints || 0);

      if (currentPoints < voucher.pointsCost) {
        throw new Error('Insufficient reward points');
      }

      const updatedPoints = currentPoints - voucher.pointsCost;
      const pointsField = role === 'passenger' ? 'PassengerRewardPoints' : 'DriverRewardPoints';
      transaction.update(userRef, {
        [pointsField]: updatedPoints,
      });

      const redemptionRef = db.collection('rewardredemptions').doc();
      transaction.set(redemptionRef, {
        UserId: user.Id,
        VoucherId: voucher.id,
        VoucherTitle: voucher.title,
        Role: role,
        PointsCost: voucher.pointsCost,
        Status: 'redeemed',
        CreatedAt: new Date(),
      });

      return {
        success: true,
        role,
        voucher,
        remainingPoints: updatedPoints,
      };
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Insufficient reward points') {
        return Response.json({ error: error.message }, { status: 400 });
      }
      if (error.message === 'User not found') {
        return Response.json({ error: error.message }, { status: 404 });
      }
    }

    console.error('Redeem reward error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
