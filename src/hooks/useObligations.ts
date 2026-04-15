import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Obligation } from '@/types'
import { useAuth } from './useAuth'

export function useObligations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: obligations, isLoading } = useQuery({
    queryKey: ['obligations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
      if (error) throw error
      return data as Obligation[]
    },
    enabled: !!user,
  })

  const markDone = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount: number }) => {
      const { error: fulfillmentError } = await supabase.from('obligation_fulfillments').insert([{
        obligation_id: id,
        user_id: user?.id,
        amount
      }])
      if (fulfillmentError) throw fulfillmentError

      const { error } = await supabase.from('obligations').update({
        is_fulfilled_this_cycle: true,
        last_fulfilled_date: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obligations', user?.id] })
  })

  return { obligations: obligations ?? [], isLoading, markDone }
}
