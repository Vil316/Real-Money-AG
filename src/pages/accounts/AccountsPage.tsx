import { useAccounts } from '@/hooks/useAccounts'
import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export function AccountsPage() {
  const { accounts, isLoading } = useAccounts()
  const navigate = useNavigate()

  const nonDebtAccounts = accounts.filter(a => a.type !== 'loan' && a.type !== 'informal_debt')
  const totalBalance = nonDebtAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  const grouped = accounts.reduce((acc, account) => {
    let group = 'other'
    if (account.type === 'bank' || account.type === 'credit_card' || account.type === 'bnpl') group = 'cards'
    else if (account.type === 'savings') group = 'pots'
    else group = 'debts'

    if (!acc[group]) acc[group] = []
    acc[group].push(account)
    return acc
  }, {} as Record<string, typeof accounts>)

  if (isLoading) {
    return <div className="text-foreground p-8 text-center text-sm font-medium">Syncing accounts...</div>
  }

  const renderStack = (title: string, items: typeof accounts) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-14 px-2">
        <h3 className="text-foreground font-semibold text-[17px] px-3 mb-4">{title}</h3>
        <div className="flex flex-col relative w-full">
          {items.map((account, index) => {
            const isBottom = index === items.length - 1;
            return (
              <div 
                key={account.id}
                onClick={() => navigate(`/accounts/${account.id}`)}
                className="rounded-[24px] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] relative cursor-pointer active:scale-[0.99] transition-transform overflow-hidden bg-card border border-border"
                style={{
                  zIndex: index + 1,
                  marginTop: index === 0 ? 0 : '-100px',
                  height: isBottom ? '170px' : '160px' 
                }}
              >
                <div className="pt-5 px-6 pb-5 flex flex-col justify-between h-full relative z-10 w-full">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-[18px] font-bold tracking-tight">{account.name}</span>
                      {account.type !== 'bank' && (
                        <span className="text-[9px] bg-foreground/5 text-foreground/60 font-bold uppercase tracking-widest py-0.5 px-2 rounded-sm border border-border/50">
                          {account.type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[20px] font-semibold text-foreground tracking-tight">
                        {formatCurrency(account.balance, account.currency)}
                      </span>
                    </div>
                  </div>

                  {isBottom && account.id && (
                    <div className="absolute bottom-5 left-6 right-6 flex justify-between items-center z-10 opacity-40">
                      <div className="flex flex-col">
                         <span className="text-[12px] font-mono font-bold tracking-widest text-foreground">
                           **** **** {account.id.substring(account.id.length - 4, account.id.length).padStart(4, '0')}
                         </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-6 pb-2 shrink-0 flex justify-between items-center">
        <h1 className="text-2xl font-display font-semibold -tracking-[0.5px] text-foreground">Ledger</h1>
        <button className="w-9 h-9 bg-foreground text-background rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
      
      <div className="px-5 mb-8 mt-4 shrink-0">
        <p className="text-[12px] text-foreground/50 font-semibold uppercase tracking-wider mb-1">Total Liquid Assets</p>
        <p className="text-[44px] font-display font-semibold leading-none -tracking-[1.5px] text-foreground">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        {renderStack('Active Accounts', grouped['cards'])}
        {renderStack('Savings Pots', grouped['pots'])}
        {renderStack('Loans & Debts', grouped['debts'])}

        {accounts.length === 0 && (
          <div className="text-foreground/50 text-center py-12 px-8">
            <p className="font-semibold text-foreground mb-1">No accounts yet</p>
            <p className="text-sm">Link your bank accounts or add a manual ledger to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
