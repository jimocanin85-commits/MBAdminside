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

    // Step 3: List ALL file versions to find all versions of this file (with pagination)
    console.log(`Finding all versions of: ${fileName}`);
    let fileVersions: any[] = [];
    let startFileName = null;
    let startFileId = null;
    
    // Handle pagination to get ALL versions
    do {
      const requestBody: any = {
        bucketId: bucket.bucketId,
        prefix: `Frivillige/${fileName}`,
        maxFileCount: 10000
      };
      
      if (startFileName && startFileId) {
        requestBody.startFileName = startFileName;
        requestBody.startFileId = startFileId;
      }
      
      const listFilesResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_list_file_versions`, {
        method: 'POST',
        headers: {
          'Authorization': authData.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!listFilesResponse.ok) {
        throw new Error('Failed to list file versions');
      }

      const filesData = await listFilesResponse.json();
      
      // Filter to get only exact matches of this file
      const matchingVersions = filesData.files.filter((f: any) => {
        const cloudFileName = f.fileName.replace('Frivillige/', '');
        return cloudFileName === fileName;
      });
      
      fileVersions = fileVersions.concat(matchingVersions);
      
      // Check if there are more versions to fetch
      if (filesData.nextFileName && filesData.nextFileId) {
        startFileName = filesData.nextFileName;
        startFileId = filesData.nextFileId;
      } else {
        break;
      }
    } while (true);

    if (fileVersions.length === 0) {
      console.log(`No file matching ${fileName} found in Frivillige folder.`);
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

    console.log(`Found ${fileVersions.length} version(s) of the file. Deleting all...`);

    // Step 4: Delete ALL versions of the file
    for (const fileVersion of fileVersions) {
      console.log(`Deleting version: ${fileVersion.fileId}`);
      const deleteResponse = await fetch(`${authData.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
          'Authorization': authData.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: fileVersion.fileId,
          fileName: fileVersion.fileName
        })
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error(`Failed to delete version ${fileVersion.fileId}: ${errorText}`);
        // Continue deleting other versions even if one fails
      } else {
        console.log(`Successfully deleted version: ${fileVersion.fileId}`);
      }
    }

    console.log(`All ${fileVersions.length} version(s) deleted successfully`);

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
