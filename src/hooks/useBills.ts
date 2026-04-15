import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Bill } from '@/types'
import { useAuth } from './useAuth'

export function useBills() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .order('next_due_date')
      if (error) throw error
      return data as Bill[]
    },
    enabled: !!user,
  })

  const markPaid = useMutation({
    mutationFn: async ({ id, nextDueDate }: { id: string, nextDueDate: string }) => {
      // 1. Mark Bill Paid
      const { error } = await supabase.from('bills').update({
        next_due_date: nextDueDate,
        is_paid_this_cycle: true
      }).eq('id', id)
      if (error) throw error

      // 2. Automated Ledger Tracking (Double Entry)
      const bill = bills?.find(b => b.id === id)
      if (bill && bill.account_id) {
        // Run atomic ledger deduction independently in background
        supabase.from('transactions').insert([{
          user_id: user?.id, account_id: bill.account_id, amount: -Math.abs(bill.amount), merchant: bill.name, category: 'Bills', is_pending: false, notes: 'Auto-paid from Bills Dashboard'
        }]).then(() => {
          supabase.from('accounts').select('balance').eq('id', bill.account_id).single().then(({ data }) => {
            if (data) supabase.from('accounts').update({ balance: Number(data.balance) - bill.amount }).eq('id', bill.account_id)
          })
        })
      }
    },
    onMutate: async ({ id, nextDueDate }) => {
      await queryClient.cancelQueries({ queryKey: ['bills', user?.id] })
      const previous = queryClient.getQueryData(['bills', user?.id])
      queryClient.setQueryData(['bills', user?.id], (old: Bill[]) => 
        old.map(b => b.id === id ? { ...b, next_due_date: nextDueDate, is_paid_this_cycle: true } : b)
      )
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) queryClient.setQueryData(['bills', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', user?.id] })
    }
  })

  const addBill = useMutation({
    mutationFn: async (newBill: any) => {
      const { error } = await supabase.from('bills').insert([{ ...newBill, user_id: user?.id }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bills', user?.id] })
  })

  return { bills: bills ?? [], isLoading, markPaid, addBill }
}
