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
      const paymentAmount = Number(amount)
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0.')
      }

      console.info('[debts.logPayment] Starting debt payment log', {
        debtId,
        paymentAmount,
        accountId,
        userId: user?.id,
      })

      const { data: debtRow, error: debtLookupError } = await supabase
        .from('debts')
        .select('id, creditor_name, original_balance, current_balance, is_settled')
        .eq('id', debtId)
        .eq('user_id', user?.id)
        .maybeSingle()

      if (debtLookupError) {
        console.error('[debts.logPayment] Failed to load debt before payment', {
          debtId,
          paymentAmount,
          error: debtLookupError,
        })
        throw debtLookupError
      }

      if (!debtRow?.id) {
        throw new Error('Debt not found.')
      }

      console.info('[debts.logPayment] Debt row before payment', {
        debtId: debtRow.id,
        creditorName: debtRow.creditor_name,
        originalBalance: Number(debtRow.original_balance || 0),
        currentBalance: Number(debtRow.current_balance || 0),
        isSettled: debtRow.is_settled,
      })

      console.info('[debts.logPayment] Mutation payload', {
        debtId,
        accountId,
        paymentAmount,
      })

      const currentBalance = Number(debtRow.current_balance || 0)
      const nextBalance = Math.max(0, currentBalance - paymentAmount)
      const nextSettled = nextBalance === 0

      const { data: updatedDebt, error: debtUpdateError } = await supabase
        .from('debts')
        .update({
          current_balance: nextBalance,
          is_settled: nextSettled,
        })
        .eq('id', debtId)
        .eq('user_id', user?.id)
        .select('id, original_balance, current_balance, is_settled')
        .maybeSingle()

      if (debtUpdateError) {
        console.error('[debts.logPayment] Failed to update debt balance', {
          debtId,
          paymentAmount,
          currentBalance,
          nextBalance,
          error: debtUpdateError,
        })
        throw debtUpdateError
      }

      if (!updatedDebt?.id) {
        throw new Error('Unable to update debt balance: no matching debt row was updated.')
      }

      const debtName = debtRow.creditor_name || 'Debt payment'

      const { error: txErr } = await supabase.from('transactions').insert([{
        user_id: user?.id,
        account_id: accountId,
        amount: -Math.abs(paymentAmount),
        merchant_raw: `Payment to ${debtName}`,
        source_type: 'manual',
        is_pending: false,
        notes: `Automated debt mapping for ${debtName}`
      }])
      if (txErr) {
        console.error('[debts.logPayment] Failed to insert payment transaction', {
          debtId,
          accountId,
          paymentAmount,
          error: txErr,
        })
        throw txErr
      }

      const { data: accData, error: accountLookupError } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('id', accountId)
        .eq('user_id', user?.id)
        .maybeSingle()

      if (accountLookupError) {
        console.error('[debts.logPayment] Failed to load source account for balance update', {
          debtId,
          accountId,
          paymentAmount,
          error: accountLookupError,
        })
        throw accountLookupError
      }

      if (accData?.id) {
        const nextAccountBalance = Number(accData.balance || 0) - paymentAmount
        const { error: accountUpdateError } = await supabase
          .from('accounts')
          .update({ balance: nextAccountBalance })
          .eq('id', accData.id)
          .eq('user_id', user?.id)

        if (accountUpdateError) {
          console.error('[debts.logPayment] Failed to update source account balance', {
            debtId,
            accountId,
            paymentAmount,
            nextAccountBalance,
            error: accountUpdateError,
          })
          throw accountUpdateError
        }
      }

      console.info('[debts.logPayment] Debt payment log completed', {
        debtId,
        accountId,
        paymentAmount,
          previousBalance: Number(debtRow.current_balance || 0),
          currentBalance: Number(updatedDebt.current_balance || 0),
          originalBalance: Number(updatedDebt.original_balance || debtRow.original_balance || 0),
          canonicalRemainingField: 'debts.current_balance',
        isSettled: updatedDebt.is_settled,
      })

        console.info('[debts.logPayment] Debt row after payment', {
          debtId: updatedDebt.id,
          originalBalance: Number(updatedDebt.original_balance || debtRow.original_balance || 0),
          currentBalance: Number(updatedDebt.current_balance || 0),
          isSettled: updatedDebt.is_settled,
        })
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, v.accountId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, undefined] })
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

  const setMinimumPayment = useMutation({
    mutationFn: async ({ id, minimumPayment }: { id: string, minimumPayment: number }) => {
      console.info('[debts.setMinimumPayment] Starting minimum payment save', {
        id,
        minimumPayment,
      })

      const { data, error } = await supabase
        .from('debts')
        .update({ minimum_payment: minimumPayment })
        .eq('id', id)
        .select('id, minimum_payment')
        .maybeSingle()

      if (error) {
        console.error('[debts.setMinimumPayment] Failed to save minimum payment', {
          id,
          minimumPayment,
          error,
        })
        throw error
      }

      if (!data?.id) {
        console.error('[debts.setMinimumPayment] Update matched no rows', {
          id,
          minimumPayment,
          userId: user?.id,
        })
        throw new Error('Unable to save minimum payment: no matching debt row was updated.')
      }

      console.info('[debts.setMinimumPayment] Minimum payment save completed', {
        id,
        savedValue: data.minimum_payment,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] }),
  })

  const setPaymentTiming = useMutation({
    mutationFn: async ({ id, nextPaymentDate, paymentFrequency }: { id: string, nextPaymentDate: string, paymentFrequency?: string }) => {
      const payload: { next_payment_date: string; payment_frequency?: string } = {
        next_payment_date: nextPaymentDate,
      }

      if (typeof paymentFrequency === 'string' && paymentFrequency.trim().length > 0) {
        payload.payment_frequency = paymentFrequency
      }

      const { error } = await supabase
        .from('debts')
        .update(payload)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] }),
  })

  return { debts: debts ?? [], isLoading, logPayment, markBNPLPaid, addDebt, setMinimumPayment, setPaymentTiming }
}
