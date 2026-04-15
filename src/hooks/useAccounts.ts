import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/types'
import { useAuth } from './useAuth'

export function useAccounts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_archived', false)
        .order('type')
      if (error) throw error
      return data as Account[]
    },
    enabled: !!user,
  })

  const addAccount = useMutation({
    mutationFn: async (newAccount: Partial<Account>) => {
      const { data, error } = await supabase.from('accounts').insert([{ ...newAccount, user_id: user?.id }]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  const updateAccount = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Account> }) => {
      const { data, error } = await supabase.from('accounts').update(updates).eq('id', id).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  const archiveAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').update({ is_archived: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  return { accounts: accounts ?? [], isLoading, error, addAccount, updateAccount, archiveAccount }
}
