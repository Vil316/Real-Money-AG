import { BottomSheet } from '../ui/bottom-sheet'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTheme } from '../theme-provider'
import { LogOut, Moon, Sun, Monitor, Settings2 } from 'lucide-react'
import {
  SheetIdentityChip,
  SheetPrimaryButton,
  SheetSection,
  SheetSegmentedSelector,
  type SheetSegmentOption,
} from './sheet-primitives'

export function ProfileDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const appearanceOptions: SheetSegmentOption[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun size={15} />,
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon size={15} />,
    },
    {
      value: 'system',
      label: 'Auto',
      icon: <Monitor size={15} />,
    },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onClose()
    // The ProtectedRoute will intrinsically catch the dead session and boot to /login
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Profile & Settings"
      contextLabel="System Profile"
      headerMeta="Preferences, theme, and session controls"
      headerIcon={<Settings2 size={16} strokeWidth={2.2} />}
    >
      <div className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Identity" meta="Authenticated session details">
          <div className="flex items-center gap-4 rounded-[20px] border border-white/[0.1] bg-white/[0.03] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white text-[#0b1114]">
              <span className="text-[17px] font-semibold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[0.01em] text-white">{user?.email || 'Authenticated User'}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.11em] text-white/46">ID {user?.id.substring(0, 8)}...</p>
            </div>
            <SheetIdentityChip label="Active" tone="neutral" className="ml-auto" />
          </div>
        </SheetSection>

        <SheetSection label="Appearance" meta="Choose how the interface is rendered">
          <SheetSegmentedSelector
            value={theme}
            onChange={(value) => setTheme(value as typeof theme)}
            options={appearanceOptions}
            columns={3}
            tone="neutral"
            optionClassName="py-2.5"
          />
        </SheetSection>

        <SheetPrimaryButton
          onClick={handleSignOut}
          tone="red"
          className="inline-flex gap-2 border-[#c66f6f]/40 bg-[#a45757] hover:bg-[#ae6161] shadow-[0_10px_20px_rgba(164,87,87,0.24)]"
        >
          <LogOut size={16} />
          Secure Sign Out
        </SheetPrimaryButton>
      </div>
    </BottomSheet>
  )
}
