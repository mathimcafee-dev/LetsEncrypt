import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'
import Home from './pages/Home'
import Generate from './pages/Generate'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Auth from './pages/Auth'

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
      {page === '/generate' && <Generate />}
      {page === '/dashboard' && <Dashboard nav={nav} />}
  {page === '/monitor' && <Monitor />}
      {page === '/auth' && <Auth nav={nav} />}
    </div>
  )
}
// cache bust Wed May  6 18:08:37 UTC 2026
// deploy Wed May  6 19:22:54 UTC 2026
// redeploy Thu May  7 02:29:06 UTC 2026
