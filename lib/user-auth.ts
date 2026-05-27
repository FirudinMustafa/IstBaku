'use client';

// CLIENT-SIDE useUser hook — sunucudan oturumu çeker, signOut server action'a delege eder.
// Production: db'den okur, iron-session cookie ile.

import * as React from 'react';
import type { PublicUser } from './auth-actions';
import { signOutAction } from './auth-actions';

export type { PublicUser } from './auth-actions';

/** Sunucudan mevcut oturumu fetchle */
async function fetchSession(): Promise<PublicUser | null> {
  try {
    const r = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!r.ok) return null;
    const data = (await r.json()) as { user: PublicUser | null };
    return data.user;
  } catch {
    return null;
  }
}

export function useUser() {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchSession().then((u) => {
      if (cancelled) return;
      setUser(u);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const signOut = React.useCallback(async () => {
    await signOutAction();
    setUser(null);
    window.location.href = '/';
  }, []);

  return {
    user,
    ready,
    isAuthenticated: !!user,
    signOut,
  };
}
