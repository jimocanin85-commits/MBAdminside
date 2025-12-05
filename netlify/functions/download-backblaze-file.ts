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

    if (!fileId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'fileId is required' }),
      };
    }

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

    if (!keyId || !applicationKey || !bucketName) {
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
    const { authorizationToken, downloadUrl } = authData;

    // Download file directly by ID (no need for download authorization)
    const downloadResponse = await fetch(`${authData.downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`, {
      headers: {
        'Authorization': authorizationToken
      }
    });

    if (!downloadResponse.ok) {
      return {
        statusCode: downloadResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to download file' }),
      };
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: base64,
        fileName
      }),
    };

  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};
