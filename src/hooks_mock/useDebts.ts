import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Debt } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useDebts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: debts, isLoading } = useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      return [...mockDB.debts.filter(d => !d.is_settled)]
    },
    enabled: !!user,
  })

  const logPayment = useMutation({
    mutationFn: async ({ debtId, amount }: { debtId: string, amount: number }) => {
      const debtIdx = mockDB.debts.findIndex(d => d.id === debtId)
      if (debtIdx !== -1) {
        mockDB.debts[debtIdx].current_balance = Math.max(0, mockDB.debts[debtIdx].current_balance - amount)
        if (mockDB.debts[debtIdx].current_balance === 0) mockDB.debts[debtIdx].is_settled = true
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
  })

  const markBNPLPaid = useMutation({
    mutationFn: async ({ debtId, instalments }: { debtId: string, instalments: any }) => {
      const idx = mockDB.debts.findIndex(d => d.id === debtId)
      if (idx !== -1) mockDB.debts[idx].bnpl_instalments = instalments
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts', user?.id] })
  })

  return { debts: debts ?? [], isLoading, logPayment, markBNPLPaid }
}
