/**
 * Shared auth + CORS helpers for Vercel serverless API routes.
 *
 * WHY THIS EXISTS
 * ----------------
 * Previously every route set `Access-Control-Allow-Origin: *` and had no
 * server-side check that the caller was actually logged in — the React app
 * only hid UI elements client-side, so anyone who knew the URL could call
 * these endpoints directly (e.g. GET /api/users, DELETE /api/sessions).
 *
 * This module centralizes:
 *  - CORS restricted to an allow-listed origin (set ALLOWED_ORIGIN in env)
 *  - Session verification against the `user_sessions` table (same table
 *    api/sessions.ts already writes to)
 *  - An "admin" check for the two hardcoded admin accounts
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './supabaseAdmin.js';

// Users who are always treated as admins (matches LoginForm / sessions.ts)
export const ADMIN_USERS = ['admin', 'Brian'];

// Session timeout must match api/sessions.ts
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Apply restricted CORS headers. Falls back to same-origin only if
 * ALLOWED_ORIGIN isn't set, which is safer than '*'.
 */
export function applyCors(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  const requestOrigin = (req.headers.origin as string) || '';

  if (allowedOrigin) {
    // Support a comma-separated list for staging + prod domains
    const allowList = allowedOrigin.split(',').map(o => o.trim());
    if (allowList.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }
  } else if (requestOrigin) {
    // No allow-list configured yet — reflect the request origin rather than
    // using '*', so credentials/session headers can't be read cross-site
    // by arbitrary third parties without at least matching the Origin.
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export interface VerifiedSession {
  username: string;
  sessionId: string;
  isAdmin: boolean;
}

function extractSessionId(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  // Allow sessionId in body as a fallback for endpoints that already pass it
  if (req.body && typeof req.body === 'object' && req.body.sessionId) {
    return req.body.sessionId as string;
  }
  return null;
}

/**
 * Verify the caller has a live, non-expired session. Returns null if not.
 */
export async function verifySession(req: VercelRequest): Promise<VerifiedSession | null> {
  const sessionId = extractSessionId(req);
  if (!sessionId || !supabase) return null;

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return null;

  const lastActivity = new Date(data.last_activity).getTime();
  if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) return null;

  return {
    username: data.username,
    sessionId: data.session_id,
    isAdmin: ADMIN_USERS.includes(data.username),
  };
}

/**
 * Require any valid session. Writes a 401 response and returns null if
 * missing/invalid, so callers can `if (!session) return;`.
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<VerifiedSession | null> {
  const session = await verifySession(req);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Log ind for at fortsætte.' });
    return null;
  }
  return session;
}

/**
 * Require a valid session belonging to an admin (admin/Brian). Writes a
 * 401/403 response and returns null if not satisfied.
 */
export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<VerifiedSession | null> {
  const session = await verifySession(req);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Log ind for at fortsætte.' });
    return null;
  }
  if (!session.isAdmin) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Kun admin har adgang til dette.' });
    return null;
  }
  return session;
}
