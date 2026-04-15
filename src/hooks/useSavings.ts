import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal, SavingsContribution } from '@/types'
import { useAuth } from './useAuth'

export function useSavings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: goals, isLoading } = useQuery({
    queryKey: ['savings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at')
      if (error) throw error
      return data as SavingsGoal[]
    },
    enabled: !!user,
  })

  const addContribution = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string, amount: number }) => {
      // 1. Insert contribution
      const { error: contribError } = await supabase.from('savings_contributions').insert([{
        goal_id: goalId,
        user_id: user?.id,
        amount
      }])
      if (contribError) throw contribError

      // 2. Update goal total
      const goal = goals?.find(g => g.id === goalId)
      if (goal) {
        await supabase.from('savings_goals').update({
          current_amount: Number(goal.current_amount) + amount
        }).eq('id', goalId)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
  })

  return { goals: goals ?? [], isLoading, addContribution }
}
