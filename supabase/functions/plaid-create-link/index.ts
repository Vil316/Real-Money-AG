import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "npm:plaid@18.1.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID')
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET')

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials missing in Edge configuration.')
    }

    const { user_id } = await req.json()

    // Initialize Plaid client locally inside Deno container
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox, // abstract sandbox constraint natively
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
        },
      },
    })

    const client = new PlaidApi(configuration)

    const request = {
      user: { client_user_id: user_id },
      client_name: 'RealMoney OS',
      products: [Products.Transactions],
      country_codes: [CountryCode.Gb], // Targeted at robust UK architecture
      language: 'en',
    }

    const response = await client.linkTokenCreate(request)

    return new Response(JSON.stringify(response.data), {
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
