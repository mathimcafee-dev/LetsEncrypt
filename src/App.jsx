// BUILD_TIME: 1747000000
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Home from './pages/Home'
import CLMHome from './pages/CLMHome'
import Import from './pages/Import'
import Dashboard from './pages/Dashboard'
import Auth from './pages/Auth'
import SharedHostingGuide from './pages/SharedHostingGuide'
import KnowledgeBase from './pages/KnowledgeBase'
import GetStarted from './pages/GetStarted'
import Install from './pages/Install'
import DnsProviders from './pages/DnsProviders'
import About from './pages/About'
import Contact from './pages/Contact'
import Developer from './pages/Developer'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Pricing from './pages/Pricing'
import KeyLocker from './pages/KeyLocker'
import BuyCertificate from './pages/BuyCertificate'
// Multi-tenant portals — additive only, no existing pages modified
import PortalHome from './pages/PortalHome'
import ResellerHome from './pages/ResellerHome'
import AdminHome from './pages/AdminHome'
import Register from './pages/Register'
import PendingApproval from './pages/PendingApproval'

export default function App() {
  const [page, setPage] = useState(window.location.pathname)
  const [user, setUser]   = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [account, setAccount] = useState(null)
  const [impersonation, setImpersonation] = useState(null)

  useEffect(() => {
    const handler = () => setPage(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (session?.user) loadAccount(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadAccount(session.user)
      else { setAccount(null); setImpersonation(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load account role from accounts table and route accordingly
  async function loadAccount(u) {
    try {
      const { data, error } = await supabase.functions.invoke('account-manage', {
        body: { action: 'get_my_account' }
      })
      if (!error && data?.account) {
        const acct = data.account
        setAccount(acct)

        // Check for active impersonation session in sessionStorage
        const imp = sessionStorage.getItem('impersonation')
        if (imp) {
          try { setImpersonation(JSON.parse(imp)) } catch {}
        }

        // Route non-admin roles away from '/' (which renders CLMHome)
        const currentPage = window.location.pathname
        if (currentPage === '/') {
          if (acct.status === 'pending') { nav('/pending'); return }
          if (acct.role === 'sub_reseller') { nav('/reseller'); return }
          if (acct.role === 'end_customer') { nav('/portal'); return }
          // master_admin stays on '/' (CLMHome)
        }
      }
    } catch {}
  }

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

  // Multi-tenant portal routes — accessible to logged-in users only
  const portalRoutes = ['/portal', '/reseller', '/admin']
  const registerRoute = '/register'

  // Routes that remain accessible to logged-in users (auth flow + legal pages + portals)
  const publicAllowedWhenLoggedIn = ['/auth', '/privacy', '/terms', '/pending', ...portalRoutes]

  // If a logged-in user lands on any subroute that isn't allowed, bounce to '/' so they enter CLMHome
  if (!authLoading && user && page !== '/' && !publicAllowedWhenLoggedIn.includes(page)) {
    nav('/')
    return null
  }

  // Guard portal routes — must be logged in
  if (!authLoading && !user && portalRoutes.includes(page)) {
    nav('/auth')
    return null
  }

  // /register is public — logged-in users get bounced to their dashboard
  if (!authLoading && user && page === '/register') {
    nav('/')
    return null
  }

  // Pending sub-resellers see a waiting screen at /
  // Public Nav only renders for logged-out visitors.
  // Logged-in users get the CLMHome shell (which has its own top bar) on '/'.
  const showPublicNav = !authLoading && !user

  return (
    <div>
      {showPublicNav && <Nav nav={nav} page={page} />}
      {page === '/' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} /> : <Home nav={nav} />)}
      {page === '/import' && <Import nav={nav} />}
      {page === '/dashboard' && <Dashboard nav={nav} />}
      {page === '/dns-providers' && <DnsProviders nav={nav} />}
      {page === '/install' && <Install nav={nav} />}
      {page === '/knowledge-base' && <KnowledgeBase nav={nav} />}
      {page === '/get-started' && <GetStarted nav={nav} />}
      {page === '/shared-hosting-guide' && <SharedHostingGuide nav={nav} />}
      {page === '/auth' && <Auth nav={nav} />}
      {page === '/about' && <About nav={nav} />}
      {page === '/contact' && <Contact nav={nav} />}
      {page === '/developer' && <Developer nav={nav} />}
      {page === '/privacy' && <Privacy nav={nav} />}
      {page === '/terms' && <Terms nav={nav} />}
      {page === '/pricing' && <Pricing nav={nav} />}
      {page === '/keylocker' && <KeyLocker nav={nav} />}
      {page === '/buy' && <BuyCertificate nav={nav} />}
      {/* Multi-tenant portals */}
      {page === '/pending' && <PendingApproval nav={nav} />}
      {page === '/register' && <Register nav={nav} />}
      {page === '/portal' && user && <PortalHome user={user} nav={nav} account={impersonation?.target || account} impersonatedBy={impersonation?.admin} />}
      {page === '/reseller' && user && (account?.role === 'sub_reseller' || account?.role === 'master_admin') && <ResellerHome user={user} nav={nav} account={impersonation?.target || account} impersonatedBy={impersonation?.admin} />}
      {page === '/admin' && user && account?.role === 'master_admin' && <AdminHome user={user} nav={nav} account={account} />}
    </div>
  )
}
