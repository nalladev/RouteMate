import { handleList } from '../../../lib/api/communities_handlers/list';
import { handleCreate } from '../../../lib/api/communities_handlers/create';
import { handleSelect } from '../../../lib/api/communities_handlers/select';
import { handleInviteCreate } from '../../../lib/api/communities_handlers/invite-create';
import { handleInviteAccept } from '../../../lib/api/communities_handlers/invite-accept';
import { handleMembers } from '../../../lib/api/communities_handlers/members';
import { handleMembersRemove } from '../../../lib/api/communities_handlers/members-remove';

export async function GET(request: Request, { path }: { path: string | string[] }) {
  try {
    // Expo Router passes path as a string, not an array, so we need to split it
    const pathArray = Array.isArray(path) 
      ? path 
      : typeof path === 'string' 
        ? path.split('/').filter(Boolean)
        : [];
    
    // Handle /api/communities (empty path)
    if (pathArray.length === 0) {
      // GET /api/communities - list communities
      return await handleList(request);
    }

    if (pathArray.length === 2 && pathArray[1] === 'members') {
      // GET /api/communities/[communityId]/members
      return await handleMembers(request, pathArray[0]);
    }
    return Response.json(
      { error: `Unknown route: /api/communities/${pathArray.join('/')}` },
      { status: 404 }
    );
  } catch (error) {
    console.error('Communities GET error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { path }: { path: string | string[] }) {
  try {
    // Expo Router passes path as a string, not an array, so we need to split it
    const pathArray = Array.isArray(path)
      ? path
      : typeof path === 'string'
        ? path.split('/').filter(Boolean)
        : [];
    const routePath = pathArray.join('/');

    switch (routePath) {
      case 'create':
        return await handleCreate(request);
      case 'select':
        return await handleSelect(request);
      case 'invite/create':
        return await handleInviteCreate(request);
      case 'invite/accept':
        return await handleInviteAccept(request);
      default:
        break;
    }

    // Handle dynamic routes like [communityId]/members/remove
    if (pathArray.length === 3 && pathArray[1] === 'members' && pathArray[2] === 'remove') {
      return await handleMembersRemove(request, pathArray[0]);
    }

    return Response.json(
      { error: `Unknown route: /api/communities/${routePath}` },
      { status: 404 }
    );
  } catch (error) {
    console.error('Communities POST error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}