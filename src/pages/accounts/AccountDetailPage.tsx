import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import { ArrowRightLeft, Bell, Plus, RefreshCw, Store, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { AddTransactionForm } from '@/components/modals/forms/AddTransactionForm'
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

function buildAccountSubtitle(type: string, isLinked: boolean | undefined) {
  const typeLabel = type === 'credit_card' ? 'Credit Card' : type.replace('_', ' ')
  return `${typeLabel} · ${isLinked ? 'Connected' : 'Manual'}`
}

export function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const { accounts, isLoading: accLoad } = useAccounts()
  const { transactions, isLoading: txLoad } = useTransactions(id)
  
  // React Query returns isLoading=false if the query is disabled (e.g. while useAuth is still fetching).
  // Check if we specifically haven't finished downloading accounts yet
  const account = accounts.find(a => a.id === id)

  if (accLoad || accounts.length === 0) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Loading account data...</p>
        </SectionCard>
      </PageShell>
    )
  }

  if (!account) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <EmptyStateCard
          title="Account not found"
          description="This account may have been archived or you no longer have access."
          actionLabel="Back to accounts"
          onAction={() => navigate('/accounts')}
        />
      </PageShell>
    )
  }

  const recentInflows = transactions.filter(transaction => Number(transaction.amount) > 0).slice(0, 5)
  const recentOutflows = transactions.filter(transaction => Number(transaction.amount) < 0).slice(0, 5)
  const accountTail = account.id.slice(-4).padStart(4, '0')
  const netMonthFlow = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0)

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={transactions.length > 0} />}>
      <SummaryCard
        eyebrow="Account Details"
        eyebrowIcon={<Wallet size={12} strokeWidth={2.2} />}
        status={account.is_linked ? 'Connected' : 'Manual'}
        value={formatCurrency(account.balance, account.currency)}
        metrics={[
          { label: 'Account type', value: buildAccountSubtitle(account.type, account.is_linked) },
          { label: 'Card / ledger tail', value: `•••• ${accountTail}` },
          { label: 'Net flow (visible)', value: formatCurrency(netMonthFlow, account.currency) },
        ]}
        footer={`${account.name} is actively tracked in your command ledger`}
      />

      <SectionCard>
        <SectionHeader
          title={account.name}
          subtitle="Action cluster"
          right={<MetadataChip label={buildAccountSubtitle(account.type, account.is_linked)} tone="neutral" />}
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-3 text-center text-[12px] font-semibold text-white/92 transition-colors hover:bg-white/[0.06]"
          >
            <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05]">
              <Plus size={14} />
            </span>
            Add Log
          </button>

          <button
            type="button"
            onClick={() => navigate(`/transfer?from=${account.id}`)}
            className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/10 px-2 py-3 text-center text-[12px] font-semibold text-[#a2e5ea] transition-colors hover:bg-[#0B8289]/15"
          >
            <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#0B8289]/26 bg-[#0B8289]/14">
              <ArrowRightLeft size={14} />
            </span>
            Transfer
          </button>

          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-2 py-3 text-center text-[12px] font-semibold text-white/92 transition-colors hover:bg-white/[0.06]"
          >
            <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05]">
              <Bell size={14} />
            </span>
            Alerts
          </button>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Ledger History"
          subtitle={txLoad ? 'Syncing transactions...' : `${transactions.length} entries available`}
          right={<MetadataChip label={txLoad ? 'Syncing' : 'Live'} tone={txLoad ? 'attention' : 'teal'} />}
        />

        {txLoad ? (
          <div className="py-8 text-center">
            <RefreshCw className="mx-auto animate-spin text-white/35" size={22} />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyStateCard
            title="No transactions yet"
            description="Start logging transactions to build a complete account history."
            actionLabel="Log transaction"
            onAction={() => setIsAddOpen(true)}
            className="border-white/[0.08]"
          />
        ) : (
          <div className="divide-y divide-white/[0.055]">
            {transactions.map((transaction) => {
              const amount = Number(transaction.amount)
              const title = transaction.merchant_clean || transaction.merchant_raw
              return (
                <PremiumListRow
                  key={transaction.id}
                  title={title}
                  subtitle={`${format(new Date(transaction.date), 'dd MMM yyyy')}${transaction.is_pending ? ' · Pending' : ''}`}
                  amount={`${amount > 0 ? '+' : ''}${formatCurrency(amount, account.currency)}`}
                  tone={amount > 0 ? 'income' : 'expense'}
                  leading={<Store size={15} className="text-white/65" />}
                />
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Flow Split" subtitle="Recent cash direction snapshots" />
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#74d4a3]/24 bg-[#74d4a3]/10 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#95dfba]">Inflows</p>
            <p className="mt-1 text-[20px] font-semibold text-white">{recentInflows.length}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Outflows</p>
            <p className="mt-1 text-[20px] font-semibold text-white">{recentOutflows.length}</p>
          </div>
        </div>
      </SectionCard>

      <div className="h-6" />
      <AddTransactionForm isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} accountId={account.id} />
    </PageShell>
  )
}
