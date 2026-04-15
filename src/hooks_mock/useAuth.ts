import { useEffect, useState } from 'react'

export function useAuth() {
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mocking an immediate active session
    setTimeout(() => {
      setSession({ user: { id: 'mock-user-123' } })
      setLoading(false)
    }, 200)
  }, [])

  return { session, user: session?.user ?? null, loading }
}
