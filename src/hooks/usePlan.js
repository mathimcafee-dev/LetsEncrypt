import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── usePlan ───────────────────────────────────────────────────────────
// Returns the current user's plan from the profiles table.
// Free users: plan = 'free' (or null row)
// Pro users:  plan = 'pro'
// Team users: plan = 'team'
//
// SAFE TO CALL ON ANY PAGE — returns { plan:'free', loading, refresh }
// if no profile row exists yet (new user, or free tier).
// Never throws. Never breaks existing pages.

export function usePlan(user) {
  const [plan, setPlan]       = useState('free')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  const fetchPlan = async () => {
    if (!user) { setPlan('free'); setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at, stripe_customer_id, stripe_subscription_id, seats_total, seats_used')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      // Check expiry — if past, treat as free
      const expired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
      setPlan(expired ? 'free' : (data.plan || 'free'))
      setProfile(data)
    } else {
      // No profile row = free tier
      setPlan('free')
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPlan() }, [user?.id])

  return {
    plan,
    profile,
    loading,
    isPro:  plan === 'pro'  || plan === 'team',
    isTeam: plan === 'team',
    isFree: plan === 'free',
    refresh: fetchPlan,
  }
}
