const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Starting Backblaze B2 upload for:', fileName);

    const keyId = Deno.env.get('BACKBLAZE_KEY_ID');
    const applicationKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY');

    if (!keyId || !applicationKey) {
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

    const { authorizationToken, apiUrl } = authData;
    const bucketName = Deno.env.get('BACKBLAZE_BUCKET_NAME');

    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: 'Bucket name not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: List buckets to find the bucket ID
    console.log('Finding bucket:', bucketName);
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
      console.error('Failed to list buckets:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to list buckets', details: errorText }),
        { status: listBucketsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bucketsData = await listBucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      console.error('Bucket not found:', bucketName);
      return new Response(
        JSON.stringify({ error: `Bucket '${bucketName}' not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bucketId = bucket.bucketId;
    console.log('Found bucket ID:', bucketId);

    // Step 3: Get upload URL
    console.log('Getting upload URL for bucket:', bucketId);
    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bucketId })
    });

    if (!uploadUrlResponse.ok) {
      const errorText = await uploadUrlResponse.text();
      console.error('Failed to get upload URL:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get upload URL', details: errorText }),
        { status: uploadUrlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadUrlData = await uploadUrlResponse.json();
    const { uploadUrl, authorizationToken: uploadToken } = uploadUrlData;
    console.log('Upload URL obtained');

    // Step 4: Convert base64 to binary
    const base64Data = fileData.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    console.log('File size:', binaryData.length, 'bytes');

    // Step 5: Calculate SHA1 hash
    const hashBuffer = await crypto.subtle.digest('SHA-1', binaryData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('SHA1 hash calculated');

    // Step 6: Upload file (with folder path)
    const folderPath = 'Frivillige/';
    const fullFileName = `${folderPath}${fileName}`;
    console.log('Uploading file to:', fullFileName);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': encodeURIComponent(fullFileName),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': binaryData.length.toString(),
        'X-Bz-Content-Sha1': sha1Hash
      },
      body: binaryData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Upload failed', details: errorText }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload successful:', uploadResult.fileName);

    // Construct download URL (with folder path)
    const downloadUrl = `${authData.downloadUrl}/file/${bucketName}/Frivillige/${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        fileName: uploadResult.fileName,
        fileId: uploadResult.fileId,
        url: downloadUrl,
        size: binaryData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Backblaze upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
