import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Account } from '@/types'
import { useAuth } from './useAuth'
import { mockDB } from '@/lib/mockDB'

export function useAccounts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      return [...mockDB.accounts.filter(a => !a.is_archived)]
    },
    enabled: !!user,
  })

  const addAccount = useMutation({
    mutationFn: async (newAccount: Partial<Account>) => {
      const acc = { ...newAccount, id: Math.random().toString(), user_id: user?.id, is_archived: false } as Account
      mockDB.accounts.push(acc)
      return acc
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  const updateAccount = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Account> }) => {
      const idx = mockDB.accounts.findIndex(a => a.id === id)
      if (idx !== -1) mockDB.accounts[idx] = { ...mockDB.accounts[idx], ...updates }
      return mockDB.accounts[idx]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  const archiveAccount = useMutation({
    mutationFn: async (id: string) => {
      const idx = mockDB.accounts.findIndex(a => a.id === id)
      if (idx !== -1) mockDB.accounts[idx].is_archived = true
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', user?.id] })
  })

  return { accounts: accounts ?? [], isLoading, error, addAccount, updateAccount, archiveAccount }
}
