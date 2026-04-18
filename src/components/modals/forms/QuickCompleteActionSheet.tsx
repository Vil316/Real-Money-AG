import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Coins, HandCoins, TrendingUp } from 'lucide-react'
import { BottomSheet } from '../../ui/bottom-sheet'
import {
  SheetPrimaryButton,
  SheetSection,
  SheetSegmentedSelector,
  SheetTextField,
} from '../sheet-primitives'
import { useDebts } from '@/hooks/useDebts'
import { useIncome } from '@/hooks/useIncome'
import { useObligations } from '@/hooks/useObligations'
import { useSavings } from '@/hooks/useSavings'
import type { ActionCenterAction, Debt, FrequencyType, Obligation, SavingsGoal } from '@/types'

type QuickCompleteHint =
  | 'update_debt_minimum_payment'
  | 'set_debt_payment_date'
  | 'set_obligation_due_date'
  | 'set_weekly_contribution'
  | 'log_income'

type UnknownErrorWithMessage = {
  message?: string
}

interface QuickCompleteActionSheetProps {
  isOpen: boolean
  action: ActionCenterAction | null
  debts: Debt[]
  obligations: Obligation[]
  savingsGoals: SavingsGoal[]
  defaultIncomeAmount?: number
  onClose: () => void
  onCompleted?: (message: string) => void
}

function isQuickCompleteHint(value: unknown): value is QuickCompleteHint {
  return value === 'update_debt_minimum_payment'
    || value === 'set_debt_payment_date'
    || value === 'set_obligation_due_date'
    || value === 'set_weekly_contribution'
    || value === 'log_income'
}

function extractEntityId(actionId: string, prefix: string): string | null {
  const fullPrefix = `${prefix}:`
  if (!actionId.startsWith(fullPrefix)) return null

  const id = actionId.slice(fullPrefix.length).trim()
  return id.length > 0 ? id : null
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message

  if (error && typeof error === 'object') {
    const withMessage = error as UnknownErrorWithMessage
    if (typeof withMessage.message === 'string' && withMessage.message.trim().length > 0) {
      return withMessage.message
    }
  }

  return fallback
}

export function QuickCompleteActionSheet({
  isOpen,
  action,
  debts,
  obligations,
  savingsGoals,
  defaultIncomeAmount,
  onClose,
  onCompleted,
}: QuickCompleteActionSheetProps) {
  const { setMinimumPayment, setPaymentTiming } = useDebts()
  const { setTiming } = useObligations()
  const { setWeeklyContribution } = useSavings()
  const { logIncome } = useIncome()

  const [minimumPayment, setMinimumPaymentValue] = useState('')
  const [debtDueDate, setDebtDueDate] = useState(getTodayIsoDate())
  const [debtFrequency, setDebtFrequency] = useState<FrequencyType>('monthly')
  const [dueDate, setDueDate] = useState(getTodayIsoDate())
  const [frequency, setFrequency] = useState<FrequencyType>('monthly')
  const [weeklyContribution, setWeeklyContributionValue] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hint = isQuickCompleteHint(action?.callbackHint) ? action.callbackHint : null

  const debtId = useMemo(
    () => action ? extractEntityId(action.id, 'debt-min') : null,
    [action],
  )
  const debtTimingId = useMemo(
    () => action ? extractEntityId(action.id, 'debt-date') : null,
    [action],
  )
  const obligationId = useMemo(
    () => action ? extractEntityId(action.id, 'obligation-date') : null,
    [action],
  )
  const goalId = useMemo(
    () => action ? extractEntityId(action.id, 'savings-plan') : null,
    [action],
  )

  const debt = debtId ? debts.find(item => item.id === debtId) : null
  const timingDebt = debtTimingId ? debts.find(item => item.id === debtTimingId) : null
  const obligation = obligationId ? obligations.find(item => item.id === obligationId) : null
  const goal = goalId ? savingsGoals.find(item => item.id === goalId) : null

  useEffect(() => {
    if (!isOpen) return

    setErrorMessage(null)

    if (hint === 'update_debt_minimum_payment') {
      if (import.meta.env.DEV && debtId && !debt) {
        console.warn('[quick-complete] Debt minimum action opened without matching debt entity', {
          actionId: action?.id,
          debtId,
        })
      }

      const currentMinimum = Number(debt?.minimum_payment || 0)
      setMinimumPaymentValue(currentMinimum > 0 ? String(currentMinimum) : '')
      return
    }

    if (hint === 'set_debt_payment_date') {
      const nextDue = typeof timingDebt?.next_payment_date === 'string' && timingDebt.next_payment_date.trim().length > 0
        ? timingDebt.next_payment_date
        : getTodayIsoDate()
      setDebtDueDate(nextDue)

      const nextFrequency = timingDebt?.payment_frequency === 'weekly' ? 'weekly' : 'monthly'
      setDebtFrequency(nextFrequency)
      return
    }

    if (hint === 'set_obligation_due_date') {
      setDueDate(getTodayIsoDate())
      const nextFrequency = obligation?.frequency === 'weekly' ? 'weekly' : 'monthly'
      setFrequency(nextFrequency)
      return
    }

    if (hint === 'set_weekly_contribution') {
      if (import.meta.env.DEV && goalId && !goal) {
        console.warn('[quick-complete] Weekly plan action opened without matching savings goal', {
          actionId: action?.id,
          goalId,
        })
      }

      const currentWeekly = Number(goal?.weekly_contribution || 0)
      setWeeklyContributionValue(currentWeekly > 0 ? String(currentWeekly) : '')
      return
    }

    if (hint === 'log_income') {
      const amount = Number(defaultIncomeAmount || 0)
      if (import.meta.env.DEV) {
        console.info('[quick-complete] Income quick action defaulted from profile amount', {
          defaultIncomeAmount,
          resolvedAmount: amount,
        })
      }
      setIncomeAmount(amount > 0 ? String(amount) : '')
    }
  }, [
    debt?.minimum_payment,
    defaultIncomeAmount,
    goal?.weekly_contribution,
    hint,
    isOpen,
    obligation?.frequency,
    timingDebt?.next_payment_date,
    timingDebt?.payment_frequency,
  ])

  const isSaving =
    setMinimumPayment.isPending
    || setPaymentTiming.isPending
    || setTiming.isPending
    || setWeeklyContribution.isPending
    || logIncome.isPending

  if (!hint || !action) return null

  const handleSuccess = (message: string) => {
    onCompleted?.(message)
    onClose()
  }

  const submitDebtMinimum = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!debtId) {
      setErrorMessage('Debt context is missing. Please reopen the action.')
      return
    }

    const parsedAmount = Number(minimumPayment)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Enter a minimum payment greater than 0.')
      return
    }

    console.info('[quick-complete] Submitting debt minimum payload', {
      debtId,
      minimumPayment: parsedAmount,
      callbackHint: action.callbackHint,
    })

    setMinimumPayment.mutate(
      { id: debtId, minimumPayment: parsedAmount },
      {
        onSuccess: () => handleSuccess('Minimum payment saved.'),
          onError: (error) => {
            console.error('[quick-complete] Failed to save minimum payment', { debtId, parsedAmount, error })
            setErrorMessage(getErrorMessage(error, 'Unable to save minimum payment.'))
          },
      },
    )
  }

  const submitObligationTiming = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!obligationId) {
      setErrorMessage('Obligation context is missing. Please reopen the action.')
      return
    }

    if (!dueDate) {
      setErrorMessage('Choose a due date to continue.')
      return
    }

    console.info('[quick-complete] Submitting obligation timing payload', {
      obligationId,
      dueDate,
      frequency,
      callbackHint: action.callbackHint,
    })

    setTiming.mutate(
      { id: obligationId, dueDate, frequency },
      {
        onSuccess: () => handleSuccess('Timing saved for this obligation.'),
          onError: (error) => {
            console.error('[quick-complete] Failed to save obligation timing', {
              obligationId,
              dueDate,
              frequency,
              error,
            })
            setErrorMessage(getErrorMessage(error, 'Unable to save obligation timing.'))
          },
      },
    )
  }

  const submitDebtTiming = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    const targetDebtId = action ? extractEntityId(action.id, 'debt-date') : null
    if (!targetDebtId) {
      setErrorMessage('Debt context is missing. Please reopen the action.')
      return
    }

    if (!debtDueDate) {
      setErrorMessage('Choose a due date to continue.')
      return
    }

    setPaymentTiming.mutate(
      {
        id: targetDebtId,
        nextPaymentDate: debtDueDate,
        paymentFrequency: debtFrequency,
      },
      {
        onSuccess: () => handleSuccess('Debt timing saved.'),
        onError: (error) => {
          console.error('[quick-complete] Failed to save debt timing', {
            debtId: targetDebtId,
            debtDueDate,
            debtFrequency,
            error,
          })
          setErrorMessage(getErrorMessage(error, 'Unable to save debt timing.'))
        },
      },
    )
  }

  const submitWeeklyPlan = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!goalId) {
      setErrorMessage('Savings goal context is missing. Please reopen the action.')
      return
    }

    const parsedAmount = Number(weeklyContribution)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Enter a weekly amount greater than 0.')
      return
    }

    console.info('[quick-complete] Submitting weekly contribution payload', {
      goalId,
      weeklyContribution: parsedAmount,
      callbackHint: action.callbackHint,
    })

    setWeeklyContribution.mutate(
      { id: goalId, weeklyContribution: parsedAmount },
      {
        onSuccess: () => handleSuccess('Weekly plan saved.'),
          onError: (error) => {
            console.error('[quick-complete] Failed to save weekly contribution', { goalId, parsedAmount, error })
            setErrorMessage(getErrorMessage(error, 'Unable to save weekly plan.'))
          },
      },
    )
  }

  const submitIncomeLog = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    const parsedAmount = Number(incomeAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Enter an income amount greater than 0.')
      return
    }

    const date = getTodayIsoDate()
    console.info('[quick-complete] Submitting income log payload', {
      amount: parsedAmount,
      date,
      payment_method: 'bank_transfer',
      callbackHint: action.callbackHint,
    })

    logIncome.mutate(
      {
        amount: parsedAmount,
        date,
        payment_method: 'bank_transfer',
      },
      {
        onSuccess: () => handleSuccess('Income logged for this cycle.'),
          onError: (error) => {
            console.error('[quick-complete] Failed to log income', { parsedAmount, error })
            setErrorMessage(getErrorMessage(error, 'Unable to log income.'))
          },
      },
    )
  }

  if (hint === 'update_debt_minimum_payment') {
    const debtName = debt?.name?.trim() || debt?.creditor_name?.trim() || 'Debt'

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Add Minimum Payment"
        contextLabel="Quick Complete"
        headerMeta={debtName}
        headerIcon={<HandCoins size={16} strokeWidth={2.2} />}
      >
        <form onSubmit={submitDebtMinimum} className="mt-1.5 space-y-3.5 pb-1">
          <SheetSection label="Minimum Payment" meta="Set the monthly minimum to improve debt guidance.">
            <SheetTextField
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={minimumPayment}
              onChange={(event) => setMinimumPaymentValue(event.target.value)}
              required
              autoFocus
            />
          </SheetSection>

          {errorMessage ? <p className="text-[12px] text-[#efb7b7]">{errorMessage}</p> : null}

          <SheetPrimaryButton type="submit" tone="red" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Minimum Payment'}
          </SheetPrimaryButton>
        </form>
      </BottomSheet>
    )
  }

  if (hint === 'set_debt_payment_date') {
    const debtName = timingDebt?.name?.trim() || timingDebt?.creditor_name?.trim() || 'Debt'

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Set Debt Timing"
        contextLabel="Quick Complete"
        headerMeta={debtName}
        headerIcon={<CalendarClock size={16} strokeWidth={2.2} />}
      >
        <form onSubmit={submitDebtTiming} className="mt-1.5 space-y-3.5 pb-1">
          <SheetSection label="Next Due Date" meta="Set the next payment date for this debt.">
            <SheetTextField
              type="date"
              value={debtDueDate}
              onChange={(event) => setDebtDueDate(event.target.value)}
              required
              autoFocus
            />
          </SheetSection>

          <SheetSection label="Cadence" meta="Optional quick cadence update for scheduling.">
            <SheetSegmentedSelector
              value={debtFrequency}
              onChange={(value) => setDebtFrequency(value === 'weekly' ? 'weekly' : 'monthly')}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              tone="neutral"
            />
          </SheetSection>

          {errorMessage ? <p className="text-[12px] text-[#efb7b7]">{errorMessage}</p> : null}

          <SheetPrimaryButton type="submit" tone="neutral" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Debt Timing'}
          </SheetPrimaryButton>
        </form>
      </BottomSheet>
    )
  }

  if (hint === 'set_obligation_due_date') {
    const obligationName = obligation?.name?.trim() || 'Obligation'

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Set Obligation Timing"
        contextLabel="Quick Complete"
        headerMeta={obligationName}
        headerIcon={<CalendarClock size={16} strokeWidth={2.2} />}
      >
        <form onSubmit={submitObligationTiming} className="mt-1.5 space-y-3.5 pb-1">
          <SheetSection label="Due Date" meta="Choose the next expected date for this obligation.">
            <SheetTextField
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
              autoFocus
            />
          </SheetSection>

          <SheetSection label="Cadence" meta="Use a simple rhythm for planning windows.">
            <SheetSegmentedSelector
              value={frequency}
              onChange={(value) => setFrequency(value === 'weekly' ? 'weekly' : 'monthly')}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              tone="neutral"
            />
          </SheetSection>

          {errorMessage ? <p className="text-[12px] text-[#efb7b7]">{errorMessage}</p> : null}

          <SheetPrimaryButton type="submit" tone="neutral" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Timing'}
          </SheetPrimaryButton>
        </form>
      </BottomSheet>
    )
  }

  if (hint === 'set_weekly_contribution') {
    const goalName = goal?.name?.trim() || 'Savings goal'

    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Set Weekly Plan"
        contextLabel="Quick Complete"
        headerMeta={goalName}
        headerIcon={<TrendingUp size={16} strokeWidth={2.2} />}
      >
        <form onSubmit={submitWeeklyPlan} className="mt-1.5 space-y-3.5 pb-1">
          <SheetSection label="Weekly Contribution" meta="Set a weekly amount for planning and progress guidance.">
            <SheetTextField
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={weeklyContribution}
              onChange={(event) => setWeeklyContributionValue(event.target.value)}
              required
              autoFocus
            />
          </SheetSection>

          {errorMessage ? <p className="text-[12px] text-[#efb7b7]">{errorMessage}</p> : null}

          <SheetPrimaryButton type="submit" tone="green" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Weekly Plan'}
          </SheetPrimaryButton>
        </form>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Log Income"
      contextLabel="Quick Complete"
      headerMeta="Current cycle"
      headerIcon={<Coins size={16} strokeWidth={2.2} />}
    >
      <form onSubmit={submitIncomeLog} className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Income Amount" meta="Log your current cycle income in one step.">
          <SheetTextField
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={incomeAmount}
            onChange={(event) => setIncomeAmount(event.target.value)}
            required
            autoFocus
          />
        </SheetSection>

        {errorMessage ? <p className="text-[12px] text-[#efb7b7]">{errorMessage}</p> : null}

        <SheetPrimaryButton type="submit" tone="neutral" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Log Income'}
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
