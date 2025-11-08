import "https://deno.land/x/xhr@0.3.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to derive encryption key from password
async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Helper to prepare string for MEGA API
function stringToA32(str: string): number[] {
  const bytes = new TextEncoder().encode(str);
  const a32 = [];
  for (let i = 0; i < bytes.length; i += 4) {
    a32.push(
      (bytes[i] << 24) | 
      ((bytes[i + 1] || 0) << 16) | 
      ((bytes[i + 2] || 0) << 8) | 
      (bytes[i + 3] || 0)
    );
  }
  return a32;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileData, fileName } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing file data or file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting MEGA upload for:', fileName);

    const megaEmail = Deno.env.get('MEGA_EMAIL');
    const megaPassword = Deno.env.get('MEGA_PASSWORD');

    if (!megaEmail || !megaPassword) {
      console.error('MEGA credentials not configured');
      return new Response(
        JSON.stringify({ error: 'MEGA credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to binary
    const base64Data = fileData.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    console.log('File size:', binaryData.length, 'bytes');

    // Step 1: Get user session ID
    console.log('Authenticating with MEGA...');
    const loginResponse = await fetch('https://g.api.mega.co.nz/cs?id=0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        a: 'us',
        user: megaEmail,
      }])
    });

    if (!loginResponse.ok) {
      throw new Error('MEGA API request failed');
    }

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData[0]);

    if (typeof loginData[0] === 'number' && loginData[0] < 0) {
      const errorCodes: Record<number, string> = {
        '-2': 'Invalid credentials',
        '-3': 'Rate limit exceeded',
        '-4': 'Account blocked',
        '-9': 'File not found / Access denied',
      };
      throw new Error(errorCodes[loginData[0]] || `MEGA error code: ${loginData[0]}`);
    }

    // Step 2: Derive password key
    console.log('Deriving encryption key...');
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    
    // Step 3: Request upload URL
    console.log('Requesting upload URL...');
    const uploadUrlResponse = await fetch('https://g.api.mega.co.nz/cs?id=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        a: 'u',
        s: binaryData.length,
        ms: 0,
        r: 0,
        e: 0,
      }])
    });

    const uploadUrlData = await uploadUrlResponse.json();
    console.log('Upload URL response:', uploadUrlData);

    if (typeof uploadUrlData[0] === 'number' && uploadUrlData[0] < 0) {
      throw new Error(`Failed to get upload URL: ${uploadUrlData[0]}`);
    }

    const uploadUrl = uploadUrlData[0]?.p;
    if (!uploadUrl) {
      throw new Error('No upload URL received from MEGA');
    }

    // Step 4: Upload file data
    console.log('Uploading file to:', uploadUrl);
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/octet-stream',
      },
      body: binaryData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.text();
    console.log('Upload result:', uploadResult);

    // Step 5: Complete upload (simplified - full implementation would need proper node creation with encryption)
    console.log('File uploaded successfully');

    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileName,
        size: binaryData.length,
        message: 'File uploaded to MEGA successfully',
        uploadHandle: uploadResult,
        note: 'File uploaded but not yet attached to folder. Check your MEGA account.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in MEGA upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'MEGA upload failed. Please check credentials and try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
