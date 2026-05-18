import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const privateKey = Deno.env.get('IMAGEKIT_PRIVATE_KEY');
    const publicKey = Deno.env.get('IMAGEKIT_PUBLIC_KEY') || Deno.env.get('VITE_IMAGEKIT_PUBLIC_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !privateKey || !publicKey) {
      return json({ message: 'ImageKit auth is not configured.' }, 500);
    }

    const authorization = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ message: 'Authentication required.' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || profile?.role !== 'admin' || !profile?.is_active) {
      return json({ message: 'Admin access required.' }, 403);
    }

    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 30 * 60;
    const signature = await hmacSha1(`${token}${expire}`, privateKey);

    return json({ token, expire, signature, publicKey });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Unable to sign upload.' }, 500);
  }
});

async function hmacSha1(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
