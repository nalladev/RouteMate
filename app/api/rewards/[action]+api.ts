import { handleList } from '../../../lib/api/rewards_handlers/list';
import { handleRedeem } from '../../../lib/api/rewards_handlers/redeem';

export async function GET(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'list':
        return await handleList(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Rewards GET ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'redeem':
        return await handleRedeem(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Insufficient reward points') {
        return Response.json({ error: error.message }, { status: 400 });
      }
      if (error.message === 'User not found') {
        return Response.json({ error: error.message }, { status: 404 });
      }
    }

    console.error(`Rewards POST ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}