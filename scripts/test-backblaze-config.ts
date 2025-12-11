/**
 * Test script to verify Backblaze configuration
 * Run with: npx tsx scripts/test-backblaze-config.ts
 */

async function testBackblazeConfig() {
  console.log('🔍 Testing Backblaze Configuration...\n');

  // Check environment variables
  const keyId = process.env.BACKBLAZE_KEY_ID;
  const applicationKey = process.env.BACKBLAZE_APPLICATION_KEY;
  const bucketName = process.env.BACKBLAZE_BUCKET_NAME;

  console.log('Environment Variables:');
  console.log(`  BACKBLAZE_KEY_ID: ${keyId ? '✅ Set (' + keyId.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log(`  BACKBLAZE_APPLICATION_KEY: ${applicationKey ? '✅ Set (' + applicationKey.substring(0, 8) + '...)' : '❌ Missing'}`);
  console.log(`  BACKBLAZE_BUCKET_NAME: ${bucketName ? '✅ Set (' + bucketName + ')' : '❌ Missing'}`);
  console.log('');

  if (!keyId || !applicationKey || !bucketName) {
    console.log('❌ Configuration incomplete!');
    console.log('');
    console.log('To fix:');
    console.log('1. If running locally: Create a .env file with these variables');
    console.log('2. If deployed: Set them in Vercel Dashboard → Settings → Environment Variables');
    console.log('3. Make sure to redeploy after setting variables');
    process.exit(1);
  }

  // Test API endpoint if running locally
  try {
    const response = await fetch('http://localhost:3000/api/list-backblaze-files');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint is accessible');
      if (data.error) {
        console.log(`⚠️  API returned error: ${data.message || data.error}`);
      } else {
        console.log(`✅ API working correctly (found ${data.files?.length || 0} files)`);
      }
    } else {
      console.log(`⚠️  API endpoint returned status: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️  Cannot test API endpoint (this is normal if not running locally)');
    console.log('   Make sure to run "vercel dev" for local development');
  }

  console.log('');
  console.log('✅ Configuration looks good!');
  console.log('');
  console.log('Next steps:');
  console.log('- If running locally: Use "vercel dev" (not "npm run dev")');
  console.log('- If deployed: Make sure to redeploy after setting environment variables');
}

testBackblazeConfig().catch(console.error);
