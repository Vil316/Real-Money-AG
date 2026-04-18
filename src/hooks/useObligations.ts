import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isObligationActive, normalizeObligation } from '@/lib/obligations'
import type { FrequencyType, Obligation, RawObligation } from '@/types'
import { useAuth } from './useAuth'

type SupabaseMutationError = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

function isMissingColumnError(error: SupabaseMutationError): boolean {
  const code = (error.code || '').toUpperCase()
  const message = (error.message || '').toLowerCase()

  if (code === 'PGRST204' || code === '42703') return true
  if (message.includes('schema cache') && message.includes('could not find')) return true
  if (message.includes('column') && message.includes('does not exist')) return true

  return false
}

function getErrorMessage(error: SupabaseMutationError, fallback: string): string {
  if (typeof error.message === 'string' && error.message.trim().length > 0) return error.message
  return fallback
}

export function useObligations() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: obligations, isLoading } = useQuery({
    queryKey: ['obligations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user?.id)
      if (error) throw error

      const rows = (data ?? []) as RawObligation[]
      return rows
        .map((row, index) => normalizeObligation(row, index))
        .filter(isObligationActive) as Obligation[]
    },
    enabled: !!user,
  })

  const markDone = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount: number }) => {
      const { error: fulfillmentError } = await supabase.from('obligation_fulfillments').insert([{
        obligation_id: id,
        user_id: user?.id,
        amount
      }])
      if (fulfillmentError) throw fulfillmentError

      const { error } = await supabase.from('obligations').update({
        is_fulfilled_this_cycle: true,
        last_fulfilled_date: new Date().toISOString()
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obligations', user?.id] })
  })

  const setTiming = useMutation({
    mutationFn: async ({ id, dueDate, frequency }: { id: string, dueDate: string, frequency: FrequencyType }) => {
      console.info('[obligations.setTiming] Starting obligation timing save', {
        id,
        dueDate,
        frequency,
      })

      const { data: frequencyData, error: frequencyError } = await supabase
        .from('obligations')
        .update({ frequency })
        .eq('id', id)
        .select('id, frequency')
        .maybeSingle()
      if (frequencyError) {
        console.error('[obligations.setTiming] Failed to update frequency', {
          id,
          frequency,
          error: frequencyError,
        })
        throw new Error(getErrorMessage(frequencyError, 'Unable to update obligation frequency.'))
      }

      if (!frequencyData?.id) {
        console.error('[obligations.setTiming] Frequency update matched no rows', {
          id,
          frequency,
          userId: user?.id,
        })
        throw new Error('Unable to save obligation timing: no matching obligation row was updated.')
      }

      const dueDateColumns = ['due_date', 'next_due_date', 'next_payment_date'] as const
      let dueDateSaved = false

      for (const columnName of dueDateColumns) {
        console.info('[obligations.setTiming] Attempting due-date field update', {
          id,
          attemptedColumn: columnName,
          dueDate,
        })

        const payload: Record<string, unknown> = { [columnName]: dueDate }
        const { data: dueDateData, error } = await supabase
          .from('obligations')
          .update(payload)
          .eq('id', id)
          .select(`id, ${columnName}`)
          .maybeSingle()

        if (!error) {
          if (!dueDateData?.id) {
            console.error('[obligations.setTiming] Due-date update matched no rows', {
              id,
              attemptedColumn: columnName,
              dueDate,
              userId: user?.id,
            })
            throw new Error('Unable to save obligation due date: no matching obligation row was updated.')
          }

          console.info('[obligations.setTiming] Due-date update succeeded', {
            id,
            savedColumn: columnName,
            savedValue: dueDate,
            returnedValue: dueDateData[columnName],
          })
          dueDateSaved = true
          break
        }

        if (isMissingColumnError(error)) {
          console.warn('[obligations.setTiming] Due-date column missing, trying next candidate', {
            id,
            dueDate,
            attemptedColumn: columnName,
            error,
          })
          continue
        }

        console.error('[obligations.setTiming] Failed to update due-date column', {
          id,
          dueDate,
          attemptedColumn: columnName,
          error,
        })
        throw new Error(getErrorMessage(error, `Unable to save due date on ${columnName}.`))
      }

      if (!dueDateSaved) {
        console.error('[obligations.setTiming] No supported due-date column exists on obligations table', {
          id,
          dueDate,
          attemptedColumns: dueDateColumns,
        })
        throw new Error('Unable to save obligation timing: no supported due-date column exists. Apply the due_date migration.')
      }

      console.info('[obligations.setTiming] Obligation timing save completed', {
        id,
        dueDate,
        frequency,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['obligations', user?.id] }),
  })

  return { obligations: obligations ?? [], isLoading, markDone, setTiming }
}
