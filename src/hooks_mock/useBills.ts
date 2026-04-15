import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Bill } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useBills() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', user?.id],
    queryFn: async () => {
      return [...mockDB.bills].sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime())
    },
    enabled: !!user,
  })

  const markPaid = useMutation({
    mutationFn: async ({ id, nextDueDate }: { id: string, nextDueDate: string }) => {
      const idx = mockDB.bills.findIndex(b => b.id === id)
      if (idx !== -1) {
        mockDB.bills[idx].next_due_date = nextDueDate
        mockDB.bills[idx].is_paid_this_cycle = true
      }
    },
    onMutate: async ({ id, nextDueDate }) => {
      await queryClient.cancelQueries({ queryKey: ['bills', user?.id] })
      const previous = queryClient.getQueryData(['bills', user?.id])
      queryClient.setQueryData(['bills', user?.id], (old: Bill[]) => 
        old.map(b => b.id === id ? { ...b, next_due_date: nextDueDate, is_paid_this_cycle: true } : b)
      )
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) queryClient.setQueryData(['bills', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', user?.id] })
    }
  })

  return { bills: bills ?? [], isLoading, markPaid }
}
