import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'pemilu-osis-secret-jwt-key-2026-default'
);

const VOTER_COOKIE_NAME = 'voter_session';
const ADMIN_COOKIE_NAME = 'admin_session';

export interface VoterPayload {
  id: string;
  username: string;
}

export interface AdminPayload {
  username: string;
  role: 'admin';
}

// Voter Session Helpers
export async function createVoterSession(voter: VoterPayload) {
  const token = await new SignJWT({ id: voter.id, username: voter.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(VOTER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7200, // 2 hours
  });
}

export async function getVoterSession(): Promise<VoterPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VOTER_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

export async function destroyVoterSession() {
  const cookieStore = await cookies();
  cookieStore.delete(VOTER_COOKIE_NAME);
}

// Admin Session Helpers
export async function createAdminSession(username: string) {
  const token = await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 43200, // 12 hours
  });
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role !== 'admin') return null;

    return {
      username: payload.username as string,
      role: 'admin',
    };
  } catch {
    return null;
  }
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
