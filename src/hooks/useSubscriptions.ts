import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Subscription } from '@/types'
import { useAuth } from './useAuth'

export function useSubscriptions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .order('next_billing_date')
      if (error) throw error
      return data as Subscription[]
    },
    enabled: !!user,
  })

  const cancelSubscription = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
  })

  return { subscriptions: subscriptions ?? [], isLoading, cancelSubscription }
}
