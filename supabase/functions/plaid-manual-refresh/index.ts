import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id } = await req.json()
    if (!user_id) throw new Error('user_id is required')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch all active connections for this user
    const { data: connections, error: connErr } = await supabaseAdmin
      .from('plaid_connections')
      .select('item_id')
      .eq('user_id', user_id)
      .eq('status', 'active')

    if (connErr) throw connErr
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active connections found.', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        const basePayload = { user_id, item_id: conn.item_id }

        // Fire transaction sync
        await supabaseAdmin.functions.invoke('plaid-sync', { body: basePayload })

        // Fire balance sync in parallel
        await supabaseAdmin.functions.invoke('plaid-balance-sync', { body: basePayload })

        return conn.item_id
      })
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ success: true, synced: succeeded, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
