import { handleBalance } from '../../../lib/api/wallet_handlers/balance';
import { handleTransactions } from '../../../lib/api/wallet_handlers/transactions';
import { handleUpiUpdate } from '../../../lib/api/wallet_handlers/upi-update';
import { handlePayoutRequest } from '../../../lib/api/wallet_handlers/payout-request';
import { handleTopupCreateOrder } from '../../../lib/api/wallet_handlers/topup-create-order';
import { handleTopupVerify } from '../../../lib/api/wallet_handlers/topup-verify';

export async function GET(request: Request, { path }: { path: string[] }) {
  try {
    const routePath = Array.isArray(path) ? path.join('/') : path;
    
    switch (routePath) {
      case 'balance':
        return await handleBalance(request);
      case 'transactions':
        return await handleTransactions(request);
      default:
        return Response.json(
          { error: `Unknown route: /api/wallet/${routePath}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Wallet GET error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { path }: { path: string[] }) {
  try {
    const routePath = Array.isArray(path) ? path.join('/') : path;
    
    switch (routePath) {
      case 'upi/update':
        return await handleUpiUpdate(request);
      case 'payout/request':
        return await handlePayoutRequest(request);
      case 'topup/create-order':
        return await handleTopupCreateOrder(request);
      case 'topup/verify':
        return await handleTopupVerify(request);
      default:
        return Response.json(
          { error: `Unknown route: /api/wallet/${routePath}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Wallet POST error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}