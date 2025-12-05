import { getChecklistData, saveChecklistData } from '../../src/integrations/database/client.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Try database first (non-fatal if database not configured)
      try {
        const dbData = await getChecklistData();
        
        if (dbData) {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: true, 
              data: dbData 
            }),
          };
        }
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
        // Continue to fallback
      }

      // Fallback: return null if no data (database not configured or no data)
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          data: null 
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const dataToSave = JSON.parse(event.body || '{}');
      
      // Try to save to database (non-fatal if database not configured)
      try {
        await saveChecklistData(dataToSave);
      } catch (dbError) {
        console.error('Database error saving (non-fatal):', dbError);
        // Continue anyway - data is saved to localStorage on client side
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          data: dataToSave 
        }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Checklist API error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
    };
  }
};
