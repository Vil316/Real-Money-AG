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
    mutationFn: async ({ debtId, amount }: { debtId: string, amount: number }) => {
      // 1. Log payment
      const { error: paymentError } = await supabase.from('debt_payments').insert([{
        debt_id: debtId,
        user_id: user?.id,
        amount
      }])
      if (paymentError) throw paymentError

      // 2. Update debt balance
      const debt = debts?.find(d => d.id === debtId)
      if (debt) {
        await supabase.from('debts').update({
          current_balance: Math.max(0, Number(debt.current_balance) - amount)
        }).eq('id', debtId)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
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
