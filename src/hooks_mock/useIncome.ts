import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { IncomeEntry } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'
import { getCurrentWeekRef } from '@/lib/utils'

export function useIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: incomeEntries, isLoading } = useQuery({
    queryKey: ['income', user?.id],
    queryFn: async () => {
      return [...mockDB.incomeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    enabled: !!user,
  })

  const logIncome = useMutation({
    mutationFn: async (entry: Partial<IncomeEntry>) => {
      mockDB.incomeEntries.push({
        ...entry,
        id: Math.random().toString(),
        user_id: user?.id,
        week_reference: entry.week_reference || getCurrentWeekRef(),
        date: new Date().toISOString()
      } as IncomeEntry)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income', user?.id] })
  })

  return { incomeEntries: incomeEntries ?? [], isLoading, logIncome }
}
