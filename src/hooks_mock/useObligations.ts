import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Obligation } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useObligations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: obligations, isLoading } = useQuery({
    queryKey: ['obligations', user?.id],
    queryFn: async () => {
      return [...mockDB.obligations.filter(o => o.is_active)]
    },
    enabled: !!user,
  })

  const markDone = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount: number }) => {
      const idx = mockDB.obligations.findIndex(o => o.id === id)
      if (idx !== -1) {
        mockDB.obligations[idx].is_fulfilled_this_cycle = true
        mockDB.obligations[idx].last_fulfilled_date = new Date().toISOString()
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obligations', user?.id] })
  })

  return { obligations: obligations ?? [], isLoading, markDone }
}
