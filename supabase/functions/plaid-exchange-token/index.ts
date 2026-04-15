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
    const { public_token, user_id, institution_name } = await req.json()
    
    // Abstracted environment strings
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')

    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
        },
      },
    })

    const client = new PlaidApi(configuration)
    
    // 1. Exchange the token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: public_token
    })
    
    const access_token = exchangeResponse.data.access_token
    const item_id = exchangeResponse.data.item_id

    // 2. Map Vault Record securely via Service Role
    // Service role bypasses RLS so we can write to the vault table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: vaultError } = await supabaseAdmin
      .from('plaid_connections')
      .insert({
        user_id,
        access_token,
        item_id,
        institution_name
      })

    if (vaultError) throw vaultError;

    // 3. Immediately pull linked Accounts to seed the dashboard
    const accountsResponse = await client.accountsGet({ access_token })
    
    const osAccounts = accountsResponse.data.accounts.map(acc => ({
      user_id,
      name: `${institution_name} ${acc.name}`,
      type: acc.type === 'depository' ? 'bank' : acc.type === 'credit' ? 'credit_card' : 'loan',
      balance: acc.balances.current || 0,
      currency: acc.balances.iso_currency_code || 'GBP',
      is_manual: false,
      is_linked: true,
      external_account_id: acc.account_id,
      provider: 'plaid',
      is_archived: false
    }))

    const { error: mappingError } = await supabaseAdmin.from('accounts').insert(osAccounts)
    if (mappingError) throw mappingError

    return new Response(JSON.stringify({ success: true, item_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
