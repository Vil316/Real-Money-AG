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

const signupSchema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupForm = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setError(null)
    
    // 1. Sign up user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // If confirmation required, user might not have an active session yet depending on supabase settings.
    // Assuming implicit consent for development.
    const userId = authData.user?.id
    
    if (userId) {
      // 2. Create profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: data.displayName,
          onboarding_complete: false,
        })
        
      if (profileError && profileError.code !== '23505') { // Ignore unique violation if trigger already created it
        console.warn('Profile creation issue:', profileError)
      }
      
      // Redirect to onboarding
      navigate('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-950">
      <GlassCard className="w-full max-w-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-semibold -tracking-[0.3px] text-white">Join RealMoney</h1>
          <p className="text-glass-secondary text-sm">Take control of your finances.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white/80">Display Name</Label>
            <Input 
              id="displayName" 
              {...register('displayName')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
            {errors.displayName && <p className="text-negative text-xs">{errors.displayName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input 
              id="email" 
              type="email" 
              {...register('email')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
            {errors.email && <p className="text-negative text-xs">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Input 
              id="password" 
              type="password" 
              {...register('password')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
            {errors.password && <p className="text-negative text-xs">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white/80">Confirm Password</Label>
            <Input 
              id="confirmPassword" 
              type="password" 
              {...register('confirmPassword')}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
            />
            {errors.confirmPassword && <p className="text-negative text-xs">{errors.confirmPassword.message}</p>}
          </div>

          {error && <p className="text-negative text-sm text-center">{error}</p>}

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full active:scale-95 transition-transform duration-150 bg-white/10 hover:bg-white/20 text-white border border-white/20 h-12 rounded-xl backdrop-blur-sm"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </GlassCard>

      <div className="mt-8 text-center">
        <p className="text-glass-secondary text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:text-white/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
