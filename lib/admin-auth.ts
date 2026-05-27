// MC-01 fix
// Legacy mock admin auth — DB-backed iron-session is the source of truth now.
// Hardcoded credentials were removed. Default admin accounts (used by the
// seed script and never by runtime auth) MUST be supplied via env vars in
// production; clear errors are thrown if anyone tries to use defaults there.

export interface AdminAccount {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
}

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v || v.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `${key} is required in production. Configure default admin credentials via env vars.`,
      );
    }
    // Dev-only sentinel; the seed script may overwrite via prompt.
    return '';
  }
  return v;
}

/**
 * Seed-time default admin accounts. NEVER read from runtime auth — runtime
 * authentication exclusively goes through the `users` table + bcrypt. Used
 * only by `npm run seed` (or equivalent) to bootstrap an empty DB.
 *
 * Production: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD must be set in env.
 * Dev: empty strings — seed script can prompt or skip.
 */
export function getSeedAdminAccounts(): AdminAccount[] {
  const accounts: AdminAccount[] = [
    {
      email: envOrThrow('SUPER_ADMIN_EMAIL'),
      password: envOrThrow('SUPER_ADMIN_PASSWORD'),
      name: process.env.SUPER_ADMIN_NAME ?? 'Süper Admin',
      role: 'super_admin',
    },
  ];
  return accounts.filter((a) => a.email && a.password);
}

/**
 * @deprecated Hardcoded credentials removed (MC-01). Use `getSeedAdminAccounts()`
 * with env vars instead. Kept as a stub so legacy imports don't crash, but
 * always returns an empty array.
 */
export const ADMIN_ACCOUNTS: AdminAccount[] = [];

export const ADMIN_SESSION_KEY = 'istbaku-admin-session'; // deprecated, use iron-session
