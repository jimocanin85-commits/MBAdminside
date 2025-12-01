/**
 * Test API Endpoint for Backblaze
 * Simulates what happens when the API endpoint is called
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simulate environment variables
process.env.BACKBLAZE_KEY_ID = process.env.BACKBLAZE_KEY_ID || 'fcf60303e564';
process.env.BACKBLAZE_APPLICATION_KEY = process.env.BACKBLAZE_APPLICATION_KEY || '0032cce8f9a80a34e1a4dfb6293880a86c20112d58';
process.env.BACKBLAZE_BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME || 'MaalovBK';

// Import the handler
const handler = require('../api/list-backblaze-files.ts').default;

console.log('🧪 Testing API Endpoint...\n');

// Mock request
const mockReq = {
  method: 'GET',
  headers: {}
} as any;

// Mock response
const mockRes = {
  status: (code: number) => ({
    json: (data: any) => {
      console.log(`Status: ${code}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      return mockRes;
    },
    setHeader: () => mockRes,
    end: () => mockRes
  }),
  setHeader: () => mockRes,
  end: () => mockRes
} as any;

// Test the handler
handler(mockReq, mockRes)
  .then(() => {
    console.log('\n✅ API Endpoint test completed!');
    process.exit(0);
  })
  .catch((error: any) => {
    console.error('\n❌ API Endpoint test failed!');
    console.error(error);
    process.exit(1);
  });
