import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return json({ result: 'not_found' });

    const supabase = serviceClient();
    const { data: application, error } = await supabase
      .from('membership_applications')
      .select('id,applicant_name,email,membership_type_label,amount_label,status,membership_number,bill_number,receipt_path,certificate_path,created_at,approved_at')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!application) return json({ result: 'not_found' });

    let receiptUrl = '';
    let certificateUrl = '';
    if (application.status === 'approved') {
      receiptUrl = application.receipt_path ? await signedPath(supabase, application.receipt_path) : '';
      certificateUrl = application.certificate_path ? await signedPath(supabase, application.certificate_path) : '';
    }

    return json({
      result: 'found',
      application: {
        ...application,
        receipt_url: receiptUrl,
        certificate_url: certificateUrl,
      },
    });
  } catch (error) {
    console.error(error);
    return json({ result: 'error', message: error.message || 'Unable to check membership status.' }, 500);
  }
});

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) throw new Error('Supabase service role is not configured.');
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function signedPath(supabase: ReturnType<typeof createClient>, path: string) {
  const { data, error } = await supabase.storage
    .from('membership-assets')
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
