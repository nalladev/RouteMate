import { handleLogin } from '../../../lib/api/auth_handlers/login';
import { handleLogout } from '../../../lib/api/auth_handlers/logout';
import { handleOtpLogin } from '../../../lib/api/auth_handlers/otp-login';
import { handleSignup } from '../../../lib/api/auth_handlers/signup';

export async function GET(request: Request, { action }: { action: string }) {
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function POST(request: Request, { action }: { action: string }) {
  try {
    switch (action) {
      case 'login':
        return await handleLogin(request);
      case 'logout':
        return await handleLogout(request);
      case 'otp-login':
        return await handleOtpLogin(request);
      case 'signup':
        return await handleSignup(request);
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error(`Auth ${action} error:`, error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}