import { getAuthToken, validateSession } from '../../middleware';
import { getDocument } from '../../firestore';
import { getVouchersByRole } from '../../../constants/rewards';
import type { RewardRedemption } from '../../../types';

export async function handleList(request: Request) {
  const token = getAuthToken(request);

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await validateSession(token);

  if (!user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const redemptionsRaw = await getDocument('rewardredemptions', { UserId: user.Id });
  const redemptions = (redemptionsRaw as RewardRedemption[])
    .sort((a, b) => {
      const aTime = new Date(a.CreatedAt?.toDate?.() || a.CreatedAt || 0).getTime();
      const bTime = new Date(b.CreatedAt?.toDate?.() || b.CreatedAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 20);

  return Response.json({
    points: {
      passenger: user.PassengerRewardPoints || 0,
      driver: user.DriverRewardPoints || 0,
    },
    vouchers: {
      passenger: getVouchersByRole('passenger'),
      driver: getVouchersByRole('driver'),
    },
    redemptions,
  });
}