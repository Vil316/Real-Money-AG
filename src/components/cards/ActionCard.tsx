import { useState } from 'react'
import type { ActionItem } from '@/types'
import { CheckCircle2, AlertCircle, Clock, Check, PartyPopper } from 'lucide-react'

export function ActionCard({ item, onAction }: { item: ActionItem, onAction?: () => void }) {
  if (item.type === 'all_good') {
    return (
      <div className="p-4 flex gap-4 items-center">
        <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center shrink-0">
          <PartyPopper size={20} className="text-foreground" />
        </div>
        <div>
          <h4 className="text-foreground font-medium text-sm">{item.title}</h4>
          <p className="text-foreground/50 text-xs mt-0.5">{item.description}</p>
        </div>
      </div>
    )
  }

  if (item.type === 'payday') {
    return (
      <div 
        onClick={onAction}
        className="p-4 flex gap-4 items-center cursor-pointer hover:bg-foreground/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#30D158]/10 flex items-center justify-center shrink-0">
          <span className="text-[18px]">💷</span>
        </div>
        <div className="flex-1">
          <h4 className="text-foreground font-medium text-sm">{item.title}</h4>
          <p className="text-foreground/50 text-xs mt-0.5">{item.description} · Tap to log</p>
        </div>
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-foreground/5">
          <Check size={14} className="text-foreground/60" />
        </div>
      </div>
    )
  }

  const isPaid = item.type === 'bill_due' || item.type === 'bnpl_due' || item.type === 'overdue'
  const [showReasoning, setShowReasoning] = useState(false)

  return (
    <div className="flex flex-col border-b border-border/50 last:border-0 hover:bg-foreground/5 transition-colors">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => item.reasoning_json && setShowReasoning(!showReasoning)}
      >
        <div className="flex gap-4 items-center flex-1">
          <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 ${
            item.priority === 'high' ? 'bg-[#FF453A]/10' : 
            item.priority === 'medium' ? 'bg-[#FF9F0A]/10' : 
            'bg-[#30D158]/10'
          }`}>
            {item.priority === 'high' ? <AlertCircle size={20} className="text-[#FF453A]" /> : 
             item.priority === 'medium' ? <Clock size={20} className="text-[#FF9F0A]" /> : 
             <CheckCircle2 size={20} className="text-[#30D158]" />}
          </div>
          <div>
            <h4 className="text-foreground font-medium text-sm">{item.title}</h4>
            <p className="text-foreground/50 text-xs mt-0.5 max-w-[200px] truncate">{item.description}</p>
          </div>
        </div>
        
        {(item.canMarkPaid || item.canMarkDone) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAction?.(); }}
            className="ml-2 flex items-center justify-center px-4 py-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all active:scale-95 shrink-0"
          >
            <span className="text-[12px] font-semibold">
              {isPaid ? 'Pay' : 'Done'}
            </span>
          </button>
        )}
      </div>

      {showReasoning && item.reasoning_json && (
        <div className="px-14 pb-4">
          <div className="bg-card border border-border/50 rounded-xl p-3 text-xs font-medium text-foreground/70">
            <p className="mb-1 text-foreground font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" /> OS Intelligence Match
            </p>
            <div className="grid grid-cols-2 gap-y-1 mt-2">
              <span>Confidence:</span> <span className="text-right text-foreground">{(item.reasoning_json.confidence * 100).toFixed(0)}%</span>
              <span>Matched Pattern:</span> <span className="text-right text-foreground">{item.reasoning_json.merchant}</span>
            </div>
            <p className="mt-2 pt-2 border-t border-border/50 text-[11px] leading-relaxed opacity-80">
              {item.reasoning_json.ai_reason}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
