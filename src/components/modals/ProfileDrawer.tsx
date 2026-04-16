import { BottomSheet } from '../ui/bottom-sheet'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTheme } from '../theme-provider'
import { LogOut, Moon, Sun, Monitor, Settings2 } from 'lucide-react'
import { SheetPrimaryButton, SheetSection, SheetSelectorButton } from './sheet-primitives'

export function ProfileDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

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
      headerMeta={user?.email || 'Authenticated user'}
      headerIcon={<Settings2 size={16} strokeWidth={2.2} />}
    >
      <div className="mt-2 space-y-4 pb-1">
        <SheetSection label="Identity" meta="Authenticated session details">
          <div className="flex items-center gap-4 rounded-[20px] border border-white/[0.1] bg-white/[0.03] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white text-[#0b1114]">
              <span className="text-[17px] font-semibold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[0.01em] text-white">{user?.email || 'Authenticated User'}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.11em] text-white/46">ID {user?.id.substring(0, 8)}...</p>
            </div>
          </div>
        </SheetSection>

        <SheetSection label="Appearance" meta="Choose how the interface is rendered">
          <div className="grid grid-cols-3 gap-2">
            <SheetSelectorButton
              onClick={() => setTheme('light')} 
              selected={theme === 'light'}
              tone="neutral"
              className="flex flex-col items-center gap-2 py-3"
            >
              <Sun size={17} />
              <span className="text-[11px] font-semibold tracking-[0.02em]">Light</span>
            </SheetSelectorButton>
            <SheetSelectorButton
              onClick={() => setTheme('dark')} 
              selected={theme === 'dark'}
              tone="neutral"
              className="flex flex-col items-center gap-2 py-3"
            >
              <Moon size={17} />
              <span className="text-[11px] font-semibold tracking-[0.02em]">Dark</span>
            </SheetSelectorButton>
            <SheetSelectorButton
              onClick={() => setTheme('system')} 
              selected={theme === 'system'}
              tone="neutral"
              className="flex flex-col items-center gap-2 py-3"
            >
              <Monitor size={17} />
              <span className="text-[11px] font-semibold tracking-[0.02em]">Auto</span>
            </SheetSelectorButton>
          </div>
        </SheetSection>

        <SheetPrimaryButton onClick={handleSignOut} tone="red" className="inline-flex gap-2">
          <LogOut size={16} />
          Secure Sign Out
        </SheetPrimaryButton>
      </div>
    </BottomSheet>
  )
}
