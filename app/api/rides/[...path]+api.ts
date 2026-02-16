import { handleRequest } from '../../../lib/api/rides_handlers/request';
import { handleConnections } from '../../../lib/api/rides_handlers/connections';
import { handleHistory } from '../../../lib/api/rides_handlers/history';
import { handleRequests } from '../../../lib/api/rides_handlers/requests';
import { handleRequestCancel } from '../../../lib/api/rides_handlers/request-cancel';
import { handleRequestRespond } from '../../../lib/api/rides_handlers/request-respond';
import { handleShareCreate } from '../../../lib/api/rides_handlers/share-create';
import { handleShareDetails } from '../../../lib/api/rides_handlers/share-details';
import { handleConnectionComplete } from '../../../lib/api/rides_handlers/connection-complete';
import { handleConnectionVerifyOtp } from '../../../lib/api/rides_handlers/connection-verify-otp';
import { handleConnectionRate } from '../../../lib/api/rides_handlers/connection-rate';
import { handleConnectionCancel } from '../../../lib/api/rides_handlers/connection-cancel';

export async function GET(request: Request, { path }: { path: string[] }) {
  try {
    const routePath = Array.isArray(path) ? path.join('/') : path;
    
    switch (routePath) {
      case 'connections':
        return await handleConnections(request);
      case 'history':
        return await handleHistory(request);
      case 'requests':
        return await handleRequests(request);
      case 'share/details':
        return await handleShareDetails(request);
      default:
        return Response.json(
          { error: `Unknown route: /api/rides/${routePath}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Rides GET error:`, error);
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
      case 'request':
        return await handleRequest(request);
      case 'request/cancel':
        return await handleRequestCancel(request);
      case 'request/respond':
        return await handleRequestRespond(request);
      case 'share/create':
        return await handleShareCreate(request);
      case 'connection/complete':
        return await handleConnectionComplete(request);
      case 'connection/verify-otp':
        return await handleConnectionVerifyOtp(request);
      case 'connection/rate':
        return await handleConnectionRate(request);
      case 'connection/cancel':
        return await handleConnectionCancel(request);
      default:
        return Response.json(
          { error: `Unknown route: /api/rides/${routePath}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Rides POST error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}