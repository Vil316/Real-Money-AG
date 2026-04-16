import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRightLeft, CheckCircle2, SendHorizontal } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import {
  EmptyStateCard,
  FloatingTopControls,
  MetadataChip,
  PageShell,
  PremiumListRow,
  SectionCard,
  SectionHeader,
  SummaryCard,
} from '@/components/design'

export function TransferPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedFrom = searchParams.get('from')

  const { accounts, isLoading } = useAccounts()
  const { transactions, addTransaction } = useTransactions()

  const transferableAccounts = useMemo(
    () => accounts.filter(account => account.type !== 'loan' && account.type !== 'informal_debt'),
    [accounts],
  )

  const [fromAccountId, setFromAccountId] = useState(preselectedFrom || '')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!transferableAccounts.length) return

    const validFrom = transferableAccounts.some(account => account.id === fromAccountId)
    const resolvedFrom = validFrom
      ? fromAccountId
      : (preselectedFrom && transferableAccounts.some(account => account.id === preselectedFrom)
        ? preselectedFrom
        : transferableAccounts[0].id)

    const fallbackTo = transferableAccounts.find(account => account.id !== resolvedFrom)?.id || ''

    setFromAccountId(resolvedFrom)
    setToAccountId(prev => {
      if (prev && prev !== resolvedFrom && transferableAccounts.some(account => account.id === prev)) {
        return prev
      }
      return fallbackTo
    })
  }, [fromAccountId, preselectedFrom, transferableAccounts])

  const fromAccount = transferableAccounts.find(account => account.id === fromAccountId)
  const toAccount = transferableAccounts.find(account => account.id === toAccountId)

  const transferableTotal = transferableAccounts
    .filter(account => account.type === 'bank' || account.type === 'cash')
    .reduce((sum, account) => sum + Number(account.balance), 0)

  const transferHistory = useMemo(
    () => transactions
      .filter(transaction => transaction.merchant_raw.toLowerCase().startsWith('transfer '))
      .slice(0, 8),
    [transactions],
  )

  const transferAmount = Number(amount)

  const handleTransfer = async () => {
    setError(null)
    setSuccess(null)

    if (!fromAccount || !toAccount) {
      setError('Choose both source and destination accounts.')
      return
    }

    if (fromAccount.id === toAccount.id) {
      setError('Source and destination must be different accounts.')
      return
    }

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      setError('Enter a valid transfer amount greater than zero.')
      return
    }

    if (Number(fromAccount.balance) < transferAmount) {
      setError('Insufficient funds in the selected source account.')
      return
    }

    const detail = note.trim()
      ? `Internal transfer · ${note.trim()}`
      : 'Internal transfer between accounts'

    try {
      await addTransaction.mutateAsync({
        account_id: fromAccount.id,
        merchant_raw: `Transfer to ${toAccount.name}`,
        amount: -Math.abs(transferAmount),
        is_pending: false,
        source_type: 'manual',
        notes: detail,
      })

      await addTransaction.mutateAsync({
        account_id: toAccount.id,
        merchant_raw: `Transfer from ${fromAccount.name}`,
        amount: Math.abs(transferAmount),
        is_pending: false,
        source_type: 'manual',
        notes: detail,
      })

      setAmount('')
      setNote('')
      setSuccess(`Transferred ${formatCurrency(transferAmount)} from ${fromAccount.name} to ${toAccount.name}.`)
    } catch (transferError) {
      console.error('Transfer failed', transferError)
      setError('Transfer failed. Try again in a few seconds.')
    }
  }

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Loading transfer flow...</p>
        </SectionCard>
      </PageShell>
    )
  }

  if (transferableAccounts.length < 2) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <EmptyStateCard
          title="Transfer unavailable"
          description="You need at least two active non-debt accounts to run internal transfers."
          actionLabel="Back to accounts"
          onAction={() => navigate('/accounts')}
        />
      </PageShell>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={addTransaction.isPending} />}>
      <SummaryCard
        eyebrow="Transfer Flow"
        eyebrowIcon={<ArrowRightLeft size={12} strokeWidth={2.2} />}
        status={addTransaction.isPending ? 'Processing' : 'Ready'}
        value={formatCurrency(transferableTotal)}
        metrics={[
          { label: 'Available transfer accounts', value: transferableAccounts.length },
          { label: 'Source account', value: fromAccount?.name || 'Not selected' },
          { label: 'Destination account', value: toAccount?.name || 'Not selected' },
        ]}
        footer="Transfers create paired ledger events for full traceability"
      />

      <SectionCard>
        <SectionHeader
          title="Transfer Setup"
          subtitle="Choose source, destination, and amount"
          right={<MetadataChip label="Internal" tone="teal" />}
        />

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">From</p>
            <select
              value={fromAccountId}
              onChange={(event) => setFromAccountId(event.target.value)}
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[13px] text-white outline-none"
            >
              {transferableAccounts.map(account => (
                <option key={account.id} value={account.id} className="text-black">
                  {account.name} ({formatCurrency(account.balance, account.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">To</p>
            <select
              value={toAccountId}
              onChange={(event) => setToAccountId(event.target.value)}
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[13px] text-white outline-none"
            >
              {transferableAccounts
                .filter(account => account.id !== fromAccountId)
                .map(account => (
                  <option key={account.id} value={account.id} className="text-black">
                    {account.name} ({formatCurrency(account.balance, account.currency)})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">Amount</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[13px] text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/52">Reference (optional)</p>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Savings allocation"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[13px] text-white outline-none"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-2xl border border-[#d67a7a]/28 bg-[#d67a7a]/10 px-3 py-2 text-[12px] text-[#e2a6a6]">{error}</p>
        ) : null}

        {success ? (
          <p className="mt-3 rounded-2xl border border-[#74d4a3]/26 bg-[#74d4a3]/10 px-3 py-2 text-[12px] text-[#9ddfbe]">{success}</p>
        ) : null}

        <button
          type="button"
          disabled={addTransaction.isPending}
          onClick={handleTransfer}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/12 px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9ddbe0] transition-colors hover:bg-[#0B8289]/18 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SendHorizontal size={16} />
          {addTransaction.isPending ? 'Processing transfer' : 'Execute transfer'}
        </button>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Recent Transfer Events" subtitle={`${transferHistory.length} rows`} />
        {transferHistory.length === 0 ? (
          <EmptyStateCard
            title="No transfer events yet"
            description="Executed transfers will appear here as paired transactions."
          />
        ) : (
          <div className="divide-y divide-white/[0.055]">
            {transferHistory.map(transaction => (
              <PremiumListRow
                key={transaction.id}
                title={transaction.merchant_raw}
                subtitle={format(new Date(transaction.date), 'dd MMM yyyy')}
                amount={formatCurrency(transaction.amount, transaction.currency)}
                tone={Number(transaction.amount) > 0 ? 'income' : 'expense'}
                leading={
                  Number(transaction.amount) > 0
                    ? <CheckCircle2 size={15} className="text-[#9ddfbe]" />
                    : <ArrowRightLeft size={15} className="text-white/62" />
                }
              />
            ))}
          </div>
        )}
      </SectionCard>

      <button
        type="button"
        onClick={() => navigate('/accounts')}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/76 transition-colors hover:bg-white/[0.06]"
      >
        <ArrowLeft size={16} />
        Back to accounts
      </button>

      <div className="h-6" />
    </PageShell>
  )
}
