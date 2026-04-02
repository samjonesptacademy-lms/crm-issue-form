// Cloudflare Pages Function — proxy between browser and Google Apps Script
// This eliminates CORS issues by making server-to-server calls

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1zWa5391iGJQVeqAn1huM8K9PWcs94YbDKbOte3z372N9k4h7Li4mJzTexVlZyi1f/exec';

export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Forward GET or POST to Apps Script
    const body = request.method === 'POST' ? await request.text() : undefined;

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: request.method,
      body,
      redirect: 'follow',
    });

    const data = await upstream.text();

    return new Response(data, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
