import { formatCurrency } from '@/lib/utils'
import type {
  FrequencyType,
  Obligation,
  ObligationAmountType,
  ObligationCadence,
  ObligationType,
  RawObligation,
} from '@/types'

const DEFAULT_OBLIGATION_CADENCE: ObligationCadence = 'monthly'
const DEFAULT_OBLIGATION_AMOUNT_TYPE: ObligationAmountType = 'fixed'

const OBLIGATION_CADENCE_LABELS: Record<ObligationCadence, string> = {
  weekly: 'weekly',
  every_2_weeks: 'every 2 weeks',
  monthly: 'monthly',
  payday_linked: 'payday linked',
  quarterly: 'quarterly',
  annual: 'annual',
  'one-off': 'one-off',
  custom: 'custom cadence',
}

function toFiniteNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function isFrequencyType(value: string): value is FrequencyType {
  return value === 'weekly' || value === 'monthly' || value === 'quarterly' || value === 'annual' || value === 'one-off'
}

function isObligationCadence(value: string): value is ObligationCadence {
  return value in OBLIGATION_CADENCE_LABELS
}

function sanitizeAmountType(value: unknown): ObligationAmountType {
  return value === 'percentage' ? 'percentage' : DEFAULT_OBLIGATION_AMOUNT_TYPE
}

function sanitizeCadence(value: unknown): ObligationCadence {
  if (typeof value === 'string' && isObligationCadence(value)) return value
  return DEFAULT_OBLIGATION_CADENCE
}

function sanitizeFrequency(value: unknown, cadence: ObligationCadence): FrequencyType {
  if (typeof value === 'string' && isFrequencyType(value)) return value

  switch (cadence) {
    case 'weekly':
    case 'every_2_weeks':
    case 'payday_linked':
      return 'weekly'
    case 'quarterly':
      return 'quarterly'
    case 'annual':
      return 'annual'
    case 'one-off':
      return 'one-off'
    case 'custom':
    case 'monthly':
    default:
      return 'monthly'
  }
}

function toNormalizedType(value: unknown): ObligationType {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().toLowerCase() as ObligationType
  }
  return 'other'
}

export function isObligationActive(obligation: Pick<RawObligation, 'is_active' | 'enabled'>): boolean {
  const isActive = obligation.is_active !== false
  const isEnabled = obligation.enabled !== false
  return isActive && isEnabled
}

export function getObligationCadence(obligation: Pick<Obligation, 'cadence' | 'frequency'>): ObligationCadence {
  if (typeof obligation.cadence === 'string' && isObligationCadence(obligation.cadence)) {
    return obligation.cadence
  }
  return sanitizeCadence(obligation.frequency)
}

export function formatObligationCadence(cadence: ObligationCadence): string {
  return OBLIGATION_CADENCE_LABELS[cadence]
}

export function formatObligationBaseLabel(base: string | null | undefined): string | null {
  const cleaned = (base ?? '').trim().toLowerCase()
  if (!cleaned) return null

  switch (cleaned) {
    case 'income_weekly':
      return 'weekly income'
    case 'income_every_2_weeks':
    case 'income_biweekly':
      return 'every 2 weeks income'
    case 'income_monthly':
      return 'monthly income'
    case 'income_annual':
      return 'annual income'
    default:
      return cleaned.replace(/_/g, ' ')
  }
}

export function formatObligationTypeLabel(type: string | null | undefined): string {
  const cleaned = (type ?? '').trim()
  if (!cleaned) return 'Other'
  return cleaned
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

export function doesObligationAffectProtectedMoney(obligation: Pick<Obligation, 'amount_type' | 'affects_protected_money'>): boolean {
  if (typeof obligation.affects_protected_money === 'boolean') {
    return obligation.affects_protected_money
  }
  return obligation.amount_type === 'fixed'
}

export function formatObligationAmountPresentation(
  obligation: Pick<Obligation, 'amount_type' | 'amount' | 'percentage_of' | 'cadence' | 'frequency'>,
  currency: string,
): string {
  const amount = toFiniteNumber(obligation.amount)

  if (obligation.amount_type === 'percentage') {
    const baseLabel = formatObligationBaseLabel(obligation.percentage_of)
    return baseLabel ? `${amount}% of ${baseLabel}` : `${amount}%`
  }

  const cadence = getObligationCadence(obligation)
  return `${formatCurrency(amount, currency)} ${formatObligationCadence(cadence)}`
}

export function getObligationMonthlyMultiplier(cadence: ObligationCadence): number {
  switch (cadence) {
    case 'weekly':
    case 'payday_linked':
      return 4.33
    case 'every_2_weeks':
      return 2.17
    case 'monthly':
      return 1
    case 'quarterly':
      return 1 / 3
    case 'annual':
      return 1 / 12
    case 'one-off':
    case 'custom':
    default:
      return 1
  }
}

export function normalizeObligation(row: RawObligation, index: number): Obligation {
  const cadence = sanitizeCadence(row.cadence ?? row.frequency)
  const amountType = sanitizeAmountType(row.amount_type)
  const name = typeof row.name === 'string' && row.name.trim().length > 0
    ? row.name.trim()
    : `Commitment ${index + 1}`

  return {
    id: row.id?.trim() || `obligation-${index + 1}`,
    user_id: row.user_id?.trim() || '',
    name,
    type: toNormalizedType(row.type),
    amount_type: amountType,
    amount: toFiniteNumber(row.amount),
    percentage_of: row.percentage_of?.trim() || null,
    cadence,
    frequency: sanitizeFrequency(row.frequency, cadence),
    due_date: row.due_date?.trim() || null,
    next_due_date: row.next_due_date?.trim() || null,
    next_payment_date: row.next_payment_date?.trim() || null,
    is_fulfilled_this_cycle: row.is_fulfilled_this_cycle === true,
    last_fulfilled_date: row.last_fulfilled_date?.trim() || null,
    notes: row.notes?.trim() || null,
    is_active: row.is_active !== false,
    enabled: row.enabled !== false,
    affects_protected_money:
      typeof row.affects_protected_money === 'boolean'
        ? row.affects_protected_money
        : amountType === 'fixed',
  }
}
