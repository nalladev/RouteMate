import { handleMarkers } from '../../../lib/api/match_handlers/markers';

export async function GET(request: Request) {
  return handleMarkers(request);
}