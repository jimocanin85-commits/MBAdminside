import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for serverless
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// User interface matching the frontend
interface CustomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase not configured',
      message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
    });
  }

  try {
    // GET /api/users - Get all users
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('custom_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Transform to frontend format
      const users = (data || []).map(user => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email || '',
        username: user.username,
        password: user.password,
        permissions: user.permissions || [],
        isActive: user.is_active,
        createdAt: user.created_at
      }));

      return res.status(200).json({ success: true, data: users });
    }

    // POST /api/users - Create new user
    if (req.method === 'POST') {
      const { firstName, lastName, email, username, password, permissions, isActive = true } = req.body;

      if (!firstName || !lastName || !email || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if username exists
      const { data: existing } = await supabase
        .from('custom_users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password,
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

      // Return in frontend format
      return res.status(201).json({
        success: true,
        data: {
          id: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email || '',
          username: data.username,
          password: data.password,
          permissions: data.permissions || [],
          isActive: data.is_active,
          createdAt: data.created_at
        }
      });
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
      if (password !== undefined) updates.password = password;
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

      return res.status(200).json({
        success: true,
        data: {
          id: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email || '',
          username: data.username,
          password: data.password,
          permissions: data.permissions || [],
          isActive: data.is_active,
          createdAt: data.created_at
        }
      });
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
