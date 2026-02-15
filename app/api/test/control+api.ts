import { handleTestControl, handleTestStatus } from '../../../lib/api/test_handlers/control';

export async function GET(request: Request) {
  return await handleTestStatus(request);
}

export async function POST(request: Request) {
  return await handleTestControl(request);
}