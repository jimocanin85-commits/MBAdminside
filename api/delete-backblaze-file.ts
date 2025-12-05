const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, fileId } = body;

    if (!fileName || !fileId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'fileName and fileId are required' }),
      };
    }

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;

    if (!keyId || !applicationKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Backblaze credentials not configured' }),
      };
    }

    // Authorize
    const authString = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!authResponse.ok) {
      return {
        statusCode: authResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Backblaze authorization failed' }),
      };
    }

    const authData = await authResponse.json();
    const { authorizationToken, apiUrl } = authData;

    // Delete file
    const deleteResponse = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: fileName,
        fileId: fileId
      })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      return {
        statusCode: deleteResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Delete failed', 
          details: errorText 
        }),
      };
    }

    const deleteResult = await deleteResponse.json();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'File deleted successfully',
        fileId: deleteResult.fileId,
        fileName: deleteResult.fileName
      }),
    };

  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};
