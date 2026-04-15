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

    // Securely pull the access token out of vault
    const { data: conn } = await supabaseAdmin
      .from('plaid_connections')
      .select('access_token, sync_cursor')
      .eq('item_id', item_id)
      .eq('user_id', user_id)
      .single()

    if (!conn) throw new Error("Item disconnected or not found.")

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

    let cursor = conn.sync_cursor
    let added = []
    let modified = []
    let removed = []
    let hasMore = true

    // Iterate through sync pagination
    while (hasMore) {
      const response = await client.transactionsSync({
        access_token: conn.access_token,
        cursor: cursor,
      })
      const data = response.data
      added = added.concat(data.added)
      modified = modified.concat(data.modified)
      removed = removed.concat(data.removed)
      hasMore = data.has_more
      cursor = data.next_cursor
    }

    // Map strictly to OS format mapping `external_account_id` references dynamically to precise `account_id` native UUIDs
    const { data: linkedAccounts } = await supabaseAdmin.from('accounts').select('id, external_account_id').eq('user_id', user_id)
    
    const accountMap = new Map()
    linkedAccounts?.forEach(acc => accountMap.set(acc.external_account_id, acc.id))

    const mappedTransactions = added.map(tx => {
       // Plaid expenses return positive amount, OS maps expenses as negative
       const osAmount = -tx.amount 
       return {
         user_id,
         account_id: accountMap.get(tx.account_id),
         amount: osAmount,
         merchant_raw: tx.merchant_name || tx.name,
         date: tx.date,
         external_transaction_id: tx.transaction_id,
         source_type: 'synced',
         is_pending: tx.pending,
         currency: tx.iso_currency_code || 'GBP',
         category_id: null // AI fallback pipeline hits this later
       }
    }).filter(tx => tx.account_id != null) // drop transactions for detached accounts

    if (mappedTransactions.length > 0) {
       const { data: insertedTxs } = await supabaseAdmin.from('transactions').insert(mappedTransactions).select()
       
       // Fire and forget intelligence categorizer asynchronously into isolated queue
       if (insertedTxs && insertedTxs.length > 0) {
         supabaseAdmin.functions.invoke('os-intelligence', {
           body: { user_id, transactions: insertedTxs }
         }).catch(err => console.error("OS Intelligence trigger failed:", err))
       }
    }

    // Process removals / mods strictly securely as well if they occur
    // For MVP phase, just insert.

    // Record next cursor
    await supabaseAdmin.from('plaid_connections').update({ sync_cursor: cursor, last_synced_at: new Date() }).eq('item_id', item_id)

    return new Response(JSON.stringify({ success: true, added: added.length }), {
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
