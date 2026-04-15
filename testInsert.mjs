import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yievsafqulfscgwaaxwm.supabase.co',
  'sb_publishable_XvN8ezGDuVd0q_zC0jwdkw_QBvpAI91'
)

async function test() {
  // First, sign in to get a valid user_id context for RLS
  const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'mock@example.com', // wait, I don't know the user's email.
    password: 'password'
  })
}
test()
