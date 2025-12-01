import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Listing files from Backblaze B2...');
    console.log('Environment check:', {
      hasKeyId: !!process.env.BACKBLAZE_KEY_ID,
      hasApplicationKey: !!process.env.BACKBLAZE_APPLICATION_KEY,
      hasBucketName: !!process.env.BACKBLAZE_BUCKET_NAME,
      keyIdLength: process.env.BACKBLAZE_KEY_ID?.length || 0,
      applicationKeyLength: process.env.BACKBLAZE_APPLICATION_KEY?.length || 0,
      bucketName: process.env.BACKBLAZE_BUCKET_NAME || 'NOT SET'
    });

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
    const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

    if (!keyId || !applicationKey || !bucketName) {
      console.error('Backblaze credentials not configured');
      const missing = [];
      if (!keyId) missing.push('BACKBLAZE_KEY_ID');
      if (!applicationKey) missing.push('BACKBLAZE_APPLICATION_KEY');
      if (!bucketName) missing.push('BACKBLAZE_BUCKET_NAME');
      
      // Return empty list instead of error - allows app to work without Backblaze
      return res.status(200).json({ 
        success: true,
        files: [],
        error: 'Backblaze credentials not configured',
        missing: missing,
        message: `Missing environment variables: ${missing.join(', ')}. Please configure them in Vercel dashboard → Settings → Environment Variables`
      });
    }

    // Step 1: Authorize account
    console.log('Authorizing with Backblaze...');
    const authString = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Authorization failed:', errorText);
      return res.status(authResponse.status).json({ 
        error: 'Backblaze authorization failed', 
        details: errorText 
      });
    }

    const authData = await authResponse.json();
    console.log('Authorization successful');

    const { authorizationToken, apiUrl } = authData;

    // Step 2: List buckets to find the bucket ID
    console.log('Finding bucket:', bucketName);
    const listBucketsResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: authData.accountId })
    });

    if (!listBucketsResponse.ok) {
      const errorText = await listBucketsResponse.text();
      console.error('Failed to list buckets:', errorText);
      return res.status(listBucketsResponse.status).json({ 
        error: 'Failed to list buckets', 
        details: errorText 
      });
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      console.error('Bucket not found:', bucketName);
      return res.status(404).json({ error: `Bucket '${bucketName}' not found` });
    }

    const bucketId = bucket.bucketId;
    console.log('Found bucket ID:', bucketId);

    // Step 3: List ALL file versions
    console.log('Listing all file versions in bucket...');
    const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucketId,
        maxFileCount: 10000
      })
    });

    if (!listFilesResponse.ok) {
      const errorText = await listFilesResponse.text();
      console.error('Failed to list files:', errorText);
      return res.status(listFilesResponse.status).json({ 
        error: 'Failed to list files', 
        details: errorText 
      });
    }

    const filesData = await listFilesResponse.json();
    console.log('Total file versions found:', filesData.files?.length || 0);

    if (!filesData.files || filesData.files.length === 0) {
      console.log('No files returned from Backblaze');
      return res.status(200).json({
        success: true,
        files: [],
        bucketName,
        debug: 'No files found in bucket'
      });
    }

    // Group files by name and get only the latest version of each
    const fileMap = new Map<string, any>();
    
    filesData.files.forEach((file: any) => {
      let displayName = file.fileName;
      if (displayName.includes('/')) {
        displayName = displayName.split('/').pop() || displayName;
      }
      
      // Skip system files and non-xlsx files
      if (displayName.startsWith('.') || !displayName.endsWith('.xlsx')) {
        return;
      }
      
      // Only keep the latest version
      if (!fileMap.has(displayName)) {
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

    return res.status(200).json({
      success: true,
      files,
      bucketName
    });

  } catch (error) {
    console.error('Error listing files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}
