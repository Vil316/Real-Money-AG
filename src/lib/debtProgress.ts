function toSafeNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export type DebtProgress = {
  originalBalance: number
  currentBalance: number
  repaidAmount: number
  progressPercent: number
  progressWidth: number
}

export function calculateDebtProgress(originalBalanceInput: unknown, currentBalanceInput: unknown): DebtProgress {
  const originalBalance = Math.max(toSafeNumber(originalBalanceInput), 0)
  const normalizedCurrentBalance = Math.max(toSafeNumber(currentBalanceInput), 0)

  const currentBalance = originalBalance > 0
    ? Math.min(normalizedCurrentBalance, originalBalance)
    : normalizedCurrentBalance

  const repaidAmount = Math.max(originalBalance - currentBalance, 0)
  const progressRaw = originalBalance > 0
    ? clampPercent((repaidAmount / originalBalance) * 100)
    : 0

  const progressPercent = Math.round(progressRaw)
  const progressWidth = Number(progressRaw.toFixed(2))

  return {
    originalBalance,
    currentBalance,
    repaidAmount,
    progressPercent,
    progressWidth,
  }
}