import crypto from 'crypto';
import { NextRequest } from 'next/server';

const AUTH_SECRET = process.env.ADMIN_SESSION_SECRET || 'vsb-gate-pass-admin-secret-key-2026';
const COOKIE_NAME = 'vsb_admin_session';

export interface AuthSession {
  username: string;
  role: 'ADMIN';
  sessionId: string;
  createdAt: number;
}

export function createSessionToken(username = 'admin'): string {
  const session: AuthSession = {
    username,
    role: 'ADMIN',
    sessionId: `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
    createdAt: Date.now(),
  };

  const dataStr = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataStr)
    .digest('base64url');

  return `${dataStr}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): AuthSession | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(dataStr)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const jsonStr = Buffer.from(dataStr, 'base64url').toString('utf-8');
    const session = JSON.parse(jsonStr) as AuthSession;
    if (session.username === 'admin') {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): AuthSession | null {
  // Check cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const session = verifySessionToken(cookie);
    if (session) return session;
  }

  // Check Authorization Bearer header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7);
    return verifySessionToken(bearer);
  }

  return null;
}

export { COOKIE_NAME };
