/**
 * Test Backblaze B2 Connection
 * Run with: npx tsx scripts/test-backblaze.ts
 */

const keyId = process.env.BACKBLAZE_KEY_ID || 'fcf60303e564';
const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY || '0032cce8f9a80a34e1a4dfb6293880a86c20112d58';
const bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'MaalovBK';

console.log('🔍 Testing Backblaze B2 Connection...\n');
console.log('Configuration:');
console.log(`  Key ID: ${keyId.substring(0, 8)}...`);
console.log(`  Application Key: ${applicationKey.substring(0, 8)}...`);
console.log(`  Bucket Name: ${bucketName}\n`);

async function testBackblaze() {
  try {
    // Step 1: Authorize
    console.log('📡 Step 1: Authorizing with Backblaze...');
    const authString = Buffer.from(`${keyId}:${applicationKey}`).toString('base64');
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Authorization failed!');
      console.error(`   Status: ${authResponse.status}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const authData = await authResponse.json();
    console.log('✅ Authorization successful!');
    console.log(`   Account ID: ${authData.accountId}`);
    console.log(`   API URL: ${authData.apiUrl}\n`);

    // Step 2: List buckets
    console.log('📦 Step 2: Listing buckets...');
    const listBucketsResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: authData.accountId })
    });

    if (!listBucketsResponse.ok) {
      const errorText = await listBucketsResponse.text();
      console.error('❌ Failed to list buckets!');
      console.error(`   Status: ${listBucketsResponse.status}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const bucketsData = await listBucketsResponse.json();
    console.log(`✅ Found ${bucketsData.buckets.length} bucket(s)`);
    
    // Find our bucket
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);
    
    if (!bucket) {
      console.error(`❌ Bucket '${bucketName}' not found!`);
      console.log('\nAvailable buckets:');
      bucketsData.buckets.forEach((b: any) => {
        console.log(`   - ${b.bucketName} (${b.bucketType})`);
      });
      return false;
    }

    console.log(`✅ Bucket '${bucketName}' found!`);
    console.log(`   Bucket ID: ${bucket.bucketId}`);
    console.log(`   Bucket Type: ${bucket.bucketType}\n`);

    // Step 3: List files
    console.log('📄 Step 3: Listing files in bucket...');
    const listFilesResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        maxFileCount: 100
      })
    });

    if (!listFilesResponse.ok) {
      const errorText = await listFilesResponse.text();
      console.error('❌ Failed to list files!');
      console.error(`   Status: ${listFilesResponse.status}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }

    const filesData = await listFilesResponse.json();
    const xlsxFiles = filesData.files?.filter((f: any) => 
      f.fileName.endsWith('.xlsx') && !f.fileName.startsWith('.')
    ) || [];

    console.log(`✅ Found ${filesData.files?.length || 0} total file version(s)`);
    console.log(`✅ Found ${xlsxFiles.length} .xlsx file(s):`);
    
    if (xlsxFiles.length > 0) {
      xlsxFiles.slice(0, 10).forEach((file: any) => {
        const displayName = file.fileName.includes('/') 
          ? file.fileName.split('/').pop() 
          : file.fileName;
        const sizeKB = (file.contentLength / 1024).toFixed(1);
        const date = new Date(file.uploadTimestamp).toLocaleString();
        console.log(`   - ${displayName} (${sizeKB} KB, ${date})`);
      });
      if (xlsxFiles.length > 10) {
        console.log(`   ... and ${xlsxFiles.length - 10} more`);
      }
    } else {
      console.log('   (No .xlsx files found)');
    }

    console.log('\n✅✅✅ Backblaze connection test PASSED! ✅✅✅');
    return true;

  } catch (error) {
    console.error('\n❌ Connection test FAILED!');
    console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    return false;
  }
}

testBackblaze().then(success => {
  process.exit(success ? 0 : 1);
});
