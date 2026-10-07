import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin as supabase } from './_lib/supabaseAdmin.js';
import { applyCors, requireAuth, requirePermission } from './_lib/auth.js';

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

/**
 * Check the fields of a task sent by the browser. Returns a short reason
 * when something is wrong, otherwise null. `creating` also requires the
 * fields a new task cannot do without.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateTask(task: any, creating: boolean): string | null {
  if (!task || typeof task !== 'object') return 'Invalid task';
  if (creating && (typeof task.id !== 'string' || task.id.length === 0 || task.id.length > 100)) return 'Task id required';
  if (creating || task.title !== undefined) {
    if (typeof task.title !== 'string' || task.title.trim().length === 0 || task.title.length > 255) return 'Invalid title';
  }
  if (creating || task.month !== undefined) {
    if (!Number.isInteger(task.month) || task.month < 0 || task.month > 11) return 'Invalid month';
  }
  if (task.description !== undefined && task.description !== null) {
    if (typeof task.description !== 'string' || task.description.length > 5000) return 'Invalid description';
  }
  if (task.subtasks !== undefined && (!Array.isArray(task.subtasks) || task.subtasks.length > 200)) return 'Invalid subtasks';
  if (task.assignedUsers !== undefined) {
    if (!Array.isArray(task.assignedUsers) || task.assignedUsers.length > 100 || task.assignedUsers.some((u: unknown) => typeof u !== 'string')) {
      return 'Invalid assigned users';
    }
  }
  if (task.completed !== undefined && typeof task.completed !== 'boolean') return 'Invalid completed flag';
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;
  // The årshjul is its own section - being logged in is not enough.
  if (!(await requirePermission(res, session, 'aarshjul'))) return;

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
      const task: Task = req.body || {};
      const problem = validateTask(task, true);
      if (problem) {
        return res.status(400).json({ success: false, error: problem });
      }
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

      // Replacing the whole year in one request is no longer supported. It
      // deleted every task and inserted the browser's copy, so two people
      // working at the same time overwrote each other, and a failed insert
      // left the year empty. Tasks are saved one at a time instead.
      if (tasks) {
        return res.status(400).json({
          success: false,
          error: 'BULK_UPDATE_REMOVED',
          message: 'Genindlæs siden for at gemme ændringer i årshjulet.'
        });
      }

      // Single task update
      if (id) {
        const problem = validateTask(updates, false);
        if (problem) {
          return res.status(400).json({ success: false, error: problem });
        }
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
          .maybeSingle();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        if (!data) {
          // Someone else deleted it in the meantime.
          return res.status(404).json({ success: false, error: 'TASK_NOT_FOUND' });
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
