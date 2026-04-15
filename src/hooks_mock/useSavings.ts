import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SavingsGoal } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useSavings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: goals, isLoading } = useQuery({
    queryKey: ['savings', user?.id],
    queryFn: async () => {
      return [...mockDB.savingsGoals]
    },
    enabled: !!user,
  })

  const addContribution = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string, amount: number }) => {
      const idx = mockDB.savingsGoals.findIndex(g => g.id === goalId)
      if (idx !== -1) {
        mockDB.savingsGoals[idx].current_amount += amount
        if (mockDB.savingsGoals[idx].current_amount >= mockDB.savingsGoals[idx].target_amount) {
          mockDB.savingsGoals[idx].is_completed = true
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
  })

  return { goals: goals ?? [], isLoading, addContribution }
}
