/**
 * Server-side "admin mode".
 *
 * WHY THIS EXISTS
 * ----------------
 * The admin code used to be a string literal compared in the browser
 * (AdminPortal.tsx / CloudFiles.tsx), so anyone could read it from the
 * JavaScript bundle and "admin mode" was only a visual lock. Now:
 *
 *  - The code is checked here, against a bcrypt hash in ADMIN_CODE_HASH.
 *  - A successful check returns a short-lived, HMAC-signed token bound to
 *    the caller's session. The browser sends it back as `X-Admin-Token`.
 *  - Routes that change shared state (portal layout, deleting files) call
 *    requireAdminMode(), so the lock is enforced by the server.
 *
 * The two built-in admin accounts (see ADMIN_USERS in auth.ts) have already
 * proven who they are with a server-verified password, so they can switch
 * admin mode on without the extra code.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VerifiedSession } from './auth.js';
import { verifyPassword } from './passwords.js';

// How long admin mode stays switched on before the code is needed again.
const ADMIN_MODE_TTL_MS = 2 * 60 * 60 * 1000;

// Failed-attempt limiter. In-memory only (serverless instances come and
// go), so it slows guessing down rather than stopping it outright - bcrypt
// does the rest. Pick a code longer than four digits.
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

function getSecret(): string {
  return (
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_PASSWORD_HASH ||
    ''
  );
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export type AdminCodeResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID_CODE' | 'NOT_CONFIGURED' | 'TOO_MANY_ATTEMPTS' };

/**
 * Decide whether this session may switch admin mode on.
 */
export async function checkAdminCode(session: VerifiedSession, code: unknown): Promise<AdminCodeResult> {
  if (session.isAdmin) return { ok: true };

  const hash = process.env.ADMIN_CODE_HASH;
  if (!hash) return { ok: false, reason: 'NOT_CONFIGURED' };

  const now = Date.now();
  const attempts = failedAttempts.get(session.sessionId);
  if (attempts && now - attempts.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(session.sessionId);
  } else if (attempts && attempts.count >= MAX_FAILED_ATTEMPTS) {
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  const valid = typeof code === 'string' && code.length > 0 && (await verifyPassword(code.trim(), hash));
  if (!valid) {
    const current = failedAttempts.get(session.sessionId);
    failedAttempts.set(session.sessionId, {
      count: (current?.count || 0) + 1,
      firstAt: current?.firstAt || now,
    });
    return { ok: false, reason: 'INVALID_CODE' };
  }

  failedAttempts.delete(session.sessionId);
  return { ok: true };
}

/**
 * Create a signed admin-mode token for this session, or null if the server
 * has no secret to sign with.
 */
export function issueAdminToken(session: VerifiedSession): { token: string; expiresAt: number } | null {
  const secret = getSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + ADMIN_MODE_TTL_MS;
  const signature = sign(`${session.sessionId}.${expiresAt}`, secret);
  return { token: `${expiresAt}.${signature}`, expiresAt };
}

/**
 * True when the request carries a valid, unexpired admin-mode token that
 * was issued to this exact session.
 */
export function hasAdminMode(req: VercelRequest, session: VerifiedSession): boolean {
  const secret = getSecret();
  if (!secret) return false;

  const header = req.headers['x-admin-token'];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) return false;

  const separator = token.indexOf('.');
  if (separator <= 0) return false;

  const expiresAt = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(`${session.sessionId}.${expiresAt}`, secret);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

/**
 * Require admin mode. Writes a 403 and returns false if it is not active,
 * so callers can `if (!requireAdminMode(req, res, session)) return;`.
 */
export function requireAdminMode(req: VercelRequest, res: VercelResponse, session: VerifiedSession): boolean {
  if (hasAdminMode(req, session)) return true;
  res.status(403).json({
    success: false,
    error: 'ADMIN_MODE_REQUIRED',
    message: 'Slå admin-tilstand til for at fortsætte.',
  });
  return false;
}
