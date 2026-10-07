/**
 * Credential verification for api/sessions.ts, which is the login endpoint:
 * it calls verifyCredentials() before it creates a session, so nobody can
 * mint a session for an arbitrary username without the right password.
 */
import { supabaseAdmin as supabase } from './supabaseAdmin.js';
import { verifyPassword } from './passwords.js';

const ADMIN_USERS = ['admin', 'Brian'];

const ADMIN_PASSWORD_HASHES: Record<string, string | undefined> = {
  admin: process.env.ADMIN_PASSWORD_HASH,
  Brian: process.env.BRIAN_PASSWORD_HASH,
};

export type CredentialCheckResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; reason: 'INVALID_CREDENTIALS' | 'USER_DISABLED' | 'SERVER_MISCONFIGURED'; message?: string };

export async function verifyCredentials(username: string, password: string): Promise<CredentialCheckResult> {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();

  if (ADMIN_USERS.includes(trimmedUsername)) {
    const hash = ADMIN_PASSWORD_HASHES[trimmedUsername];
    if (!hash) {
      console.error(`No password hash configured for admin user "${trimmedUsername}". Set ADMIN_PASSWORD_HASH / BRIAN_PASSWORD_HASH env vars.`);
      return { ok: false, reason: 'SERVER_MISCONFIGURED' };
    }
    const valid = await verifyPassword(trimmedPassword, hash);
    if (!valid) return { ok: false, reason: 'INVALID_CREDENTIALS' };
    return { ok: true, isAdmin: true };
  }

  if (!supabase) {
    return { ok: false, reason: 'SERVER_MISCONFIGURED' };
  }

  const { data: user, error } = await supabase
    .from('custom_users')
    .select('username, password, is_active')
    .eq('username', trimmedUsername)
    .single();

  if (error || !user) {
    return { ok: false, reason: 'INVALID_CREDENTIALS' };
  }

  const valid = await verifyPassword(trimmedPassword, user.password);
  if (!valid) return { ok: false, reason: 'INVALID_CREDENTIALS' };

  // Only said to someone who knows the password - otherwise anyone could
  // find out which accounts exist by trying names.
  if (user.is_active === false) {
    return { ok: false, reason: 'USER_DISABLED', message: 'Denne bruger er deaktiveret' };
  }

  return { ok: true, isAdmin: false };
}
