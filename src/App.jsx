// BUILD_TIME: 1778249639942
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Home from './pages/Home'
import Generate from './pages/Generate'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Auth from './pages/Auth'
import SharedHostingGuide from './pages/SharedHostingGuide'
import KnowledgeBase from './pages/KnowledgeBase'
import GetStarted from './pages/GetStarted'
import Install from './pages/Install'
import DnsProviders from './pages/DnsProviders'

export default function App() {
  const [page, setPage] = useState(window.location.pathname)
  useEffect(() => {
    const handler = () => setPage(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  const nav = (to) => { window.history.pushState({}, '', to); setPage(to) }
  return (
    <div>
      <Nav nav={nav} page={page} />
      {page === '/' && <Home nav={nav} />}
      {page === '/generate' && <Generate nav={nav} />}
      {page === '/quick-setup' && <Generate nav={nav} />}
      {page === '/dashboard' && <Dashboard nav={nav} />}
      {page === '/monitor' && <Monitor nav={nav} />}
      {page === '/dns-providers' && <DnsProviders nav={nav} />}
      {page === '/install' && <Install nav={nav} />}
      {page === '/knowledge-base' && <KnowledgeBase nav={nav} />}
      {page === '/get-started' && <GetStarted nav={nav} />}
      {page === '/shared-hosting-guide' && <SharedHostingGuide nav={nav} />}
      {page === '/auth' && <Auth nav={nav} />}
    </div>
  )
}
