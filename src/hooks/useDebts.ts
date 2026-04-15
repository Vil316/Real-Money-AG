import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Debt } from '@/types'
import { useAuth } from './useAuth'

export function useDebts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: debts, isLoading } = useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_settled', false)
        .order('next_payment_date')
      if (error) throw error
      return data as Debt[]
    },
    enabled: !!user,
  })

  const logPayment = useMutation({
    mutationFn: async ({ debtId, amount, accountId }: { debtId: string, amount: number, accountId: string }) => {
      // 1. Get Debt
      const debt = debts?.find(d => d.id === debtId)
      if (!debt) throw new Error("Debt not found")

      // 2. Update Debt Balance
      const { error: debtErr } = await supabase.from('debts').update({
        current_balance: Math.max(0, Number(debt.current_balance) - amount),
        is_settled: Math.max(0, Number(debt.current_balance) - amount) === 0
      }).eq('id', debtId)
      if (debtErr) throw debtErr

      // 3. Log Source Transaction
      const { error: txErr } = await supabase.from('transactions').insert([{
        user_id: user?.id,
        account_id: accountId,
        amount: -Math.abs(amount),
        merchant: `Payment to ${debt.creditor_name}`,
        category: 'Debt Repayment',
        is_pending: false,
        notes: `Automated debt mapping for ${debt.creditor_name}`
      }])
      if (txErr) throw txErr

      // 4. Update Source Account Balance (Mechanical Deduct)
      const { data: accData } = await supabase.from('accounts').select('balance').eq('id', accountId).single()
      if (accData) {
        await supabase.from('accounts').update({
          balance: Number(accData.balance) - amount
        }).eq('id', accountId)
      }
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, v.accountId] })
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
    }
  })

  const markBNPLPaid = useMutation({
    mutationFn: async ({ debtId, instalments }: { debtId: string, instalments: any }) => {
      const { error } = await supabase.from('debts').update({ bnpl_instalments: instalments }).eq('id', debtId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
  })

  const addDebt = useMutation({
    mutationFn: async (newDebt: any) => {
      const { error } = await supabase.from('debts').insert([{ ...newDebt, user_id: user?.id }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
  })

  return { debts: debts ?? [], isLoading, logPayment, markBNPLPaid, addDebt }
}
