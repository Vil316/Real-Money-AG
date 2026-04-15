import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, transactions } = await req.json()
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No transactions to process' }), { headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch User Rules
    const { data: rules } = await supabaseAdmin.from('rules').select('*').eq('user_id', user_id)
    
    // 2. Fetch System + User Categories for OpenAI mapping
    const { data: categories } = await supabaseAdmin.from('categories').select('id, name').or(`user_id.eq.${user_id},is_system.eq.true`)
    
    const unmapped: any[] = []
    
    for (const tx of transactions) {
      // Very basic rule checking (Exact or Contains)
      let matchedRule = null
      if (rules) {
        matchedRule = rules.find(r => 
          (r.match_type === 'exact' && tx.merchant_raw.toLowerCase() === r.match_value.toLowerCase()) ||
          (r.match_type === 'contains' && tx.merchant_raw.toLowerCase().includes(r.match_value.toLowerCase()))
        )
      }

      if (matchedRule) {
        // Fast-path Rules Engine mapping
        await supabaseAdmin.from('transactions')
          .update({
            merchant_clean: matchedRule.assign_merchant_name || tx.merchant_raw,
            category_id: matchedRule.assign_category_id,
            confidence_score: 1.0 // 100% confidence from user rules
          })
          .eq('id', tx.id)
      } else {
        unmapped.push(tx)
      }
    }

    if (unmapped.length > 0) {
      // 3. Trigger OpenAI Categorization Fallback 
      const openAiKey = Deno.env.get('OPENAI_API_KEY')
      if (openAiKey) {
        const promptParams = unmapped.map(t => ({ id: t.id, raw: t.merchant_raw }))
        const catMap = categories?.map(c => `"${c.id}":"${c.name}"`).join(", ")

        const prompt = `
          You are a financial parsing engine. I will give you a list of raw bank transaction descriptions.
          Extract the clean merchant name, and assign exactly ONE category_id from this taxonomy list: {${catMap}}.
          Estimate certainty as a confidence float between 0.0 to 1.0. Determine if it is likely a recurring subscription Boolean based on string.
          
          Input JSON: ${JSON.stringify(promptParams)}

          Return strictly valid JSON array: [{ "id": "tx_id", "merchant_clean": "Uber", "category_id": "uuid", "confidence": 0.95, "is_subscription": false }]
        `

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: "json_object" } // Emulate strict output, technically requires object wrapper 
          })
        })

        const raw = await gptResponse.json()
        
        try {
          // Parse string carefully 
          let gptContent = raw.choices[0].message.content
          if (gptContent.includes('```json')) gptContent = gptContent.replace(/```json/g, '').replace(/```/g, '')
          const output = JSON.parse(gptContent)
          
          // The model might wrap it in an object like { "results": [...] } due to json_object enforcement
          const mappedResults = Array.isArray(output) ? output : (output.results || output.data || [])

          for (const res of mappedResults) {
            await supabaseAdmin.from('transactions')
              .update({
                merchant_clean: res.merchant_clean,
                category_id: res.category_id,
                confidence_score: res.confidence
              })
              .eq('id', res.id)
              
            if (res.is_subscription) {
              // Action Feed OS mapping
              await supabaseAdmin.from('action_items').insert([{
                user_id,
                type: 'recommendation',
                priority: 'medium',
                title: 'New Subscription Detected',
                description: `${res.merchant_clean} appears to be recurring.`,
                status: 'pending',
                reasoning_json: {
                  merchant: res.merchant_clean,
                  confidence: res.confidence,
                  ai_reason: 'Recurring intervals detected automatically.'
                }
              }])
            }
          }
        } catch (e) {
          console.error("Failed to parse OpenAI structure:", e)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: transactions.length }), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 400 })
  }
})
