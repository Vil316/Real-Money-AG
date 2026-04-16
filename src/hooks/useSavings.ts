import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SavingsGoal } from '@/types'
import { useAuth } from './useAuth'

type NewSavingsGoal = Pick<SavingsGoal, 'name' | 'target_amount' | 'current_amount' | 'colour' | 'is_completed'> &
  Partial<Pick<SavingsGoal, 'target_date' | 'linked_account_id' | 'is_challenge' | 'weekly_contribution'>>

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
    mutationFn: async ({ goalId, amount, accountId }: { goalId: string, amount: number, accountId: string }) => {
      const { error } = await supabase.rpc('add_savings_contribution', {
        p_goal_id: goalId,
        p_account_id: accountId,
        p_amount: amount,
      })

      if (error) throw error
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, v.accountId] })
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
    }
  })

  const addGoal = useMutation({
    mutationFn: async (newGoal: NewSavingsGoal) => {
      const { error } = await supabase.from('savings_goals').insert([{ ...newGoal, user_id: user?.id }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
  })

  return { goals: goals ?? [], isLoading, addContribution, addGoal }
}
