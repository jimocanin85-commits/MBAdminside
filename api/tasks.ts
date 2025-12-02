import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock data - skal erstattes med database queries
const mockTasks = [
  // Add mock tasks here when needed
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // TODO: Replace with actual database query
      // const tasks = await db.query('SELECT * FROM tasks WHERE aar = $1', [year]);
      return res.status(200).json(mockTasks);
    }

    if (req.method === 'POST') {
      const task = req.body;
      // TODO: Replace with actual database insert
      // const newTask = await db.query('INSERT INTO tasks ...');
      return res.status(201).json({ ...task, id: Date.now().toString() });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      // TODO: Replace with actual database update
      return res.status(200).json({ id, ...updates });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      // TODO: Replace with actual database delete
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
