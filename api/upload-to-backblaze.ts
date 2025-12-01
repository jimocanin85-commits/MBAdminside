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
    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
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
    const { authorizationToken, apiUrl } = authData;

    // Get bucket ID
    const bucketsResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: authData.accountId })
    });

    const bucketsData = await bucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      return res.status(404).json({ error: `Bucket '${bucketName}' not found` });
    }

    // Get upload URL
    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId: bucket.bucketId })
    });

    if (!uploadUrlResponse.ok) {
      return res.status(uploadUrlResponse.status).json({ error: 'Failed to get upload URL' });
    }

    const uploadUrlData = await uploadUrlResponse.json();

    // Extract base64 from data URL if needed (format: data:application/...;base64,XXX)
    let base64Data = fileData;
    if (fileData.startsWith('data:')) {
      const base64Index = fileData.indexOf('base64,');
      if (base64Index !== -1) {
        base64Data = fileData.substring(base64Index + 7);
      }
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Upload file - use full path to ensure we overwrite the correct file
    const fullPath = `Frivillige/${fileName}`;
    
    // Before uploading, check if there's a file with the same name in root and delete all versions
    // This ensures we only have one version of each file in Frivillige/ folder
    try {
      const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
        method: 'POST',
        headers: {
          'Authorization': authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketId: bucket.bucketId,
          startFileName: fileName,
          maxFileCount: 100
        })
      });

      if (listFilesResponse.ok) {
        const listData = await listFilesResponse.json();
        // Find all files in root (not in Frivillige/) with this name
        const rootFiles = listData.files?.filter((f: any) => 
          f.fileName === fileName && !f.fileName.startsWith('Frivillige/')
        ) || [];

        // Delete all versions in root
        for (const rootFile of rootFiles) {
          console.log(`Found duplicate file in root: ${rootFile.fileName} (${rootFile.fileId}), deleting it...`);
          const deleteResponse = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
            method: 'POST',
            headers: {
              'Authorization': authorizationToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: rootFile.fileName,
              fileId: rootFile.fileId
            })
          });

          if (deleteResponse.ok) {
            console.log(`Successfully deleted duplicate file: ${rootFile.fileName}`);
          } else {
            const errorText = await deleteResponse.text();
            console.warn(`Failed to delete duplicate file: ${rootFile.fileName}`, errorText);
          }
        }
      }
    } catch (error) {
      console.warn('Error checking for duplicate files:', error);
      // Continue with upload even if check fails
    }
    
    // Upload file
    const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fullPath,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Bz-Content-Sha1': 'do_not_verify',
        'Content-Length': fileBuffer.length.toString()
      },
      body: fileBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return res.status(uploadResponse.status).json({ 
        error: 'Upload failed', 
        details: errorText 
      });
    }

    const uploadResult = await uploadResponse.json();

    return res.status(200).json({
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
