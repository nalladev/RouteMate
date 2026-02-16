import { handleMe } from '../../../lib/api/user_handlers/me';
import { handleLocation } from '../../../lib/api/user_handlers/location';
import { handleState } from '../../../lib/api/user_handlers/state';
import { handleVehicle } from '../../../lib/api/user_handlers/vehicle';
import { handleUploadProfilePicture } from '../../../lib/api/user_handlers/profile-picture';

export async function GET(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'me':
        return await handleMe(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`User GET ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'location':
        return await handleLocation(request);
      case 'state':
        return await handleState(request);
      case 'vehicle':
        return await handleVehicle(request);
      case 'profile-picture':
        return await handleUploadProfilePicture(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`User POST ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
