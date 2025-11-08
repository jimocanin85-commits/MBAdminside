const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Downloading file from Backblaze:', fileName);

    const keyId = Deno.env.get('BACKBLAZE_KEY_ID');
    const applicationKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY');
    const bucketName = Deno.env.get('BACKBLAZE_BUCKET_NAME');

    if (!keyId || !applicationKey || !bucketName) {
      console.error('Backblaze credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Backblaze credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Authorize account
    console.log('Authorizing with Backblaze...');
    const authString = btoa(`${keyId}:${applicationKey}`);
    
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Authorization failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Backblaze authorization failed', details: errorText }),
        { status: authResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await authResponse.json();
    console.log('Authorization successful');

    // Step 2: Download file using authorized URL
    const fullPath = `Frivillige/${fileName}`;
    const downloadUrl = `${authData.downloadUrl}/file/${bucketName}/${fullPath}`;
    
    console.log('Downloading from:', downloadUrl);
    
    const fileResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': authData.authorizationToken
      }
    });

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error('Download failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to download file', details: errorText }),
        { status: fileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log('File downloaded successfully, size:', fileBuffer.byteLength);

    // Return the file as base64
    const base64 = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return new Response(
      JSON.stringify({
        success: true,
        fileData: base64,
        fileName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error downloading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
