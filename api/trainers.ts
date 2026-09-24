import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAllTrainers,
  getTrainerById,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  type Trainer
} from '../src/integrations/database/client.js';
import { applyCors, requireAuth } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Trainer records include personal data (birthdate, phone, email) - require
  // a logged-in session for every operation, not just the destructive ones.
  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    // GET /api/trainers - Get all trainers
    if (req.method === 'GET') {
      const { id } = req.query;

      if (id) {
        // Get single trainer
        const trainer = await getTrainerById(Number(id));
        if (!trainer) {
          return res.status(404).json({ error: 'Trainer not found' });
        }
        return res.status(200).json({ success: true, data: trainer });
      }

      // Get all trainers
      const trainers = await getAllTrainers();
      return res.status(200).json({ success: true, data: trainers });
    }

    // POST /api/trainers - Create new trainer
    if (req.method === 'POST') {
      const trainer = await createTrainer(req.body as Trainer);
      return res.status(201).json({ success: true, data: trainer });
    }

    // PUT /api/trainers - Update trainer (id in body)
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Trainer ID required' });
      }

      const trainer = await updateTrainer(Number(id), updates);
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }
      return res.status(200).json({ success: true, data: trainer });
    }

    // DELETE /api/trainers - Delete trainer (id in body)
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Trainer ID required' });
      }

      await deleteTrainer(Number(id));
      return res.status(200).json({ success: true, message: 'Trainer deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Trainers API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
