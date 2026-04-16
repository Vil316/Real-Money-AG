import { useState, useCallback } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useAuth } from '@/hooks/useAuth'
import { ArrowRightLeft, Link2, RefreshCw, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { LinkBankCard } from '@/components/cards/LinkBankCard'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
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

function formatAccountTypeLabel(type: string) {
  if (type === 'credit_card') return 'Credit Card'
  if (type === 'informal_debt') return 'Informal Debt'
  if (type === 'bnpl') return 'BNPL'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function AccountsPage() {
  const { accounts, isLoading } = useAccounts()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (!user || isSyncing) return
    setIsSyncing(true)
    try {
      await supabase.functions.invoke('plaid-manual-refresh', {
        body: { user_id: user.id }
      })
      queryClient.invalidateQueries({ queryKey: ['accounts', user.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] })
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setIsSyncing(false)
    }
  }, [user, isSyncing, queryClient])

  const nonDebtAccounts = accounts.filter(a => a.type !== 'loan' && a.type !== 'informal_debt')
  const totalBalance = nonDebtAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  const linkedCount = accounts.filter(account => account.is_linked || account.provider).length
  const manualCount = Math.max(accounts.length - linkedCount, 0)

  const grouped = accounts.reduce((acc, account) => {
    let group = 'other'
    if (account.type === 'bank' || account.type === 'cash' || account.type === 'credit_card' || account.type === 'bnpl') group = 'cards'
    else if (account.type === 'savings') group = 'pots'
    else group = 'debts'

    if (!acc[group]) acc[group] = []
    acc[group].push(account)
    return acc
  }, {} as Record<string, typeof accounts>)

  if (isLoading) {
    return (
      <PageShell topSlot={<FloatingTopControls />}>
        <SectionCard>
          <p className="py-8 text-center text-sm font-medium text-white/60">Syncing accounts...</p>
        </SectionCard>
      </PageShell>
    )
  }

  const renderStack = (title: string, items: typeof accounts, tone: 'teal' | 'success' | 'attention' = 'teal') => {
    if (!items || items.length === 0) return null;

    return (
      <SectionCard>
        <SectionHeader
          title={title}
          right={<MetadataChip label={`${items.length} item${items.length === 1 ? '' : 's'}`} tone={tone} />}
        />

        <div className="divide-y divide-white/[0.055]">
          {items.map((account) => (
            <PremiumListRow
              key={account.id}
              onClick={() => navigate(`/accounts/${account.id}`)}
              title={account.name}
              subtitle={`${formatAccountTypeLabel(account.type)} · ${account.is_linked ? 'Connected' : 'Manual'}`}
              amount={formatCurrency(account.balance, account.currency)}
              tone={Number(account.balance) >= 0 ? 'neutral' : 'attention'}
            />
          ))}
        </div>
      </SectionCard>
    )
  }

  return (
    <PageShell topSlot={<FloatingTopControls hasLivePulse={isSyncing} />}>
      <SummaryCard
        eyebrow="Ledger Overview"
        eyebrowIcon={<Wallet size={12} strokeWidth={2.2} />}
        status={isSyncing ? 'Syncing' : 'Healthy'}
        value={formatCurrency(totalBalance)}
        metrics={[
          { label: 'Connected accounts', value: linkedCount },
          { label: 'Manual ledgers', value: manualCount },
          { label: 'Total accounts', value: accounts.length },
        ]}
        footer="Your account network is organized and ready for action"
      />

      <SectionCard>
        <SectionHeader title="Control Center" subtitle="Fast account operations" />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isSyncing}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-left text-[13px] font-semibold text-white/92 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05]">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </span>
            <p>{isSyncing ? 'Sync in progress' : 'Sync Accounts'}</p>
            <p className="mt-1 text-[11px] font-medium text-white/45">Pull latest balances and transactions</p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/transfer')}
            className="rounded-2xl border border-[#0B8289]/24 bg-[#0B8289]/10 px-3 py-3 text-left text-[13px] font-semibold text-[#a2e5ea] transition-colors hover:bg-[#0B8289]/15"
          >
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#0B8289]/26 bg-[#0B8289]/14">
              <ArrowRightLeft size={14} />
            </span>
            <p>Transfer Flow</p>
            <p className="mt-1 text-[11px] font-medium text-[#9ddbe0]/75">Move cash between internal accounts</p>
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-left text-[13px] font-semibold text-white/92 transition-colors hover:bg-white/[0.06]"
        >
          <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05]">
            <Link2 size={14} />
          </span>
          <p>Action Center</p>
          <p className="mt-1 text-[11px] font-medium text-white/45">View alerts and open commitments</p>
        </button>
      </SectionCard>

      {renderStack('Active Accounts', grouped['cards'], 'teal')}
      {renderStack('Savings Pots', grouped['pots'], 'success')}
      {renderStack('Loans & Debts', grouped['debts'], 'attention')}

      {accounts.length === 0 ? (
        <EmptyStateCard
          title="No accounts yet"
          description="Link your bank accounts or add a manual ledger to get started."
          actionLabel="Open Add Menu"
          onAction={() => navigate('/today')}
        />
      ) : null}

      <SectionCard>
        <SectionHeader title="Bank Connection" subtitle="Keep linked balances synchronized" />
        <LinkBankCard />
      </SectionCard>

      <div className="h-6" />
    </PageShell>
  )
}
