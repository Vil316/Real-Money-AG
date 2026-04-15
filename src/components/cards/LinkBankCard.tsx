import { useState, useEffect, useCallback } from 'react'
import { Plus, Building, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { usePlaidLink } from 'react-plaid-link'
import { useQueryClient } from '@tanstack/react-query'

export function LinkBankCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)

  // 1. Fetch Link Token dynamically
  useEffect(() => {
    if (!user) return
    const constructLinkToken = async () => {
      const { data, error } = await supabase.functions.invoke('plaid-create-link', {
        body: { user_id: user.id }
      })
      if (!error && data?.link_token) {
        setLinkToken(data.link_token)
      }
    }
    constructLinkToken()
  }, [user])

  // 2. Exchange Public Token securely
  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    setIsLinking(true)
    const institutionName = metadata?.institution?.name || 'Linked Bank'
    
    try {
      await supabase.functions.invoke('plaid-exchange-token', {
        body: { public_token, user_id: user?.id, institution_name: institutionName }
      })
      
      // Pull down initial transactions
      await supabase.functions.invoke('plaid-sync', {
        body: { user_id: user?.id, item_id: metadata?.institution?.institution_id } // In MVP logic we pull all or specific items
      })

      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    } catch (e) {
      console.error(e)
    } finally {
      setIsLinking(false)
    }
  }, [user, queryClient])

  const { open, ready } = usePlaidLink({
    token: linkToken!,
    onSuccess,
  })

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col items-center justify-center text-center">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0B8289]/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-foreground mb-4 relative z-10 border border-border/50">
        <Building size={20} />
      </div>

      <h3 className="text-foreground text-[17px] font-bold mb-1 tracking-tight">Sync Bank Account</h3>
      <p className="text-foreground/50 text-[13px] font-medium mb-6 max-w-[240px]">
        Connect instantly using Open Banking. Plaid Sandbox active for zero-risk extraction.
      </p>

      <Button 
        onClick={() => open()} 
        disabled={!ready || isLinking}
        className="w-full h-12 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-bold active:scale-95 transition-all outline-none z-10 relative"
      >
        {isLinking ? (
          <span className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Abstracting Keys...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Plus size={16} strokeWidth={2.5} /> Connect via Plaid
          </span>
        )}
      </Button>
    </div>
  )
}
