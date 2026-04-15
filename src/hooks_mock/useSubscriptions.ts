import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Subscription } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useSubscriptions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      return [...mockDB.subscriptions].sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime())
    },
    enabled: !!user,
  })

  const cancelSubscription = useMutation({
    mutationFn: async (id: string) => {
      const idx = mockDB.subscriptions.findIndex(s => s.id === id)
      if (idx !== -1) {
        mockDB.subscriptions[idx].status = 'cancelled'
        mockDB.subscriptions[idx].cancelled_at = new Date().toISOString()
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] })
  })

  return { subscriptions: subscriptions ?? [], isLoading, cancelSubscription }
}
