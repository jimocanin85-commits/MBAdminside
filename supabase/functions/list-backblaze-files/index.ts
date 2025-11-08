const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Listing files from Backblaze B2...');

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

    const { authorizationToken, apiUrl } = authData;

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

    // Step 3: List ALL file versions (including hidden ones)
    console.log('Listing all file versions in bucket...');
    const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_versions`, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucketId,
        prefix: 'Frivillige/',
        maxFileCount: 1000
      })
    });

    if (!listFilesResponse.ok) {
      const errorText = await listFilesResponse.text();
      console.error('Failed to list files:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to list files', details: errorText }),
        { status: listFilesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filesData = await listFilesResponse.json();
    console.log('Raw file versions from Backblaze:', JSON.stringify(filesData.files));
    console.log('Found', filesData.files.length, 'total file versions');

    // Group files by name and get only the latest version of each
    const fileMap = new Map<string, any>();
    
    filesData.files.forEach((file: any) => {
      const fileName = file.fileName.replace('Frivillige/', '');
      
      // Skip system files
      if (fileName.startsWith('.') || fileName.length === 0 || !fileName.endsWith('.xlsx')) {
        return;
      }
      
      // Only keep the latest version (first occurrence, as they're sorted by timestamp desc)
      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, file);
      }
    });

    // Format the file list
    const files = Array.from(fileMap.values()).map((file: any) => ({
      fileName: file.fileName.replace('Frivillige/', ''),
      fullPath: file.fileName,
      fileId: file.fileId,
      size: file.contentLength,
      uploadTimestamp: file.uploadTimestamp,
      downloadUrl: `${authData.downloadUrl}/file/${bucketName}/${file.fileName}`
    }));
    
    console.log('Filtered to', files.length, 'unique user files');

    return new Response(
      JSON.stringify({
        success: true,
        files,
        bucketName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
