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

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

    if (!keyId || !applicationKey || !bucketName) {
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
    const { authorizationToken, downloadUrl } = authData;

    // Download file directly by ID (no need for download authorization)
    const downloadResponse = await fetch(`${authData.downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`, {
      headers: {
        'Authorization': authorizationToken
      }
    });

    if (!downloadResponse.ok) {
      return res.status(downloadResponse.status).json({ error: 'Failed to download file' });
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');

    return res.status(200).json({
      success: true,
      data: base64,
      fileName
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
