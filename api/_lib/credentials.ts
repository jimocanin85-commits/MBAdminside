/**
 * Shared credential verification, used by both api/login.ts (a pure
 * "are these credentials valid?" check the client uses before showing
 * success/failure) and api/sessions.ts (which MUST also verify credentials
 * itself - otherwise a client could skip /api/login entirely and POST
 * straight to /api/sessions with any username to mint a valid session).
 */
import { createClient } from '@supabase/supabase-js';
import { verifyPassword } from './passwords';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

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

  if (user.is_active === false) {
    return { ok: false, reason: 'USER_DISABLED', message: 'Denne bruger er deaktiveret' };
  }

  const valid = await verifyPassword(trimmedPassword, user.password);
  if (!valid) return { ok: false, reason: 'INVALID_CREDENTIALS' };

  return { ok: true, isAdmin: false };
}
