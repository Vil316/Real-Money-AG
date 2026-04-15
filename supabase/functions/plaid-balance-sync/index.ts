import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { Configuration, PlaidApi, PlaidEnvironments } from "npm:plaid@18.1.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, item_id } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pull the secure access token from vault
    const { data: conn, error: connErr } = await supabaseAdmin
      .from('plaid_connections')
      .select('access_token')
      .eq('item_id', item_id)
      .eq('user_id', user_id)
      .single()

    if (connErr || !conn) throw new Error('Connection not found or revoked.')

    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
        },
      },
    })
    const client = new PlaidApi(configuration)

    // Fetch live balances from Plaid
    const balanceResponse = await client.accountsBalanceGet({
      access_token: conn.access_token,
    })

    const updates = balanceResponse.data.accounts
    let updatedCount = 0

    for (const acc of updates) {
      const liveBalance = acc.balances.current ?? acc.balances.available ?? 0

      const { error } = await supabaseAdmin
        .from('accounts')
        .update({
          balance: liveBalance,
          last_updated: new Date().toISOString(),
        })
        .eq('external_account_id', acc.account_id)
        .eq('user_id', user_id)

      if (!error) updatedCount++
    }

    return new Response(
      JSON.stringify({ success: true, updated_accounts: updatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
