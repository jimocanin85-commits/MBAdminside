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
      // Try database first (non-fatal if database not configured)
      try {
        const dbData = await getChecklistData();
        
        if (dbData) {
          return res.status(200).json({ 
            success: true, 
            data: dbData 
          });
        }
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
        // Continue to fallback
      }

      // Fallback: return null if no data (database not configured or no data)
      return res.status(200).json({ 
        success: true, 
        data: null 
      });
    }

    if (req.method === 'POST') {
      const dataToSave = req.body;
      
      // Try to save to database (non-fatal if database not configured)
      try {
        await saveChecklistData(dataToSave);
      } catch (dbError) {
        console.error('Database error saving (non-fatal):', dbError);
        // Continue anyway - data is saved to localStorage on client side
      }
      
      return res.status(200).json({ 
        success: true, 
        data: dataToSave 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Checklist API error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
}
