import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Deleting file from Backblaze B2...");
    
    const { fileName } = await req.json();
    
    if (!fileName) {
      throw new Error("fileName is required");
    }

    const keyId = Deno.env.get('BACKBLAZE_KEY_ID');
    const applicationKey = Deno.env.get('BACKBLAZE_APPLICATION_KEY');
    const bucketName = Deno.env.get('BACKBLAZE_BUCKET_NAME');

    if (!keyId || !applicationKey || !bucketName) {
      throw new Error("Missing Backblaze credentials");
    }

    console.log("Authorizing with Backblaze...");
    
    // Step 1: Authorize
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${keyId}:${applicationKey}`)
      }
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Authorization failed: ${errorText}`);
    }

    const authData = await authResponse.json();
    console.log("Authorization successful");

    // Step 2: Find bucket
    console.log(`Finding bucket: ${bucketName}`);
    const bucketsResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountId: authData.accountId
      })
    });

    if (!bucketsResponse.ok) {
      throw new Error('Failed to list buckets');
    }

    const bucketsData = await bucketsResponse.json();
    const bucket = bucketsData.buckets.find((b: any) => b.bucketName === bucketName);

    if (!bucket) {
      throw new Error(`Bucket ${bucketName} not found`);
    }

    console.log(`Found bucket ID: ${bucket.bucketId}`);

    // Step 3: List files to find the file ID (match by name pattern)
    console.log(`Finding files matching: ${fileName}`);
    const listFilesResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        prefix: 'Frivillige/',
        maxFileCount: 1000
      })
    });

    if (!listFilesResponse.ok) {
      throw new Error('Failed to list files');
    }

    const filesData = await listFilesResponse.json();
    
    // Find file by matching the name (with or without date suffix)
    // Files in cloud may be named like: traener_Name.xlsx or Name.xlsx or traener_Name_01-01-2025.xlsx
    const file = filesData.files.find((f: any) => {
      const cloudFileName = f.fileName.replace('Frivillige/', '');
      // Match if filename contains the search name
      return cloudFileName.includes(fileName.replace('.xlsx', '')) && cloudFileName.endsWith('.xlsx');
    });

    if (!file) {
      console.log(`No file matching ${fileName} found in Frivillige folder. This is normal for trainers that haven't been uploaded yet.`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: `No cloud file found for ${fileName}. Trainer only exists locally.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found file with ID: ${file.fileId}`);

    // Step 4: Delete the file
    console.log("Deleting file...");
    const deleteResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        'Authorization': authData.authorizationToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: file.fileId,
        fileName: file.fileName
      })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Failed to delete file: ${errorText}`);
    }

    console.log("File deleted successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `File ${fileName} deleted successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error deleting file:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
