import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

/**
 * NIGHTLY SYNC JOB
 * -----------------
 * This Edge Function is designed to be triggered automatically by a Supabase pg_cron job.
 * 
 * To schedule it, run this SQL in your Supabase SQL editor:
 *
 *   select cron.schedule(
 *     'nightly-bank-sync',
 *     '0 3 * * *',   -- 3:00 AM UTC every day
 *     $$
 *       select net.http_post(
 *         url := current_setting('app.supabase_url') || '/functions/v1/plaid-nightly-sync',
 *         headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
 *         body := '{}'::jsonb
 *       );
 *     $$
 *   );
 *
 * Requires pg_cron and pg_net extensions enabled in Supabase Dashboard → Database → Extensions.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch ALL distinct active users who have at least one live connection
    const { data: activeUsers, error } = await supabaseAdmin
      .from('plaid_connections')
      .select('user_id')
      .eq('status', 'active')

    if (error) throw error
    if (!activeUsers || activeUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active users to sync.', users_synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))]

    // Fan out — trigger manual refresh concurrently for every user
    const results = await Promise.allSettled(
      uniqueUserIds.map(user_id =>
        supabaseAdmin.functions.invoke('plaid-manual-refresh', {
          body: { user_id }
        })
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[Nightly Sync] Users synced: ${succeeded} | Failed: ${failed}`)

    return new Response(
      JSON.stringify({ success: true, users_synced: succeeded, users_failed: failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
