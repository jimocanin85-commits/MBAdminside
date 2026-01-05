import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    connection: {},
    table: {}
  };

  // Check environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  results.environment = {
    VITE_SUPABASE_URL: supabaseUrl ? '✅ Set' : '❌ Missing',
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing',
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set'
  };

  if (!supabaseUrl || !supabaseKey) {
    results.connection = {
      status: '❌ Failed',
      error: 'Missing Supabase URL or API key'
    };
    return res.status(200).json(results);
  }

  // Try to connect
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    results.connection = {
      status: '✅ Client created',
      url: supabaseUrl
    };

    // Try to query the custom_users table
    const { data, error, count } = await supabase
      .from('custom_users')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      results.table = {
        status: '❌ Error',
        error: error.message,
        hint: error.hint || 'Make sure the custom_users table exists',
        code: error.code
      };
    } else {
      results.table = {
        status: '✅ Connected',
        tableName: 'custom_users',
        rowCount: count || 0,
        sampleData: data?.map(u => ({ 
          id: u.id?.substring(0, 10) + '...', 
          username: u.username,
          is_active: u.is_active 
        })) || []
      };
    }

  } catch (error) {
    results.connection = {
      status: '❌ Connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Overall status
  const allGood = 
    results.environment.VITE_SUPABASE_URL?.includes('✅') &&
    results.connection.status?.includes('✅') &&
    results.table.status?.includes('✅');

  results.overall = allGood 
    ? '✅ Everything is working! Users will sync across devices.'
    : '⚠️ Some issues found - check details above';

  return res.status(200).json(results);
}
