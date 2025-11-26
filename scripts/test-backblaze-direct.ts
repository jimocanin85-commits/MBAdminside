/**
 * Alternative test - try to access bucket directly without listing all buckets
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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
} catch (error) {
  console.warn('⚠️  .env file not found.');
}

const BACKBLAZE_KEY_ID = process.env.BACKBLAZE_KEY_ID;
const BACKBLAZE_APPLICATION_KEY = process.env.BACKBLAZE_APPLICATION_KEY;
const BACKBLAZE_BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME;

async function testDirect() {
  console.log('\n🔍 Testing Direct Bucket Access\n');
  
  if (!BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY || !BACKBLAZE_BUCKET_NAME) {
    console.error('Missing credentials');
    return;
  }

  try {
    // Authorize
    const authString = Buffer.from(`${BACKBLAZE_KEY_ID}:${BACKBLAZE_APPLICATION_KEY}`).toString('base64');
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}` }
    });

    if (!authResponse.ok) {
      console.error('Auth failed:', await authResponse.text());
      return;
    }

    const authData = await authResponse.json();
    const { authorizationToken, apiUrl } = authData;

    // Try to list files directly in the bucket (bypass bucket listing)
    console.log(`Trying to list files in bucket: ${BACKBLAZE_BUCKET_NAME}...`);
    
    // First, we need the bucket ID. Let's try listing buckets with accountId
    const listBucketsResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        accountId: authData.accountId,
        bucketName: BACKBLAZE_BUCKET_NAME  // Try specifying bucket name
      })
    });

    if (!listBucketsResponse.ok) {
      const errorText = await listBucketsResponse.text();
      console.error('❌ List buckets failed:', errorText);
      console.log('\n💡 The Application Key might be missing "List Buckets" permission.');
      console.log('   However, we can still try to access files if we know the bucket ID.');
      return;
    }

    const bucketsData = await listBucketsResponse.json();
    console.log('✅ Bucket access successful!');
    console.log('Buckets:', JSON.stringify(bucketsData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testDirect().catch(console.error);
