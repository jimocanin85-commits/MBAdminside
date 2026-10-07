/**
 * Session Management API
 * Handles single-session login limits - only one active session per user allowed
 * Admin and Brian can bypass limits and unlock other users' sessions
 * 
 * UNIQUE SESSION ENFORCEMENT:
 * - Each user can only have ONE active session at a time
 * - Sessions are tied to a specific browser/tab via browser_id
 * - When a user tries to login from another browser/tab, they get an error
 * - Admin users can force login (which terminates other sessions)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';
import { applyCors, requireAdmin, requireAuth } from './_lib/auth.js';
import { checkAdminCode, issueAdminToken } from './_lib/adminMode.js';
import { verifyCredentials } from './_lib/credentials.js';

// Session timeout in milliseconds (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Admin users who can bypass session limits and unlock others
const ADMIN_USERS = ['admin', 'Brian'];

// Session interface
interface Session {
  id: string;
  username: string;
  session_id: string;
  browser_id: string;
  created_at: string;
  last_activity: string;
  user_agent?: string;
  is_locked: boolean;
}

// In-memory fallback if Supabase is not available
const inMemorySessions: Session[] = [];

// Helper to clear array while keeping reference
function clearSessions(sessions: Session[]) {
  sessions.length = 0;
}

// Helper to remove sessions by filter
function removeSessionsWhere(sessions: Session[], predicate: (s: Session) => boolean) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (predicate(sessions[i])) {
      sessions.splice(i, 1);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Clean up expired sessions first
  await cleanupExpiredSessions();

  try {
    // GET /api/sessions - Get all active sessions (admin only). Never
    // returns session_id/browser_id - those are bearer tokens, and leaking
    // them here would let anyone impersonate the session they belong to
    // regardless of any auth check on this route.
    if (req.method === 'GET') {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const { username } = req.query;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toPublicSession = (s: any) => ({
        id: s.id,
        username: s.username,
        createdAt: s.created_at,
        lastActivity: s.last_activity,
        userAgent: s.user_agent,
        isLocked: s.is_locked,
      });

      if (supabase) {
        let query = supabase.from('user_sessions').select('*');

        if (username) {
          query = query.eq('username', username as string);
        }

        const { data, error } = await query.order('last_activity', { ascending: false });

        if (error) {
          console.error('Error fetching sessions:', error);
          // Fallback to in-memory
          const sessions = username
            ? inMemorySessions.filter(s => s.username === username)
            : inMemorySessions;
          return res.status(200).json({ success: true, data: sessions.map(toPublicSession) });
        }

        return res.status(200).json({ success: true, data: (data || []).map(toPublicSession) });
      } else {
        // In-memory fallback
        const sessions = username
          ? inMemorySessions.filter(s => s.username === username as string)
          : inMemorySessions;
        return res.status(200).json({ success: true, data: sessions.map(toPublicSession) });
      }
    }

    // POST /api/sessions - Create a new session (login), validate session, or handle sendBeacon DELETE
    if (req.method === 'POST') {
      // sendBeacon bodies can arrive as a plain string rather than parsed
      // JSON; parse them here so the checks below see an object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Request body required' });
      }

      // Handle sendBeacon DELETE requests (from beforeunload). sendBeacon
      // can't send an Authorization header, so this can only be trusted to
      // delete the one session whose ID the caller already knows (the
      // session_id itself acts as the proof) - never by username, which
      // would let anyone log out an arbitrary user with no auth at all.
      if (body._method === 'DELETE') {
        const { sessionId } = body;

        if (sessionId) {
          await deleteSession(sessionId);
          return res.status(200).json({ success: true, message: 'Session deleted via beacon' });
        }

        return res.status(200).end();
      }

      // Switch admin mode on. The code is verified here on the server (it
      // used to be a string compared in the browser) and the caller gets a
      // short-lived signed token back - see _lib/adminMode.ts.
      if (body.action === 'admin-unlock') {
        const session = await requireAuth(req, res);
        if (!session) return;

        const check = await checkAdminCode(session, body.code);
        if (check.ok === false) {
          if (check.reason === 'NOT_CONFIGURED') {
            return res.status(503).json({
              success: false,
              error: 'ADMIN_CODE_NOT_CONFIGURED',
              message: 'Admin-koden er ikke sat op på serveren endnu (ADMIN_CODE_HASH).'
            });
          }
          if (check.reason === 'TOO_MANY_ATTEMPTS') {
            return res.status(429).json({
              success: false,
              error: 'TOO_MANY_ATTEMPTS',
              message: 'For mange forkerte forsøg. Prøv igen om lidt.'
            });
          }
          return res.status(401).json({
            success: false,
            error: 'INVALID_CODE',
            message: 'Forkert adgangskode'
          });
        }

        const issued = issueAdminToken(session);
        if (!issued) {
          return res.status(500).json({ success: false, error: 'Server misconfigured' });
        }

        return res.status(200).json({
          success: true,
          token: issued.token,
          expiresAt: issued.expiresAt,
          isAdmin: session.isAdmin
        });
      }

      // Handle session validation request
      if (body.action === 'validate') {
        const { sessionId, browserId, username } = body;
        
        if (!sessionId || !browserId || !username) {
          return res.status(400).json({ 
            valid: false, 
            error: 'Missing sessionId, browserId, or username' 
          });
        }

        // Check if session exists and matches browser
        const session = await getSessionByIdAndBrowser(sessionId, browserId);
        
        if (!session) {
          // Session doesn't exist or browser doesn't match
          return res.status(200).json({ 
            valid: false, 
            error: 'SESSION_INVALID',
            message: 'Din session er ikke gyldig. Log venligst ind igen.'
          });
        }

        // Check if session belongs to the correct user
        if (session.username !== username) {
          return res.status(200).json({ 
            valid: false, 
            error: 'SESSION_USER_MISMATCH',
            message: 'Session tilhører en anden bruger.'
          });
        }

        // Update last activity
        await updateSessionActivity(sessionId);

        return res.status(200).json({ 
          valid: true, 
          isAdmin: ADMIN_USERS.includes(session.username),
          session: {
            username: session.username,
            createdAt: session.created_at,
            lastActivity: session.last_activity
          }
        });
      }
      
      const { username, password, sessionId, browserId, userAgent, forceLogin } = body;

      if (!username || !sessionId || !browserId) {
        return res.status(400).json({ error: 'Username, sessionId, and browserId are required' });
      }

      // This is the login endpoint: credentials are verified here, on the
      // server, before any session is created. (There used to be a separate
      // /api/login that checked the same credentials first; it was folded
      // into this route so the project stays within Vercel's limit of 12
      // serverless functions per deployment on the Hobby plan.)
      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }
      const credCheck = await verifyCredentials(String(username), String(password));
      if (credCheck.ok === false) {
        if (credCheck.reason === 'USER_DISABLED') {
          return res.status(403).json({ error: 'USER_DISABLED', message: credCheck.message });
        }
        if (credCheck.reason === 'SERVER_MISCONFIGURED') {
          return res.status(500).json({ error: 'Server misconfigured' });
        }
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      }


      const isAdmin = credCheck.isAdmin;
      // Only the admin accounts may take over an existing session. The flag
      // comes from the browser, so it is never trusted on its own.
      const mayForceLogin = Boolean(forceLogin) && isAdmin;

      // Check if user already has an active session
      const existingSession = await getActiveSession(username);
      
      if (existingSession && !mayForceLogin) {
        // Check if it's the same browser trying to reconnect
        if (existingSession.browser_id === browserId) {
          // Same browser - allow reconnection, update the session
          await updateSessionActivity(existingSession.session_id);
          return res.status(200).json({ 
            success: true, 
            isAdmin,
            data: existingSession,
            message: 'Session genoprettet'
          });
        }
        
        // Admin and Brian can always log in (force login)
        if (ADMIN_USERS.includes(username)) {
          // Clear existing session and create new one
          await deleteSession(existingSession.session_id);
        } else {
          return res.status(409).json({ 
            error: 'SESSION_EXISTS',
            message: 'Log ud fra den anden fane/browser først for at kunne logge ind her.',
            existingSession: {
              createdAt: existingSession.created_at,
              lastActivity: existingSession.last_activity,
              userAgent: existingSession.user_agent
            }
          });
        }
      }

      // Create new session with browser_id
      const newSession: Session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username,
        session_id: sessionId,
        browser_id: browserId,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        user_agent: userAgent || 'Unknown',
        is_locked: false
      };

      if (supabase) {
        const { data, error } = await supabase
          .from('user_sessions')
          .insert([{
            username: newSession.username,
            session_id: newSession.session_id,
            browser_id: newSession.browser_id,
            created_at: newSession.created_at,
            last_activity: newSession.last_activity,
            user_agent: newSession.user_agent,
            is_locked: false
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          // Fallback to in-memory
          inMemorySessions.push(newSession);
          return res.status(201).json({ success: true, isAdmin, data: newSession });
        }

        return res.status(201).json({ success: true, isAdmin, data });
      } else {
        // In-memory fallback
        inMemorySessions.push(newSession);
        return res.status(201).json({ success: true, isAdmin, data: newSession });
      }
    }

    // PUT /api/sessions - Update session (heartbeat/activity)
    if (req.method === 'PUT') {
      const { sessionId, action, targetUsername } = req.body;

      // Handle unlock action (admin only) - this used to be admin-only in
      // name only; nothing actually checked who was calling it.
      if (action === 'unlock' && targetUsername) {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        if (supabase) {
          const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('username', targetUsername);

          if (error) {
            console.error('Error unlocking session:', error);
            // Fallback to in-memory
            removeSessionsWhere(inMemorySessions, s => s.username === targetUsername);
          }
        } else {
          removeSessionsWhere(inMemorySessions, s => s.username === targetUsername);
        }
        return res.status(200).json({ success: true, message: `Session for ${targetUsername} unlocked` });
      }

      // Handle heartbeat (update last activity)
      if (sessionId) {
        if (supabase) {
          const { data, error } = await supabase
            .from('user_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_id', sessionId)
            .select()
            .single();

          if (error) {
            console.error('Error updating session:', error);
            // Fallback to in-memory
            const idx = inMemorySessions.findIndex(s => s.session_id === sessionId);
            if (idx !== -1) {
              inMemorySessions[idx].last_activity = new Date().toISOString();
              return res.status(200).json({ success: true, data: inMemorySessions[idx] });
            }
            return res.status(404).json({ error: 'Session not found' });
          }

          return res.status(200).json({ success: true, data });
        } else {
          const idx = inMemorySessions.findIndex(s => s.session_id === sessionId);
          if (idx !== -1) {
            inMemorySessions[idx].last_activity = new Date().toISOString();
            return res.status(200).json({ success: true, data: inMemorySessions[idx] });
          }
          return res.status(404).json({ error: 'Session not found' });
        }
      }

      return res.status(400).json({ error: 'SessionId or action required' });
    }

    // DELETE /api/sessions - Delete session (logout)
    if (req.method === 'DELETE') {
      const { sessionId, username } = req.body;

      // Deleting your own session by its ID needs no further auth - the
      // session_id is itself the proof of ownership.
      if (sessionId) {
        await deleteSession(sessionId);
        return res.status(200).json({ success: true, message: 'Session deleted' });
      }

      // Deleting someone else's session(s) by username is an admin action.
      if (username) {
        const admin = await requireAdmin(req, res);
        if (!admin) return;

        if (supabase) {
          const { error } = await supabase
            .from('user_sessions')
            .delete()
            .eq('username', username);

          if (error) {
            console.error('Error deleting sessions by username:', error);
            removeSessionsWhere(inMemorySessions, s => s.username === username);
          }
        } else {
          removeSessionsWhere(inMemorySessions, s => s.username === username);
        }
        return res.status(200).json({ success: true, message: 'Sessions deleted for user' });
      }

      return res.status(400).json({ error: 'SessionId or username required' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Sessions API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to get active session for a user
async function getActiveSession(username: string): Promise<Session | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      // Check in-memory as fallback
      return inMemorySessions.find(s => s.username === username) || null;
    }

    return data as Session;
  } else {
    return inMemorySessions.find(s => s.username === username) || null;
  }
}

// Helper function to get session by ID and browser ID
async function getSessionByIdAndBrowser(sessionId: string, browserId: string): Promise<Session | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('browser_id', browserId)
      .single();

    if (error || !data) {
      // Check in-memory as fallback
      return inMemorySessions.find(s => s.session_id === sessionId && s.browser_id === browserId) || null;
    }

    return data as Session;
  } else {
    return inMemorySessions.find(s => s.session_id === sessionId && s.browser_id === browserId) || null;
  }
}

// Helper function to update session activity timestamp
async function updateSessionActivity(sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  
  if (supabase) {
    await supabase
      .from('user_sessions')
      .update({ last_activity: now })
      .eq('session_id', sessionId);
  }
  
  // Also update in-memory
  const idx = inMemorySessions.findIndex(s => s.session_id === sessionId);
  if (idx !== -1) {
    inMemorySessions[idx].last_activity = now;
  }
}

// Helper function to delete a session by session_id
async function deleteSession(sessionId: string) {
  if (supabase) {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
    }
  }
  // Also clean in-memory
  removeSessionsWhere(inMemorySessions, s => s.session_id === sessionId);
}

// Clean up expired sessions
async function cleanupExpiredSessions() {
  const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT).toISOString();
  
  if (supabase) {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_activity', cutoffTime);

    if (error) {
      console.error('Error cleaning up sessions:', error);
    }
  }
  
  // Also clean in-memory - remove sessions that are older than the timeout
  removeSessionsWhere(inMemorySessions, s => {
    const lastActivity = new Date(s.last_activity).getTime();
    return Date.now() - lastActivity >= SESSION_TIMEOUT;
  });
}
