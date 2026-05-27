import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId?: string;
  role?: 'user' | 'agent' | 'admin' | 'moderator' | 'super_admin' | 'blog_publisher';
  email?: string;
  name?: string;
  /** Admin oturumu mu (ayrı bayrak; admin/login akışında set edilir) */
  adminScope?: boolean;
}

// ============================================================
// Session secret (MC-02)
// ------------------------------------------------------------
// Production: SESSION_PASSWORD MUST be set in env (≥ 32 chars). Module fails
// to load otherwise — fail fast rather than silently using a weak fallback.
// Dev / test: a clearly-marked fallback is allowed but logged as a warning so
// nobody accidentally ships it.
// ============================================================

const ENV_PASSWORD = process.env.SESSION_PASSWORD;
const IS_PROD = process.env.NODE_ENV === 'production';

function resolveSessionPassword(): string {
  if (ENV_PASSWORD && ENV_PASSWORD.length >= 32) return ENV_PASSWORD;
  if (IS_PROD) {
    throw new Error(
      'SESSION_PASSWORD missing or < 32 chars in production. Set a strong random secret in env.',
    );
  }
  // Dev-only fallback — never used in prod thanks to the throw above.
  // Surface a clear warning so developers can't accidentally ship it.
  // eslint-disable-next-line no-console
  console.warn(
    '[session] SESSION_PASSWORD missing or weak — using dev-only fallback. DO NOT deploy this build.',
  );
  return 'dev-only-fallback-NOT-FOR-PROD-replace-with-32+chars-secret!!';
}

const SESSION_PASSWORD = resolveSessionPassword();

export const sessionOptions: SessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'istbaku-session',
  cookieOptions: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax',
    // 7 gün — eski 30 günlük pencere stolen-device riskini büyütüyordu (MH-04).
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
