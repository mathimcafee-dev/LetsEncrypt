// BUILD_TIME: 1779289688
// BUILD_TIME: 1747300000
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Home from './pages/Home'
import CLMHome from './pages/CLMHome'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import SharedHostingGuide from './pages/SharedHostingGuide'
import KnowledgeBase from './pages/KnowledgeBase'
import GetStarted from './pages/GetStarted'
import Install from './pages/Install'
import Integrations from './pages/Integrations'
import Pricing from './pages/Pricing'
import KeyLocker from './pages/KeyLocker'
import BuyCertificate from './pages/BuyCertificate'
import AdminAnalytics from './pages/AdminAnalytics'
import AgentHealth from './pages/AgentHealth'
import CAIntelligenceHub from './pages/CAIntelligenceHub'
import CAConnectors from './pages/CAConnectors'
import BulkScanner from './pages/BulkScanner'
import PublicStatus from './pages/PublicStatus'

export default function App() {
  const _build = 1779289705 // cache bust
  const [page, setPage] = useState(window.location.pathname)
  const [user, setUser]   = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const handler = () => setPage(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const nav = (to) => {
    window.history.pushState({}, '', to)
    setPage(to)
    window.scrollTo(0, 0)
  }

  // Legacy ACME routes → redirect to /buy
  if (page === '/generate' || page === '/quick-setup') {
    nav('/buy')
    return null
  }

  // Home page has its own nav built-in — exclude it to avoid duplicate
  const showPublicNav = !authLoading && !user && page !== '/'

  return (
    <div>
      {showPublicNav && <Nav nav={nav} page={page} />}
      {page === '/' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} /> : <Home nav={nav} />)}
      {page === '/dashboard' && <Dashboard nav={nav} />}
      {page === '/integrations' && <Integrations nav={nav} />}
      {page === '/install' && <Install nav={nav} />}
      {page === '/knowledge-base' && <KnowledgeBase nav={nav} />}
      {page === '/get-started' && <GetStarted nav={nav} />}
      {page === '/shared-hosting-guide' && <SharedHostingGuide nav={nav} />}
      {page === '/auth' && <Auth nav={nav} />}
      
      
      
      
      
      {page === '/pricing' && <Pricing nav={nav} />}
      {page === '/keylocker' && <KeyLocker nav={nav} />}
      {page === '/buy' && <BuyCertificate nav={nav} />}
      
      {page === '/admin' && <AdminAnalytics nav={nav} />}
      {page === '/agent-health' && <AgentHealth nav={nav} />}
      {page === '/cert-intelligence' && <CAIntelligenceHub nav={nav} />}
      {page === '/ca-intelligence' && <CAIntelligenceHub nav={nav} />}
      {page === '/ca-connectors' && <CAConnectors nav={nav} />}
      {page === '/scan' && <BulkScanner nav={nav} />}
      {(page === '/status' || page.startsWith('/status/')) && <PublicStatus nav={nav} />}
    </div>
  )
}
