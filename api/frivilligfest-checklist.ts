import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getChecklistData, saveChecklistData } from '../src/integrations/database/client';

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
      // Try database first
      const dbData = await getChecklistData();
      
      if (dbData) {
        return res.status(200).json({ 
          success: true, 
          data: dbData 
        });
      }

      // Fallback: return null if no data
      return res.status(200).json({ 
        success: true, 
        data: null 
      });
    }

    if (req.method === 'POST') {
      const dataToSave = req.body;
      
      await saveChecklistData(dataToSave);
      
      return res.status(200).json({ 
        success: true, 
        data: dataToSave 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Checklist API error:', error);
    return res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
