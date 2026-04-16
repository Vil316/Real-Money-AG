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
      if (!account_id || amount == null || !merchant_raw) {
        throw new Error('Transaction account, amount, and merchant are required')
      }

      const { error } = await supabase.rpc('insert_manual_transaction', {
        p_account_id: account_id,
        p_amount: amount,
        p_merchant_raw: merchant_raw,
        p_category_id: category_id ?? null,
        p_is_pending: is_pending ?? false,
        p_notes: notes ?? null,
        p_source_type: source_type ?? 'manual',
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, variables.account_id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, undefined] })
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
    }
  })

  return { transactions: transactions ?? [], isLoading, addTransaction }
}
