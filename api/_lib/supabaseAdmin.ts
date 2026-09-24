/**
 * Server-only Supabase client, shared by every api/*.ts route.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level Security,
 * instead of the public anon key. This app implements its own session
 * system (api/_lib/auth.ts, api/sessions.ts) rather than Supabase Auth, so
 * there's no Supabase JWT to write RLS policies against - access control
 * has to live in these API routes, which is only safe if the anon key
 * itself can't read/write these tables directly. See
 * supabase/migrations/0001_enable_rls.sql.
 *
 * NEVER import this from src/ (browser code) - the service role key must
 * stay server-only. It intentionally has no VITE_ prefix so Vite won't
 * bundle it into client code.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (supabaseUrl && !serviceRoleKey && anonKey) {
  // Fails closed, not open: once RLS is enabled (see the migration above),
  // requests made with the anon key will be denied by Postgres itself, so
  // this fallback degrades to "the API stops working" rather than
  // "the API silently stays insecure."
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set - falling back to the anon key. ' +
    'Once Row Level Security is enabled (see supabase/migrations/0001_enable_rls.sql), ' +
    'server routes will start failing until SUPABASE_SERVICE_ROLE_KEY is set.'
  );
}

const supabaseKey = serviceRoleKey || anonKey;

export const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
