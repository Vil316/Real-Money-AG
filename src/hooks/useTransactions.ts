import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'
import { useAuth } from './useAuth'

export function useTransactions(accountId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', user?.id, accountId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Transaction[]
    },
    enabled: !!user,
  })

  const addTransaction = useMutation({
    mutationFn: async ({ account_id, amount, merchant_raw, category_id, is_pending, notes, source_type }: Partial<Transaction>) => {
      // 1. Insert transaction
      const { error: txError } = await supabase.from('transactions').insert([{
        user_id: user?.id,
        account_id,
        amount,
        merchant_raw,
        category_id,
        source_type: source_type || 'manual',
        is_pending: is_pending ?? false,
        notes
      }])
      
      if (txError) throw txError

      // 2. Fetch current balance to update it efficiently atomic
      const { data: accData, error: accErr } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', account_id)
        .single()
        
      if (accErr) throw accErr

      const newBalance = Number(accData.balance) + Number(amount)
      
      const { error: updateErr } = await supabase
        .from('accounts')
        .update({ balance: newBalance, last_updated: new Date().toISOString() })
        .eq('id', account_id)

      if (updateErr) throw updateErr
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, variables.account_id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, undefined] })
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
    }
  })

  return { transactions: transactions ?? [], isLoading, addTransaction }
}
