import { useState, useEffect, useRef } from 'react'
import {
  Shield, Plus, Globe, Server,
  FileText, Layout, Download, Settings,
  BookOpen, CreditCard, Info, User, Mail, LogOut
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import CertInventory from './CertInventory'
import ServersPage from './Servers'
import AboutInner from './AboutInner'
import ContactInner from './ContactInner'
import DeveloperInner from './DeveloperInner'
import SettingsPage from './SettingsPage'
import DnsProviders from './DnsProviders'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import Pricing from './Pricing'

export default function CLMHome({ user, nav }) {
  const [section, setSection] = useState('dashboard')
  const [animKey, setAnimKey] = useState(0)

  const navigate = (id) => {
    if (id === section) return
    setSection(id)
    setAnimKey(k => k + 1)
  }
  const email = user?.email || ''

  const NAV_MAIN = [
    { id:'dashboard', label:'Dashboard', icon:Layout },
    { id:'issue', label:'Issue Certificate', icon:Plus },
  ]

  const NAV_MANAGE = [
    { id:'dns', label:'DNS Providers', icon:Globe },
    { id:'servers', label:'Servers', icon:Server },
  ]

  const NAV_RESOURCES = [
    { id:'install', label:'Installation', icon:Download },
    { id:'kb', label:'Docs & Help', icon:BookOpen },
  ]

  const NAV_MORE = [
    { id:'pricing', label:'Pricing', icon:CreditCard },
    { id:'about', label:'About', icon:Info },
    { id:'developer', label:'Developer', icon:User },
    { id:'contact', label:'Contact', icon:Mail },
    { id:'settings', label:'Settings', icon:Settings },
  ]

  const SECTION_TITLES = {
    dashboard:'Dashboard', issue:'Issue Certificate',
    dns:'DNS Providers', servers:'Servers',
    install:'Installation', kb:'Docs & Help', pricing:'Pricing',
    about:'About', developer:'Developer', contact:'Contact', settings:'Settings',
  }

  const NavItem = ({ id, label, icon:Icon }) => {
    const isActive = section === id
    return (
      <button
        onClick={() => navigate(id)}
        style={{
          display:'flex', alignItems:'center', gap:10, padding:'8px 16px',
          cursor:'pointer', fontSize:12, fontWeight: isActive ? 600 : 500,
          color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
          background: isActive ? 'rgba(14,127,192,0.35)' : 'transparent',
          borderLeft: isActive ? '3px solid #00a3e0' : '3px solid transparent',
          border:'none', width:'100%', textAlign:'left', fontFamily:'inherit',
          transition:'all 0.18s cubic-bezier(0.4,0,0.2,1)',
          borderRadius:'0 6px 6px 0',
          transform: isActive ? 'translateX(0)' : 'translateX(0)',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'white' }}}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}}
      >
        <Icon size={14} strokeWidth={isActive ? 2 : 1.8} style={{ flexShrink:0, transition:'all 0.18s' }}/>
        {label}
      </button>
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const renderContent = () => {
    if (section === 'dashboard') return <CertInventory user={user} nav={nav} onIssue={() => navigate('issue')}/>
    if (section === 'issue') return <BuyCertificate nav={nav} embedded={true} onDashboard={() => navigate('dashboard')} onIssueAnother={() => navigate('issue')}/>
    if (section === 'dns') return <DnsProviders nav={nav}/>
    if (section === 'install') return <Install nav={nav}/>
    if (section === 'kb') return <KnowledgeBase nav={nav}/>
    if (section === 'about') return <AboutInner nav={nav}/>
    if (section === 'contact') return <ContactInner nav={nav}/>
    if (section === 'developer') return <DeveloperInner nav={nav}/>
    if (section === 'pricing') return <Pricing nav={nav}/>
    if (section === 'servers') return <ServersPage user={user}/>
    if (section === 'settings') return <SettingsPage user={user}/>
    return null
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'calc(100vh - 0px)', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* SLIM TOP BAR */}
      <div style={{ background:'#0d3c6e', height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'#0e7fc0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={13} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>SSLVault</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginLeft:2 }}>CLM PLATFORM</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{email}</span>
          <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:11, fontFamily:'inherit', padding:0 }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:'flex', flex:1, background: ['issue'].includes(section) ? '#050a14' : '#f0f4f8' }}>
        {/* SIDEBAR */}
        <nav style={{ width:210, background:'#0d3c6e', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:44, height:'calc(100vh - 44px)', overflowY:'auto',
          boxShadow:'4px 0 24px rgba(0,0,0,0.18), 1px 0 0 rgba(255,255,255,0.06)' }}>
          {[
            { label:'Main',      items: NAV_MAIN },
            { label:'Manage',    items: NAV_MANAGE },
            { label:'Resources', items: NAV_RESOURCES },
            { label:'More',      items: NAV_MORE },
          ].map(({ label, items }, i) => (
            <div key={label} style={{ padding:'8px 0 2px', borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.1)' : 'none', marginTop: i > 0 ? 4 : 0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'0.6px', textTransform:'uppercase', padding:'6px 16px 4px' }}>{label}</div>
              {items.map(item => <NavItem key={item.id} {...item}/>)}
            </div>
          ))}

          <div style={{ marginTop:'auto', padding:'12px 16px', borderTop:'0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>Signed in as</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          {!['issue','dashboard','dns'].includes(section) && (
            <div style={{ background:'white', borderBottom:'1px solid #e8edf2', padding:'0 28px', height:48, display:'flex', alignItems:'center', flexShrink:0, position:'sticky', top:44, zIndex:30 }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#1a2332', letterSpacing:'-0.3px' }}>{SECTION_TITLES[section]}</div>
            </div>
          )}
          <div key={animKey} style={{ flex:1, overflowY:'auto', overflowX:'hidden', animation:'clm-fadein 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
            {renderContent()}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes clm-fadein {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
