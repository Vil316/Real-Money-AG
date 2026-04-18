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
      const contributionAmount = Number(amount)
      if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
        throw new Error('Contribution amount must be greater than 0.')
      }

      if (!user?.id) {
        throw new Error('You must be signed in to add a contribution.')
      }

      console.info('[savings.addContribution] Starting savings contribution', {
        goalId,
        accountId,
        amount: contributionAmount,
        userId: user?.id,
      })

      console.info('[savings.addContribution] Mutation call payload', {
        goalId,
        accountId,
        amount: contributionAmount,
        canonicalContributionTable: 'savings_contributions',
        canonicalGoalField: 'savings_goals.current_amount',
      })

      const { data: goalBefore, error: goalBeforeError } = await supabase
        .from('savings_goals')
        .select('id, name, current_amount, target_amount, is_completed')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (goalBeforeError) {
        console.error('[savings.addContribution] Failed to load savings goal before save', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: goalBeforeError,
        })
        throw goalBeforeError
      }

      if (!goalBefore?.id) {
        throw new Error('Savings goal not found.')
      }

      const { data: fundingAccount, error: accountError } = await supabase
        .from('accounts')
        .select('id, name, balance, currency')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (accountError) {
        console.error('[savings.addContribution] Failed to load funding account before save', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: accountError,
        })
        throw accountError
      }

      if (!fundingAccount?.id) {
        throw new Error('Funding account not found.')
      }

      const contributionNotes = `Savings contribution to ${goalBefore.name}`

      const { data: contributionRow, error: contributionInsertError } = await supabase
        .from('savings_contributions')
        .insert([{
          goal_id: goalId,
          user_id: user.id,
          amount: contributionAmount,
          notes: contributionNotes,
        }])
        .select('id, goal_id, user_id, amount, date, notes')
        .maybeSingle()

      if (contributionInsertError) {
        console.error('[savings.addContribution] Failed to insert savings contribution row', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: contributionInsertError,
        })
        throw contributionInsertError
      }

      if (!contributionRow?.id) {
        throw new Error('Unable to persist contribution: no savings contribution row was inserted.')
      }

      console.info('[savings.addContribution] Inserted contribution row', contributionRow)

      const currentAmountBefore = Number(goalBefore.current_amount || 0)
      const targetAmount = Number(goalBefore.target_amount || 0)
      const nextGoalAmount = currentAmountBefore + contributionAmount
      const nextGoalCompleted = targetAmount > 0 ? nextGoalAmount >= targetAmount : false

      const { data: updatedGoal, error: goalUpdateError } = await supabase
        .from('savings_goals')
        .update({
          current_amount: nextGoalAmount,
          is_completed: nextGoalCompleted,
        })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select('id, current_amount, target_amount, is_completed')
        .maybeSingle()

      if (goalUpdateError) {
        console.error('[savings.addContribution] Failed to update savings goal after contribution insert', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: goalUpdateError,
        })
        throw goalUpdateError
      }

      if (!updatedGoal?.id) {
        throw new Error('Unable to persist contribution: savings goal row did not update.')
      }

      console.info('[savings.addContribution] Updated savings goal row after save', updatedGoal)

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: accountId,
          amount: -Math.abs(contributionAmount),
          merchant_raw: `Transfer to ${goalBefore.name}`,
          source_type: 'manual',
          is_pending: false,
          notes: contributionNotes,
          currency: fundingAccount.currency || 'GBP',
        }])

      if (transactionError) {
        console.error('[savings.addContribution] Failed to insert contribution transaction row', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: transactionError,
        })
        throw transactionError
      }

      const nextAccountBalance = Number(fundingAccount.balance || 0) - contributionAmount
      const { error: accountUpdateError } = await supabase
        .from('accounts')
        .update({
          balance: nextAccountBalance,
          last_updated: new Date().toISOString(),
        })
        .eq('id', fundingAccount.id)
        .eq('user_id', user.id)

      if (accountUpdateError) {
        console.error('[savings.addContribution] Failed to update funding account balance after contribution', {
          goalId,
          accountId,
          amount: contributionAmount,
          error: accountUpdateError,
        })
        throw accountUpdateError
      }

      console.info('[savings.addContribution] Savings contribution completed', {
        goalId,
        accountId,
        amount: contributionAmount,
        contributionId: contributionRow.id,
        currentAmount: updatedGoal.current_amount,
        targetAmount: updatedGoal.target_amount,
        isCompleted: updatedGoal.is_completed,
      })
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['savings', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, v.accountId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, undefined] })
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

  const setWeeklyContribution = useMutation({
    mutationFn: async ({ id, weeklyContribution }: { id: string, weeklyContribution: number }) => {
      console.info('[savings.setWeeklyContribution] Starting weekly contribution save', {
        id,
        weeklyContribution,
      })

      const { data, error } = await supabase
        .from('savings_goals')
        .update({ weekly_contribution: weeklyContribution })
        .eq('id', id)
        .select('id, weekly_contribution')
        .maybeSingle()

      if (error) {
        console.error('[savings.setWeeklyContribution] Failed to save weekly contribution', {
          id,
          weeklyContribution,
          error,
        })
        throw error
      }

      if (!data?.id) {
        console.error('[savings.setWeeklyContribution] Update matched no rows', {
          id,
          weeklyContribution,
          userId: user?.id,
        })
        throw new Error('Unable to save weekly plan: no matching savings goal row was updated.')
      }

      console.info('[savings.setWeeklyContribution] Weekly contribution save completed', {
        id,
        savedValue: data.weekly_contribution,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savings', user?.id] }),
  })

  return { goals: goals ?? [], isLoading, addContribution, addGoal, setWeeklyContribution }
}
