import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileId } = req.body;

    if (!fileName || !fileId) {
      return res.status(400).json({ error: 'fileName and fileId are required' });
    }

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;

    if (!keyId || !applicationKey) {
      return res.status(500).json({ error: 'Backblaze credentials not configured' });
    }

    // Authorize
    const authString = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!authResponse.ok) {
      return res.status(authResponse.status).json({ error: 'Backblaze authorization failed' });
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
      return res.status(deleteResponse.status).json({ 
        error: 'Delete failed', 
        details: errorText 
      });
    }

    const deleteResult = await deleteResponse.json();

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      fileId: deleteResult.fileId,
      fileName: deleteResult.fileName
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
