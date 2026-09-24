import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from './_lib/auth.js';
import { getChecklistData, saveChecklistData } from '../src/integrations/database/client.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;

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
