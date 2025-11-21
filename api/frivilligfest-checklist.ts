import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage (for Vercel, consider using a database or KV store for persistence)
let checklistData: any = null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ 
        success: true, 
        data: checklistData 
      });
    }

    if (req.method === 'POST') {
      checklistData = req.body;
      return res.status(200).json({ 
        success: true, 
        data: checklistData 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
