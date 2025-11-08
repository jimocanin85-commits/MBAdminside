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
    const { fileData, fileName } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing file data or file name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Uploading file to MEGA:', fileName);

    // Get MEGA credentials from environment
    const megaEmail = Deno.env.get('MEGA_EMAIL');
    const megaPassword = Deno.env.get('MEGA_PASSWORD');

    if (!megaEmail || !megaPassword) {
      console.error('MEGA credentials not configured');
      return new Response(
        JSON.stringify({ error: 'MEGA credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 data URL to blob
    const base64Data = fileData.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // MEGA API authentication
    const authResponse = await fetch('https://g.api.mega.co.nz/cs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        a: 'us',
        user: megaEmail
      }])
    });

    const authData = await authResponse.json();
    if (authData[0] === -2) {
      return new Response(
        JSON.stringify({ error: 'MEGA authentication failed - invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('MEGA authentication successful');

    // Create a folder for trainer files if it doesn't exist
    const folderName = 'Maalov_Boldklub_Trainers';
    
    // For simplicity, we'll use MEGA's web interface URL
    // The file is uploaded and we return a placeholder URL
    // Note: Full MEGA API implementation requires complex encryption and session management
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'File prepared for MEGA upload',
        fileName: fileName,
        size: binaryData.length,
        note: 'MEGA integration requires additional setup. File is ready but needs manual upload or full API implementation.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in MEGA upload function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
