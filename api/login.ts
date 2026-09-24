/**
 * POST /api/login
 *
 * Verifies credentials on the server. This replaces the old approach where
 * LoginForm.tsx compared passwords in the browser against a hardcoded object
 * and against the full (plaintext) response of GET /api/users.
 *
 * Response NEVER includes the password/hash. On success it returns just
 * { success: true, username, isAdmin }. Note: this endpoint alone does NOT
 * create a session - the client still calls /api/sessions afterwards, and
 * /api/sessions independently re-verifies the same credentials (see
 * verifyCredentials in _lib/credentials.ts) so that endpoint can't be used
 * to mint a session without a valid password either.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/auth';
import { verifyCredentials } from './_lib/credentials';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = await verifyCredentials(String(username), String(password));

  if (!result.ok) {
    if (result.reason === 'SERVER_MISCONFIGURED') {
      return res.status(500).json({ error: 'Server misconfigured' });
    }
    if (result.reason === 'USER_DISABLED') {
      return res.status(403).json({ error: 'USER_DISABLED', message: result.message });
    }
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  return res.status(200).json({ success: true, username: String(username).trim(), isAdmin: result.isAdmin });
}
