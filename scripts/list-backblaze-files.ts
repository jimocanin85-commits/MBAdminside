/**
 * Script to list files from Backblaze B2 bucket
 * Run with: npm run list:backblaze
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env file
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
} catch (error) {
  console.warn('⚠️  .env file not found. Using environment variables from system.');
}

const BACKBLAZE_KEY_ID = process.env.BACKBLAZE_KEY_ID;
const BACKBLAZE_APPLICATION_KEY = process.env.BACKBLAZE_APPLICATION_KEY;
const BACKBLAZE_BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME;

interface CloudFile {
  fileName: string;
  fullPath: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

async function listFiles() {
  console.log('\n📁 Listing files from Backblaze B2 bucket\n');
  console.log('='.repeat(60));

  // Check configuration
  if (!BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY || !BACKBLAZE_BUCKET_NAME) {
    console.error('\n❌ Missing required environment variables:');
    if (!BACKBLAZE_KEY_ID) console.error('   - BACKBLAZE_KEY_ID');
    if (!BACKBLAZE_APPLICATION_KEY) console.error('   - BACKBLAZE_APPLICATION_KEY');
    if (!BACKBLAZE_BUCKET_NAME) console.error('   - BACKBLAZE_BUCKET_NAME');
    console.log('\nPlease configure your .env file with all required values.');
    return;
  }

  console.log(`\nBucket: ${BACKBLAZE_BUCKET_NAME}`);
  console.log(`Key ID: ${BACKBLAZE_KEY_ID.substring(0, 8)}...\n`);

  try {
    // Step 1: Authorize
    console.log('🔐 Authorizing with Backblaze...');
    const authString = Buffer.from(`${BACKBLAZE_KEY_ID}:${BACKBLAZE_APPLICATION_KEY}`).toString('base64');
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`\n❌ Authorization failed: ${authResponse.status}`);
      console.error(`   ${errorText}`);
      return;
    }

    const authData = await authResponse.json();
    console.log('✅ Authorization successful\n');

    const { authorizationToken, apiUrl } = authData;

    // Step 2: Find bucket
    console.log(`🔍 Finding bucket: ${BACKBLAZE_BUCKET_NAME}...`);
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
      console.error(`\n❌ Failed to list buckets: ${errorText}`);
      return;
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === BACKBLAZE_BUCKET_NAME);

    if (!bucket) {
      console.error(`\n❌ Bucket '${BACKBLAZE_BUCKET_NAME}' not found.`);
      console.log('\nAvailable buckets:');
      bucketsData.buckets.forEach((b: any) => {
        console.log(`   - ${b.bucketName}`);
      });
      return;
    }

    console.log(`✅ Found bucket: ${bucket.bucketName} (ID: ${bucket.bucketId})\n`);

    // Step 3: List files
    console.log('📋 Listing files...');
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
      console.error(`\n❌ Failed to list files: ${errorText}`);
      return;
    }

    const filesData = await listFilesResponse.json();
    const totalFiles = filesData.files?.length || 0;
    console.log(`✅ Found ${totalFiles} file version(s)\n`);

    if (totalFiles === 0) {
      console.log('📭 No files found in bucket.\n');
      return;
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

    const xlsxFiles = Array.from(fileMap.values());

    if (xlsxFiles.length === 0) {
      console.log('📭 No .xlsx files found in bucket.\n');
      return;
    }

    // Format and display files
    console.log('='.repeat(60));
    console.log(`\n📄 Found ${xlsxFiles.length} .xlsx file(s):\n`);
    
    xlsxFiles.forEach((file: any, index: number) => {
      const displayName = file.fileName.includes('/') 
        ? file.fileName.split('/').pop() 
        : file.fileName;
      
      const sizeKB = (file.contentLength / 1024).toFixed(2);
      const date = new Date(file.uploadTimestamp).toLocaleString('da-DK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log(`${index + 1}. ${displayName}`);
      console.log(`   Size: ${sizeKB} KB`);
      console.log(`   Uploaded: ${date}`);
      console.log(`   File ID: ${file.fileId}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n✅ File listing complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error(error);
  }
}

// Run the script
listFiles().catch(console.error);
