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
    // Vercel automatically parses JSON body, but handle edge cases
    let body = req.body;
    
    // If body is undefined or null, try to read from raw body
    if (!body && (req as any).body) {
      body = (req as any).body;
    }
    
    // If body is still a string, parse it
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse body as JSON:', e);
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    // If body is still not an object, return error
    if (!body || typeof body !== 'object') {
      console.error('Body is not an object:', { bodyType: typeof body, body });
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    console.log('Upload request received:', {
      method: req.method,
      hasBody: !!body,
      bodyType: typeof body,
      bodyKeys: body ? Object.keys(body) : [],
      fileName: body?.fileName,
      hasFileData: !!body?.fileData,
      fileDataType: typeof body?.fileData,
      fileDataLength: body?.fileData ? (typeof body.fileData === 'string' ? body.fileData.length : 'not-string') : 0,
      folder: body?.folder
    });

    const { fileName, fileData, folder } = body;

    if (!fileName || !fileData) {
      console.error('Missing required fields:', { 
        fileName: !!fileName, 
        fileData: !!fileData,
        fileNameValue: fileName,
        fileDataType: typeof fileData,
        fileDataPreview: typeof fileData === 'string' ? fileData.substring(0, 50) : fileData
      });
      return res.status(400).json({ 
        error: 'fileName and fileData are required',
        received: {
          hasFileName: !!fileName,
          hasFileData: !!fileData,
          hasFolder: !!folder,
          fileNameValue: fileName,
          fileDataType: typeof fileData
        }
      });
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
    let contentType = 'application/octet-stream';
    
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Extract content type from data URL
      const dataUrlMatch = fileData.match(/^data:([^;]+);base64,/);
      if (dataUrlMatch) {
        contentType = dataUrlMatch[1];
      }
      
      const base64Index = fileData.indexOf('base64,');
      if (base64Index !== -1) {
        base64Data = fileData.substring(base64Index + 7);
      }
    }

    // Validate base64Data
    if (!base64Data || typeof base64Data !== 'string') {
      console.error('Invalid fileData format:', { 
        fileDataType: typeof fileData,
        fileDataPreview: typeof fileData === 'string' ? fileData.substring(0, 100) : fileData
      });
      return res.status(400).json({ error: 'Invalid fileData format' });
    }

    // Convert base64 to buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64Data, 'base64');
      if (fileBuffer.length === 0) {
        return res.status(400).json({ error: 'Empty file buffer after base64 decode' });
      }
    } catch (error) {
      console.error('Failed to decode base64:', error);
      return res.status(400).json({ error: 'Invalid base64 data' });
    }

    // Upload file - use full path based on folder parameter
    // Default to Frivillige/ if no folder specified, otherwise use specified folder
    const fullPath = folder ? `${folder}/${fileName}` : `Frivillige/${fileName}`;
    
    // Before uploading, check if there's a file with the same name in root and delete all versions
    // This only applies to Frivillige/ folder uploads, not Referater/ folder uploads
    if (!folder || folder === 'Frivillige') {
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
    }
    
    // Upload file
    // Use dynamic content type based on file, but default to application/octet-stream for safety
    const uploadContentType = contentType || 'application/octet-stream';
    
    console.log('Uploading to Backblaze:', {
      fullPath,
      contentType: uploadContentType,
      fileSize: fileBuffer.length
    });
    
    const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadUrlData.authorizationToken,
        'X-Bz-File-Name': fullPath,
        'Content-Type': uploadContentType,
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
