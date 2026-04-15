import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow'
import { TodayPage } from './pages/today/TodayPage'
import { CheckInPage } from './pages/today/CheckInPage'
import { AccountsPage } from './pages/accounts/AccountsPage'
import { AccountDetailPage } from './pages/accounts/AccountDetailPage'
import { MoneyPage } from './pages/money/MoneyPage'
import { SavingsPage } from './pages/savings/SavingsPage'
import { DebtsPage } from './pages/debts/DebtsPage'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ThemeProvider } from './components/theme-provider'

const queryClient = new QueryClient()

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="realmoney-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingFlow />} />
              <Route path="/checkin" element={<CheckInPage />} />
              
              {/* Routes inside the shell */}
              <Route element={<AppShell />}>
                <Route path="/today" element={<TodayPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/accounts/:id" element={<AccountDetailPage />} />
                <Route path="/money" element={<MoneyPage />} />
                <Route path="/savings" element={<SavingsPage />} />
                <Route path="/debts" element={<DebtsPage />} />
                <Route path="/" element={<Navigate to="/today" replace />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
