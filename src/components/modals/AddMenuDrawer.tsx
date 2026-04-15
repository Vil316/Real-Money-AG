import { BottomSheet } from '../ui/bottom-sheet'
import { Wallet, CreditCard, Target, FileText } from 'lucide-react'

interface AddMenuProps {
  isOpen: boolean
  onClose: () => void
  onSelectAction: (action: string) => void
}

export function AddMenuDrawer({ isOpen, onClose, onSelectAction }: AddMenuProps) {
  const actions = [
    { id: 'account', label: 'Add Account', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'bill', label: 'Recurring Bill', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'debt', label: 'Log Debt/Loan', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'goal', label: 'Savings Goal', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Create Entry">
      <div className="grid grid-cols-2 gap-3 mt-4">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <button 
              key={act.id} 
              onClick={() => { 
                onClose(); 
                // Slight delay allows the menu drawer to visibly close before firing the secondary form
                setTimeout(() => onSelectAction(act.id), 250);
              }}
              className="p-6 bg-foreground/5 border border-border rounded-3xl flex flex-col items-center gap-4 hover:bg-foreground/10 active:scale-95 transition-all text-center"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${act.bg} ${act.color} shadow-sm`}>
                <Icon size={24} strokeWidth={2.5}/>
              </div>
              <span className="font-bold text-[13px] text-foreground tracking-tight leading-tight">{act.label}</span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
