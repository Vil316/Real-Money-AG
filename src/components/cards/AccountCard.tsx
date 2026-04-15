import type { Account } from '@/types'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'

export function AccountCard({ account }: { account: Account }) {
  const navigate = useNavigate()
  
  return (
    <div 
      onClick={() => navigate(`/accounts/${account.id}`)}
      className="bg-card rounded-[18px] p-5 flex flex-col justify-between h-40 border border-border cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] transition-all relative overflow-hidden"
    >
      {/* Decorative gradient flare specific to the card colour */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none opacity-20" 
        style={{ backgroundColor: account.colour || '#10b981' }}
      />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-xl shadow-inner border border-border">
          {account.type === 'bank' ? '🏦' : account.type === 'credit_card' ? '💳' : account.type === 'savings' ? '💰' : '📋'}
        </div>
        <div className="text-right">
          <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-widest block">{account.type.replace('_', ' ')}</span>
          {(account.type === 'bank' || account.type === 'credit_card') && (
            <span className="text-[10px] text-foreground/30 font-medium font-mono tracking-wider">** {account.id.substring(account.id.length - 4, account.id.length).padStart(4, '0')}</span>
          )}
        </div>
      </div>
      <div className="relative z-10 mt-6">
        <p className="text-foreground/60 font-medium text-sm mb-1">{account.name}</p>
        <p className="text-2xl font-semibold -tracking-[0.5px] text-foreground">{formatCurrency(account.balance, account.currency)}</p>
      </div>
    </div>
  )
}
