import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for serverless
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Default section order
const DEFAULT_SECTION_ORDER = ['frivillig', 'referater', 'frivilligfest', 'aarshjul'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/layout - Get section layout
  if (req.method === 'GET') {
    try {
      if (!supabase) {
        // Return default layout if Supabase is not configured
        return res.status(200).json({
          success: true,
          data: {
            sectionOrder: DEFAULT_SECTION_ORDER,
            isLocked: false
          }
        });
      }

      // Try to get layout from app_settings table
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'section_layout')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching layout:', error);
        // Return default on error
        return res.status(200).json({
          success: true,
          data: {
            sectionOrder: DEFAULT_SECTION_ORDER,
            isLocked: false
          }
        });
      }

      if (data) {
        return res.status(200).json({
          success: true,
          data: data.value
        });
      }

      // No layout saved yet, return default
      return res.status(200).json({
        success: true,
        data: {
          sectionOrder: DEFAULT_SECTION_ORDER,
          isLocked: false
        }
      });
    } catch (error) {
      console.error('Error in GET /api/layout:', error);
      return res.status(200).json({
        success: true,
        data: {
          sectionOrder: DEFAULT_SECTION_ORDER,
          isLocked: false
        }
      });
    }
  }

  // POST /api/layout - Save section layout
  if (req.method === 'POST') {
    try {
      const { sectionOrder, isLocked } = req.body;

      if (!sectionOrder || !Array.isArray(sectionOrder)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sectionOrder - must be an array'
        });
      }

      if (!supabase) {
        // If no Supabase, just return success (client will use localStorage)
        return res.status(200).json({
          success: true,
          message: 'Layout saved (localStorage only - Supabase not configured)'
        });
      }

      const layoutData = {
        sectionOrder,
        isLocked: isLocked ?? true,
        updatedAt: new Date().toISOString()
      };

      // Upsert the layout setting
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'section_layout',
          value: layoutData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Error saving layout:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save layout',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Layout saved successfully',
        data: layoutData
      });
    } catch (error) {
      console.error('Error in POST /api/layout:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
