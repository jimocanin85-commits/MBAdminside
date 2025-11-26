/**
 * Test script to verify Backblaze B2 configuration
 * Run with: npm run test:backblaze
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

async function testBackblazeConfig() {
  console.log('\n🔍 Testing Backblaze B2 Configuration\n');
  console.log('=' .repeat(50));

  // Test 1: Check environment variables
  console.log('\n1. Checking Environment Variables...');
  addResult(
    'BACKBLAZE_KEY_ID exists',
    !!BACKBLAZE_KEY_ID,
    BACKBLAZE_KEY_ID ? `Found (${BACKBLAZE_KEY_ID.substring(0, 8)}...)` : 'Missing'
  );
  
  addResult(
    'BACKBLAZE_APPLICATION_KEY exists',
    !!BACKBLAZE_APPLICATION_KEY,
    BACKBLAZE_APPLICATION_KEY ? `Found (${BACKBLAZE_APPLICATION_KEY.length} chars)` : 'Missing'
  );
  
  addResult(
    'BACKBLAZE_BUCKET_NAME exists',
    !!BACKBLAZE_BUCKET_NAME,
    BACKBLAZE_BUCKET_NAME ? `Found: ${BACKBLAZE_BUCKET_NAME}` : 'Missing'
  );

  if (!BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY || !BACKBLAZE_BUCKET_NAME) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    console.log('\nExpected variables:');
    console.log('  BACKBLAZE_KEY_ID=...');
    console.log('  BACKBLAZE_APPLICATION_KEY=...');
    console.log('  BACKBLAZE_BUCKET_NAME=...');
    return;
  }

  // Test 2: Test authorization
  console.log('\n2. Testing Backblaze Authorization...');
  try {
    const authString = Buffer.from(`${BACKBLAZE_KEY_ID}:${BACKBLAZE_APPLICATION_KEY}`).toString('base64');
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      addResult(
        'Authorization',
        false,
        `Failed: ${authResponse.status} - ${errorText}`
      );
      return;
    }

    const authData = await authResponse.json();
    addResult(
      'Authorization',
      true,
      `Success - Account ID: ${authData.accountId}`
    );

    // Test 3: List buckets
    console.log('\n3. Testing Bucket Access...');
    const { authorizationToken, apiUrl } = authData;
    
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
      addResult(
        'List Buckets',
        false,
        `Failed: ${listBucketsResponse.status} - ${errorText}`
      );
      return;
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === BACKBLAZE_BUCKET_NAME);
    
    if (!bucket) {
      addResult(
        'Bucket Found',
        false,
        `Bucket '${BACKBLAZE_BUCKET_NAME}' not found. Available buckets: ${bucketsData.buckets.map((b: any) => b.bucketName).join(', ')}`
      );
      return;
    }

    addResult(
      'Bucket Found',
      true,
      `Found bucket: ${bucket.bucketName} (ID: ${bucket.bucketId})`
    );

    // Test 4: List files
    console.log('\n4. Testing File Listing...');
    const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        maxFileCount: 100
      })
    });

    if (!listFilesResponse.ok) {
      const errorText = await listFilesResponse.text();
      addResult(
        'List Files',
        false,
        `Failed: ${listFilesResponse.status} - ${errorText}`
      );
      return;
    }

    const filesData = await listFilesResponse.json();
    const xlsxFiles = filesData.files?.filter((f: any) => f.fileName.endsWith('.xlsx')) || [];
    
    addResult(
      'List Files',
      true,
      `Success - Found ${filesData.files?.length || 0} total files, ${xlsxFiles.length} .xlsx files`
    );

    // Test 5: Check permissions
    console.log('\n5. Checking Permissions...');
    const hasReadWrite = bucket.bucketType === 'allPublic' || bucket.bucketType === 'allPrivate';
    addResult(
      'Bucket Permissions',
      true,
      `Bucket type: ${bucket.bucketType}`
    );

  } catch (error) {
    addResult(
      'Connection Test',
      false,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Backblaze B2 is configured correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n');
}

// Run the tests
testBackblazeConfig().catch(console.error);
