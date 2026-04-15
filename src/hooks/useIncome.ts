import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { IncomeEntry } from '@/types'
import { useAuth } from './useAuth'
import { getCurrentWeekRef } from '@/lib/utils'

export function useIncome() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: incomeEntries, isLoading } = useQuery({
    queryKey: ['income', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
      if (error) throw error
      return data as IncomeEntry[]
    },
    enabled: !!user,
  })

  const logIncome = useMutation({
    mutationFn: async (entry: Partial<IncomeEntry>) => {
      const { error } = await supabase.from('income_entries').insert([{ 
        ...entry, 
        user_id: user?.id,
        week_reference: entry.week_reference || getCurrentWeekRef()
      }])
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income', user?.id] })
  })

  return { incomeEntries: incomeEntries ?? [], isLoading, logIncome }
}
