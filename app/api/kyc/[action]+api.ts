import { handleCreateSession } from '../../../lib/api/kyc_handlers/create-session';
import { handleVerify } from '../../../lib/api/kyc_handlers/verify';

export async function POST(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'create-session':
        return await handleCreateSession(request);
      case 'verify':
        return await handleVerify(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`KYC ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}