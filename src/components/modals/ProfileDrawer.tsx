import { BottomSheet } from '../ui/bottom-sheet'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useTheme } from '../theme-provider'
import { LogOut, Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '../ui/button'

export function ProfileDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onClose()
    // The ProtectedRoute will intrinsically catch the dead session and boot to /login
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Profile & Settings">
      <div className="space-y-6 mt-4">
        <div className="bg-foreground/5 p-4 rounded-3xl flex items-center gap-4 border border-border">
          <div className="w-14 h-14 bg-foreground rounded-full flex items-center justify-center text-background">
            <span className="text-xl font-bold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div>
            <p className="font-semibold text-foreground tracking-tight">{user?.email || 'Authenticated User'}</p>
            <p className="text-xs text-foreground/50 tracking-wider font-mono mt-0.5">ID: {user?.id.substring(0, 8)}...</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-3 px-1">Appearance</h4>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-colors ${theme === 'light' ? 'bg-foreground border border-foreground text-background shadow-md' : 'bg-foreground/5 border border-transparent text-foreground hover:bg-foreground/10'}`}
            >
              <Sun size={20} /> <span className="text-xs font-bold tracking-wide">Light</span>
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-colors ${theme === 'dark' ? 'bg-foreground border border-foreground text-background shadow-md' : 'bg-foreground/5 border border-transparent text-foreground hover:bg-foreground/10'}`}
            >
              <Moon size={20} /> <span className="text-xs font-bold tracking-wide">Dark</span>
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-colors ${theme === 'system' ? 'bg-foreground border border-foreground text-background shadow-md' : 'bg-foreground/5 border border-transparent text-foreground hover:bg-foreground/10'}`}
            >
              <Monitor size={20} /> <span className="text-xs font-bold tracking-wide">Auto</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSignOut} variant="destructive" className="w-full flex gap-2 h-14 rounded-2xl font-bold shadow-sm">
            <LogOut size={18} /> Secure Sign Out
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
