import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      setError(signInError.message)
    } else {
      navigate('/today')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <GlassCard className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-semibold -tracking-[0.3px] text-white">RealMoney</h1>
          <p className="text-glass-secondary text-sm">Your money. Your rules.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input 
              id="email" 
              type="email" 
              {...register('email')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input 
              id="password" 
              type="password" 
              {...register('password')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>

          {error && <p className="text-negative text-sm text-center">{error}</p>}

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full active:scale-95 transition-transform duration-150 bg-white/10 hover:bg-white/20 text-white border border-white/20 h-12 rounded-xl backdrop-blur-sm"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </GlassCard>

      <div className="mt-8 text-center">
        <p className="text-glass-secondary text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-white hover:text-white/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
