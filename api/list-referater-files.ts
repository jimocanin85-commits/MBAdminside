import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle POST for listing files by year
  if (req.method === 'POST') {
    const { year } = req.body;
    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }
    
    try {
      const keyId = process.env.BACKBLAZE_KEY_ID;
      const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
      const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

      if (!keyId || !applicationKey || !bucketName) {
        return res.status(200).json({ 
          success: true,
          files: [],
          error: 'Backblaze credentials not configured'
        });
      }

      // Authorize account
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

      // List files from specific year folder
      const folderPath = `Referater/${year}/`;
      const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
        method: 'POST',
        headers: {
          'Authorization': authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketId: bucket.bucketId,
          startFileName: folderPath,
          maxFileCount: 10000
        })
      });

      if (!listFilesResponse.ok) {
        return res.status(listFilesResponse.status).json({ error: 'Failed to list files' });
      }

      const filesData = await listFilesResponse.json();

      if (!filesData.files || filesData.files.length === 0) {
        return res.status(200).json({
          success: true,
          files: [],
          year
        });
      }

      // Only include files from the specific year folder
      const fileMap = new Map<string, any>();
      
      filesData.files.forEach((file: any) => {
        // Only process files in Referater/{year}/ folder
        if (!file.fileName.startsWith(folderPath)) {
          return;
        }
        
        let displayName = file.fileName;
        if (displayName.includes('/')) {
          displayName = displayName.split('/').pop() || displayName;
        }
        
        // Skip system files
        if (displayName.startsWith('.')) {
          return;
        }
        
        // Only keep the latest version (by upload timestamp)
        const existing = fileMap.get(displayName);
        if (!existing || file.uploadTimestamp > existing.uploadTimestamp) {
          fileMap.set(displayName, file);
        }
      });

      // Format the file list
      const files = Array.from(fileMap.values()).map((file: any) => {
        const displayName = file.fileName.includes('/') 
          ? file.fileName.split('/').pop() 
          : file.fileName;
        
        // Decode display name for user-friendly display (Backblaze stores encoded names)
        const decodedDisplayName = decodeURIComponent(displayName);
        
        // For download URL, use the file name as stored in Backblaze (may be encoded)
        // Backblaze download URLs work with the stored file name format
        const downloadUrl = `${authData.downloadUrl}/file/${bucketName}/${file.fileName}`;
        
        return {
          fileName: decodedDisplayName, // Show decoded name to user
          fullPath: file.fileName, // Keep encoded path for API operations
          fileId: file.fileId,
          size: file.contentLength,
          uploadTimestamp: file.uploadTimestamp,
          downloadUrl
        };
      });

      // Sort by filename
      files.sort((a, b) => a.fileName.localeCompare(b.fileName));

      return res.status(200).json({
        success: true,
        files,
        year
      });

    } catch (error) {
      console.error('Error listing referater files:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Handle GET for listing all years (legacy support)
  try {
    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

    if (!keyId || !applicationKey || !bucketName) {
      return res.status(200).json({ 
        success: true,
        files: [],
        error: 'Backblaze credentials not configured'
      });
    }

    // Authorize account
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

    // List all file versions
    const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        startFileName: 'Referater/',
        maxFileCount: 10000
      })
    });

    if (!listFilesResponse.ok) {
      return res.status(listFilesResponse.status).json({ error: 'Failed to list files' });
    }

    const filesData = await listFilesResponse.json();

    if (!filesData.files || filesData.files.length === 0) {
      return res.status(200).json({
        success: true,
        files: []
      });
    }

    // Only include files from Referater/ folder
    const fileMap = new Map<string, any>();
    
    filesData.files.forEach((file: any) => {
      // Only process files in Referater/ folder
      if (!file.fileName.startsWith('Referater/')) {
        return;
      }
      
      let displayName = file.fileName;
      if (displayName.includes('/')) {
        displayName = displayName.split('/').pop() || displayName;
      }
      
      // Skip system files
      if (displayName.startsWith('.')) {
        return;
      }
      
      // Only keep the latest version (by upload timestamp)
      const existing = fileMap.get(displayName);
      if (!existing || file.uploadTimestamp > existing.uploadTimestamp) {
        fileMap.set(displayName, file);
      }
    });

    // Format the file list
    const files = Array.from(fileMap.values()).map((file: any) => {
      const displayName = file.fileName.includes('/') 
        ? file.fileName.split('/').pop() 
        : file.fileName;
      
      return {
        fileName: displayName,
        fullPath: file.fileName,
        fileId: file.fileId,
        size: file.contentLength,
        uploadTimestamp: file.uploadTimestamp,
        downloadUrl: `${authData.downloadUrl}/file/${bucketName}/${file.fileName}`
      };
    });

    // Sort by filename
    files.sort((a, b) => a.fileName.localeCompare(b.fileName));

    return res.status(200).json({
      success: true,
      files
    });

  } catch (error) {
    console.error('Error listing referater files:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
