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
import About from './pages/About'
import CertVault from './pages/CertVault'
import CertBind from './pages/CertBind'
import KeyIntelligence from './pages/KeyIntelligence'
import BuyCertificate from './pages/BuyCertificate'
import AdminAnalytics from './pages/AdminAnalytics'
import AgentHealth from './pages/AgentHealth'
import CAIntelligenceHub from './pages/CAIntelligenceHub'
import CAConnectors from './pages/CAConnectors'
import CATrustExplorer from './pages/CATrustExplorer'
import CABForumNewsroom from './pages/CABForumNewsroom'
import GlobalPKIHub from './pages/GlobalPKIHub'
import ETSIIntelligence from './pages/ETSIIntelligence'
import NISTIntelligence from './pages/NISTIntelligence'
import IETFIntelligence from './pages/IETFIntelligence'
import APKICIntelligence from './pages/APKICIntelligence'
import eIDASIntelligence from './pages/eIDASIntelligence'
import PKIConsortiumIntelligence from './pages/PKIConsortiumIntelligence'
import CSCIntelligence from './pages/CSCIntelligence'
import BulkScanner from './pages/BulkScanner'
import PublicStatus from './pages/PublicStatus'
import CAAChecker from './pages/CAAChecker'
import KeyLocker from './pages/KeyLocker'
import ServersPage from './pages/Servers'
import SettingsPage from './pages/SettingsPage'
import RenewalCalendar from './pages/RenewalCalendar'
import SSLHealthScore from './pages/SSLHealthScore'
import ReadinessDashboard from './pages/ReadinessDashboard'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import DnsProviders from './pages/DnsProviders'
import Contact from './pages/Contact'
import DigiCertIntelligence from './pages/DigiCertIntelligence'
import SectigoIntelligence from './pages/SectigoIntelligence'
import CertIntelligence from './pages/CertIntelligence'
import CTAbuseMonitor from './pages/CTAbuseMonitor'
import CertInventory from './pages/CertInventory'
import Infrastructure from './pages/Infrastructure'
import CertChangelog from './pages/CertChangelog'
import DomainManager from './pages/DomainManager'
import Vault from './pages/Vault'
import AlertSettings from './pages/AlertSettings'
import AlertHistory from './pages/AlertHistory'


export default function App() {
  const _build_ts = 1779297560 // 
const _build = 1779297041 // cache bust
  const [page, setPage] = useState(window.location.pathname)
  const [user, setUser]   = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    const handler = () => setPage(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // Add/remove 'mobile' class on <html> for CSS targeting
  useEffect(() => {
    const update = () => {
      document.documentElement.classList.toggle('is-mobile', window.innerWidth <= 768)
      document.documentElement.classList.toggle('is-tablet', window.innerWidth > 768 && window.innerWidth <= 1024)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      // If logged in and on /dashboard standalone, redirect to CLM shell
      if (session?.user && window.location.pathname === '/dashboard') {
        window.history.replaceState({}, '', '/')
        setPage('/')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // After login from /auth, go to CLM home
      if (session?.user && window.location.pathname === '/auth') {
        window.history.pushState({}, '', '/')
        setPage('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const nav = (to) => {
    if (to === page) return
    setTransitioning(true)
    setTimeout(() => {
      window.history.pushState({}, '', to)
      setPage(to)
      window.scrollTo({ top: 0, behavior: 'instant' })
      setTransitioning(false)
    }, 160)
  }

  // Legacy ACME routes → redirect to /buy
  if (page === '/generate' || page === '/quick-setup') {
    nav('/buy')
    return null
  }

  // Home page has its own nav built-in — exclude it to avoid duplicate
  const SELF_NAV_PAGES = ['/', '/knowledge-base', '/install', '/about', '/pricing', '/contact', '/privacy', '/terms', '/certbind', '/dns-providers', '/settings', '/keylocker', '/servers', '/renewal-calendar', '/ssl-health-score', '/readiness', '/domain-manager', '/issue-cert', '/cert-timeline', '/compliance-centre', '/security-monitor', '/posture', '/sla-dashboard']
  const showPublicNav = !authLoading && !user && !SELF_NAV_PAGES.includes(page)

  return (
    <div style={{
      opacity: transitioning ? 0 : 1,
      transform: transitioning ? 'translateY(4px)' : 'translateY(0)',
      transition: transitioning
        ? 'opacity 0.12s ease-in, transform 0.12s ease-in'
        : 'opacity 0.18s ease-out, transform 0.18s ease-out',
      minHeight: '100vh',
      background: '#f0f4fa',
      color: '#111111',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
    }}>
      {showPublicNav && <Nav nav={nav} page={page} />}
      {page === '/' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="dashboard" /> : <Home nav={nav} />)}
      {page === '/issue-cert' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="issue" /> : <Auth nav={nav} />)}
      {page === '/cert-timeline' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="cert-timeline" /> : <Auth nav={nav} />)}
      {page === '/compliance-centre' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="compliance-centre" /> : <Auth nav={nav} />)}
      {page === '/security-monitor' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="shield" /> : <Auth nav={nav} />)}
      {page === '/posture' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="posture" /> : <Auth nav={nav} />)}
      {page === '/sla-dashboard' && (authLoading ? null : user ? <CLMHome user={user} nav={nav} initialSection="sla-dashboard" /> : <Auth nav={nav} />)}
      {page === '/dashboard' && <Dashboard nav={nav} />}
      {page === '/integrations' && <Integrations nav={nav} />}
      {page === '/install' && <Install nav={nav} />}
      {page === '/knowledge-base' && <KnowledgeBase nav={nav} />}
      {page === '/get-started' && <GetStarted nav={nav} />}
      {page === '/shared-hosting-guide' && <SharedHostingGuide nav={nav} />}
      {page === '/auth' && <Auth nav={nav} />}
      
      
      
      
      
      {page === '/pricing' && <Pricing nav={nav} />}
      {page === '/about' && <About nav={nav} />}
      {page === '/certvault' && <KeyIntelligence nav={nav} />}
      {page === '/certbind' && <KeyIntelligence nav={nav} />}
      {page === '/key-intelligence' && <KeyIntelligence nav={nav} />}
      {page === '/buy' && <BuyCertificate nav={nav} />}
      
      {page === '/admin' && <AdminAnalytics nav={nav} />}
      {page === '/agent-health' && <AgentHealth nav={nav} />}
      {page === '/cert-intelligence' && <CAIntelligenceHub nav={nav} />}
      {page === '/ca-intelligence' && <CAIntelligenceHub nav={nav} />}
      {page === '/ca-connectors' && <CAConnectors nav={nav} />}
      {page === '/scan' && <BulkScanner nav={nav} />}
      {(page === '/status' || page.startsWith('/status/')) && <PublicStatus nav={nav} />}
      {page === '/caa-check' && <CAAChecker nav={nav} />}
      {page === '/ca-trust-explorer' && <CATrustExplorer nav={nav} />}
      {page === '/cab-forum' && <CABForumNewsroom nav={nav} />}
      {page === '/pki-hub' && <GlobalPKIHub nav={nav} />}
      {page === '/pki-hub/etsi' && <ETSIIntelligence nav={nav} />}
      {page === '/pki-hub/nist' && <NISTIntelligence nav={nav} />}
      {page === '/pki-hub/ietf' && <IETFIntelligence nav={nav} />}
      {page === '/pki-hub/apkic' && <APKICIntelligence nav={nav} />}
      {page === '/pki-hub/eidas' && <eIDASIntelligence nav={nav} />}
      {page === '/pki-hub/pkic' && <PKIConsortiumIntelligence nav={nav} />}
      {page === '/pki-hub/csc' && <CSCIntelligence nav={nav} />}
      {page === '/keylocker' && <KeyLocker nav={nav} />}
      {page === '/servers' && <ServersPage nav={nav} user={user} />}
      {page === '/settings' && <SettingsPage nav={nav} user={user} />}
      {page === '/renewal-calendar' && <RenewalCalendar nav={nav} user={user} />}
      {page === '/ssl-health-score' && <SSLHealthScore nav={nav} user={user} />}
      {page === '/readiness' && <ReadinessDashboard nav={nav} user={user} />}
      {page === '/dns-providers' && <DnsProviders nav={nav} />}
      {page === '/privacy' && <Privacy nav={nav} />}
      {page === '/terms' && <Terms nav={nav} />}
      {page === '/contact' && <Contact nav={nav} />}
      {page === '/digicert-intelligence' && <DigiCertIntelligence nav={nav} />}
      {page === '/sectigo-intelligence' && <SectigoIntelligence nav={nav} />}
      {page === '/cert-intelligence-hub' && <CertIntelligence nav={nav} />}
      {page === '/ct-monitor' && <CTAbuseMonitor user={user} />}
      {page === '/cert-inventory' && <CertInventory nav={nav} user={user} />}
      {page === '/infrastructure' && <Infrastructure user={user} />}
      {page === '/cert-changelog' && <CertChangelog user={user} />}
      {page === '/domain-manager' && <DomainManager user={user} nav={nav} />}
      {page === '/vault' && <Vault nav={nav} />}
      {page === '/alert-settings' && <AlertSettings nav={nav} />}
      {page === '/alerts' && <AlertHistory nav={nav} />}
    </div>
  )
}
