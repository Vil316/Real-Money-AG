import { BottomSheet } from '../ui/bottom-sheet'
import { Wallet, CreditCard, Target, FileText, Sparkles } from 'lucide-react'
import { SheetCommandTile, type SheetAccentTone } from './sheet-primitives'

interface AddMenuProps {
  isOpen: boolean
  onClose: () => void
  onSelectAction: (action: string) => void
}

export function AddMenuDrawer({ isOpen, onClose, onSelectAction }: AddMenuProps) {
  const actions = [
    { id: 'account', label: 'Add Account', icon: Wallet, tone: 'neutral' as SheetAccentTone, description: 'Manual ledger' },
    { id: 'bill', label: 'Recurring Bill', icon: FileText, tone: 'purple' as SheetAccentTone, description: 'Scheduled outflow' },
    { id: 'debt', label: 'Log Debt/Loan', icon: CreditCard, tone: 'red' as SheetAccentTone, description: 'Liability entry' },
    { id: 'goal', label: 'Savings Goal', icon: Target, tone: 'green' as SheetAccentTone, description: 'Goal runway' },
  ]

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Create Entry"
      contextLabel="Command Menu"
      headerMeta="Choose what to create in your financial operating system"
      headerIcon={<Sparkles size={16} strokeWidth={2.2} />}
    >
      <div className="mt-1.5 grid grid-cols-2 gap-3.5 pb-1">
        {actions.map((act) => {
          return (
            <SheetCommandTile
              key={act.id} 
              icon={act.icon}
              label={act.label}
              description={act.description}
              tone={act.tone}
              className="p-[18px]"
              onClick={() => {
                onClose(); 
                // Slight delay allows the menu drawer to visibly close before firing the secondary form
                setTimeout(() => onSelectAction(act.id), 250);
              }}
            />
          )
        })}
      </div>
    </BottomSheet>
  )
}
