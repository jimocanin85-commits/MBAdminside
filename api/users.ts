import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin';
import { applyCors, requireAuth, requireAdmin } from './_lib/auth';
import { hashPassword } from './_lib/passwords';

// Public-safe shape returned to the client. `password`/hash is NEVER
// included - previously this leaked every user's plaintext password.
function toPublicUser(user: any) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email || '',
    username: user.username,
    permissions: user.permissions || [],
    isActive: user.is_active,
    createdAt: user.created_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Every operation below needs a logged-in session, including GET - the
  // user list (names/emails/usernames/permissions) is not public data.
  const session = await requireAuth(req, res);
  if (!session) return;

  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase not configured',
      message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
    });
  }

  try {
    // GET /api/users - list users (no password/hash ever included)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('custom_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data: (data || []).map(toPublicUser) });
    }

    // Everything below creates/modifies/deletes accounts - admin only.
    const admin = await requireAdmin(req, res);
    if (!admin) return; // requireAdmin already sent the 401/403 response

    // POST /api/users - Create new user
    if (req.method === 'POST') {
      const { firstName, lastName, email, username, password, permissions, isActive = true } = req.body;

      if (!firstName || !lastName || !email || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: existing } = await supabase
        .from('custom_users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const passwordHash = await hashPassword(password);

      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password: passwordHash, // column name kept for compat; value is now a bcrypt hash
        permissions: permissions || [],
        is_active: isActive,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('custom_users')
        .insert([newUser])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ success: true, data: toPublicUser(data) });
    }

    // PUT /api/users - Update user
    if (req.method === 'PUT') {
      const { id, firstName, lastName, email, username, password, permissions, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const updates: any = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (email !== undefined) updates.email = email;
      if (username !== undefined) updates.username = username;
      if (password) updates.password = await hashPassword(password); // only rehash if a new password was actually given
      if (permissions !== undefined) updates.permissions = permissions;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from('custom_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({ success: true, data: toPublicUser(data) });
    }

    // DELETE /api/users - Delete user
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const { error } = await supabase
        .from('custom_users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, message: 'User deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
