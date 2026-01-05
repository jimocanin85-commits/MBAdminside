import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for serverless
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  subtasks: Subtask[];
  assignedUsers: string[];
  completed: boolean;
  month: number;
  createdAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({ 
      success: false,
      error: 'Supabase not configured',
      message: 'Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
    });
  }

  try {
    // GET /api/tasks - Get all tasks
    if (req.method === 'GET') {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('aarshjul_tasks')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          return res.status(200).json({ success: true, data: [] });
        }
        throw error;
      }

      // Transform from DB format to frontend format
      const tasks = (data || []).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        subtasks: row.subtasks || [],
        assignedUsers: row.assigned_users || [],
        completed: row.completed,
        month: row.month,
        createdAt: row.created_at
      }));

      return res.status(200).json({ success: true, data: tasks });
    }

    // POST /api/tasks - Create a new task
    if (req.method === 'POST') {
      const task: Task = req.body;
      const year = new Date().getFullYear();

      const { data, error } = await supabase
        .from('aarshjul_tasks')
        .insert([{
          id: task.id,
          title: task.title,
          description: task.description || null,
          subtasks: task.subtasks || [],
          assigned_users: task.assignedUsers || [],
          completed: task.completed || false,
          month: task.month,
          year: year,
          created_at: task.createdAt || new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return res.status(201).json({ 
        success: true, 
        data: {
          id: data.id,
          title: data.title,
          description: data.description,
          subtasks: data.subtasks || [],
          assignedUsers: data.assigned_users || [],
          completed: data.completed,
          month: data.month,
          createdAt: data.created_at
        }
      });
    }

    // PUT /api/tasks - Update task(s)
    if (req.method === 'PUT') {
      const { tasks, id, ...updates } = req.body;

      // Bulk update - replace all tasks for current year
      if (tasks) {
        const year = new Date().getFullYear();
        
        // Delete existing tasks for this year
        await supabase
          .from('aarshjul_tasks')
          .delete()
          .eq('year', year);

        // Insert new tasks
        if (tasks.length > 0) {
          const tasksToInsert = tasks.map((task: Task) => ({
            id: task.id,
            title: task.title,
            description: task.description || null,
            subtasks: task.subtasks || [],
            assigned_users: task.assignedUsers || [],
            completed: task.completed || false,
            month: task.month,
            year: year,
            created_at: task.createdAt || new Date().toISOString()
          }));

          const { error } = await supabase
            .from('aarshjul_tasks')
            .insert(tasksToInsert);

          if (error) {
            console.error('Supabase error:', error);
            throw error;
          }
        }

        return res.status(200).json({ success: true, message: 'Tasks updated' });
      }

      // Single task update
      if (id) {
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks;
        if (updates.assignedUsers !== undefined) updateData.assigned_users = updates.assignedUsers;
        if (updates.completed !== undefined) updateData.completed = updates.completed;
        if (updates.month !== undefined) updateData.month = updates.month;

        const { data, error } = await supabase
          .from('aarshjul_tasks')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        return res.status(200).json({ 
          success: true, 
          data: {
            id: data.id,
            title: data.title,
            description: data.description,
            subtasks: data.subtasks || [],
            assignedUsers: data.assigned_users || [],
            completed: data.completed,
            month: data.month,
            createdAt: data.created_at
          }
        });
      }

      return res.status(400).json({ error: 'Task ID or tasks array required' });
    }

    // DELETE /api/tasks - Delete a task
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Task ID required' });
      }

      const { error } = await supabase
        .from('aarshjul_tasks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return res.status(200).json({ success: true, message: 'Task deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
