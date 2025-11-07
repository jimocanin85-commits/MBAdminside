import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { fileData, fileName, trainerName } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing file data or file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading file to Cloudinary:', fileName);

    // Get Cloudinary credentials from environment
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Cloudinary not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create timestamp and signature for Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'Maalov_boldklub';
    
    // Create a clean filename from trainer name (remove .xlsx extension from fileName)
    const cleanFileName = fileName.replace('.xlsx', '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${folder}/${cleanFileName}`;
    
    // Create signature (must include public_id for signature to work)
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(paramsToSign)
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Prepare form data for Cloudinary
    const formData = new FormData();
    formData.append('file', fileData);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signatureHex);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('resource_type', 'raw'); // For non-image files like Excel

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudinary upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Upload failed', details: errorText }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cloudinaryResult = await uploadResponse.json();
    console.log('Upload successful:', cloudinaryResult.secure_url);

    return new Response(
      JSON.stringify({
        success: true,
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
