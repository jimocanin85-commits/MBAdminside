/**
 * Local development API server
 * Directly implements API routes for local development
 */

import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
const PORT = 3001;

// Load environment variables
try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log('✅ Loaded environment variables');
} catch (error) {
  console.warn('⚠️  .env file not found');
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: '50mb' }));

// List files endpoint
app.get('/api/list-backblaze-files', async (req, res) => {
  try {
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
      const errorText = await authResponse.text();
      return res.status(authResponse.status).json({ 
        error: 'Backblaze authorization failed', 
        details: errorText 
      });
    }

    const authData = await authResponse.json();
    const { authorizationToken, apiUrl } = authData;

    // List buckets
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
      return res.status(listBucketsResponse.status).json({ 
        error: 'Failed to list buckets', 
        details: errorText 
      });
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      return res.status(404).json({ error: `Bucket '${bucketName}' not found` });
    }

    // List files
    const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        maxFileCount: 10000
      })
    });

    if (!listFilesResponse.ok) {
      const errorText = await listFilesResponse.text();
      return res.status(listFilesResponse.status).json({ 
        error: 'Failed to list files', 
        details: errorText 
      });
    }

    const filesData = await listFilesResponse.json();

    if (!filesData.files || filesData.files.length === 0) {
      return res.status(200).json({
        success: true,
        files: [],
        bucketName
      });
    }

    // Group files by name and get only the latest version of each
    const fileMap = new Map<string, any>();
    
    filesData.files.forEach((file: any) => {
      let displayName = file.fileName;
      if (displayName.includes('/')) {
        displayName = displayName.split('/').pop() || displayName;
      }
      
      if (displayName.startsWith('.') || !displayName.endsWith('.xlsx')) {
        return;
      }
      
      if (!fileMap.has(displayName)) {
        fileMap.set(displayName, file);
      }
    });

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

    res.status(200).json({
      success: true,
      files,
      bucketName
    });

  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message || 'Unknown error occurred' });
  }
});

// Upload endpoint (simplified - delegates to Vercel handler if needed)
app.post('/api/upload-to-backblaze', async (req, res) => {
  res.status(501).json({ error: 'Upload endpoint - use Vercel deployment or implement locally' });
});

// Download endpoint
app.post('/api/download-backblaze-file', async (req, res) => {
  try {
    const { fileName, fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const keyId = process.env.BACKBLAZE_KEY_ID;
    const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;

    if (!keyId || !applicationKey) {
      return res.status(500).json({ error: 'Backblaze credentials not configured' });
    }

    const authString = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!authResponse.ok) {
      return res.status(authResponse.status).json({ error: 'Backblaze authorization failed' });
    }

    const authData = await authResponse.json();
    const { authorizationToken } = authData;

    const downloadResponse = await fetch(`${authData.downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`, {
      headers: { 'Authorization': authorizationToken }
    });

    if (!downloadResponse.ok) {
      return res.status(downloadResponse.status).json({ error: 'Failed to download file' });
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');

    res.status(200).json({
      success: true,
      data: base64,
      fileName
    });

  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// Delete endpoint
app.post('/api/delete-backblaze-file', async (req, res) => {
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

    const deleteResponse = await fetch(`${apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileName, fileId })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      return res.status(deleteResponse.status).json({ 
        error: 'Delete failed', 
        details: errorText 
      });
    }

    const deleteResult = await deleteResponse.json();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      fileId: deleteResult.fileId,
      fileName: deleteResult.fileName
    });

  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📝 API routes:`);
  console.log(`   GET  http://localhost:${PORT}/api/list-backblaze-files`);
  console.log(`   POST http://localhost:${PORT}/api/download-backblaze-file`);
  console.log(`   POST http://localhost:${PORT}/api/delete-backblaze-file`);
  console.log(`\n💡 Frontend should proxy /api/* to http://localhost:${PORT}/api/*`);
});
