import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, updateAdminPasswordInDB } from '@/lib/server/db';
import { createSessionToken, getSessionFromRequest, COOKIE_NAME } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.username,
      role: session.role,
    },
    sessionId: session.sessionId,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, username, password, currentPassword, newPassword } = body;

    if (action === 'login') {
      const trimmedUser = (username || '').trim().toLowerCase();
      if (trimmedUser !== 'admin') {
        return NextResponse.json({ success: false, error: 'Invalid admin username.' }, { status: 401 });
      }

      const isValid = verifyAdminPassword(password || '');
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
      }

      const token = createSessionToken('admin');
      const response = NextResponse.json({
        success: true,
        user: { username: 'admin', role: 'ADMIN' },
        token,
      });

      // Set cookie for browser sessions (1 year, multi-device friendly)
      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });

      return response;
    }

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    if (action === 'change_password') {
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
      }

      const isValid = verifyAdminPassword(currentPassword || '');
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect.' }, { status: 400 });
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters.' }, { status: 400 });
      }

      updateAdminPasswordInDB(newPassword);
      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error.' }, { status: 500 });
  }
}
