import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const ANMAISYS_URL = 'https://ybtrzqzliepknpzqdajx.supabase.co';
const ANMAISYS_ANON_KEY = Deno.env.get('ANMAISYS_ANON_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate Anplanner user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anplanner = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await anplanner.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { description, priority, machine, requester_name, line_name, line_at_time, notes } = body ?? {};

    if (!description || !priority || !requester_name || !line_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: description, priority, requester_name, line_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Authenticate with Anmaisys via service account
    const email = Deno.env.get('ANMAISYS_SERVICE_EMAIL');
    const password = Deno.env.get('ANMAISYS_SERVICE_PASSWORD');
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Anmaisys service credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!ANMAISYS_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANMAISYS_ANON_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anmaisys = createClient(ANMAISYS_URL, ANMAISYS_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await anmaisys.auth.signInWithPassword({ email, password });
    if (signInErr) {
      console.error('Anmaisys sign-in failed:', signInErr);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Anmaisys' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Lookup line_id
    const { data: lineRow, error: lineErr } = await anmaisys
      .from('lines')
      .select('id')
      .ilike('name', line_name)
      .maybeSingle();

    if (lineErr || !lineRow) {
      console.error('Line lookup failed:', lineErr, 'name=', line_name);
      return new Response(
        JSON.stringify({ error: `Line "${line_name}" not found in Anmaisys` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Insert work order
    const { data: order, error: insertErr } = await anmaisys
      .from('work_orders')
      .insert({
        description,
        priority,
        machine: machine ?? null,
        requester_name,
        line_id: lineRow.id,
        line_at_time: line_at_time ?? null,
        notes: notes ?? null,
      })
      .select('id')
      .single();

    if (insertErr || !order) {
      console.error('Work order insert failed:', insertErr);
      return new Response(
        JSON.stringify({ error: 'Failed to create work order' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ order_id: order.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('maintenance-bridge error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
