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
    mutationFn: async ({ goalId, amount, accountId }: { goalId: string, amount: number, accountId: string }) => {
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

      // 3. Log Transfer in Transactions
      const { error: txErr } = await supabase.from('transactions').insert([{
        user_id: user?.id,
        account_id: accountId,
        amount: -Math.abs(amount),
        merchant: `Transfer to ${goal?.name || 'Savings'}`,
        category: 'Savings Transfer',
        is_pending: false
      }])
      if (txErr) throw txErr

      // 4. Update Source Account negatively
      const { data: accData } = await supabase.from('accounts').select('balance').eq('id', accountId).single()
      if (accData) {
        await supabase.from('accounts').update({
          balance: Number(accData.balance) - amount
        }).eq('id', accountId)
      }
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, v.accountId] })
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
    }
  })

  const addGoal = useMutation({
    mutationFn: async (newGoal: any) => {
      const { error } = await supabase.from('savings_goals').insert([{ ...newGoal, user_id: user?.id }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
  })

  return { goals: goals ?? [], isLoading, addContribution, addGoal }
}
