import { useState } from 'react'
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
import Import from './Import'
import DnsProviders from './DnsProviders'
import Install from './Install'
import KnowledgeBase from './KnowledgeBase'
import BuyCertificate from './BuyCertificate'
import Pricing from './Pricing'

export default function CLMHome({ user, nav }) {
  const [section, setSection] = useState('dashboard')
  const email = user?.email || ''

  const NAV_MAIN = [
    { id:'dashboard', label:'Dashboard', icon:Layout },
    { id:'issue', label:'Issue Certificate', icon:Plus },
    { id:'import', label:'Import Certificate', icon:FileText },
    { id:'dns', label:'DNS Providers', icon:Globe },
    { id:'servers', label:'Servers', icon:Server },
    { id:'install', label:'Install Guide', icon:Download },
    { id:'kb', label:'Knowledge Base', icon:BookOpen },
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
    import:'Import Certificate', dns:'DNS Providers', servers:'Servers',
    install:'Install Guide', kb:'Knowledge Base', pricing:'Pricing',
    about:'About', developer:'Developer', contact:'Contact', settings:'Settings',
  }

  const NavItem = ({ id, label, icon:Icon }) => (
    <button style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:500, color: section===id ? 'white' : 'rgba(255,255,255,0.55)', background: section===id ? 'rgba(0,180,138,0.15)' : 'none', borderLeft: section===id ? '3px solid #00b48a' : '3px solid transparent', border:'none', width:'100%', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s' }} onClick={() => setSection(id)}>
      <Icon size={14} strokeWidth={1.8}/>{label}
    </button>
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const renderContent = () => {
    if (section === 'dashboard') return <CertInventory user={user} nav={nav}/>
    if (section === 'issue') return <BuyCertificate nav={nav}/>
    if (section === 'import') return <Import nav={nav}/>
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
      <div style={{ background:'#1c2d3e', height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, borderRadius:6, background:'linear-gradient(135deg,#00b48a,#007a5e)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Shield size={13} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>SSLVault</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginLeft:2 }}>CLM PLATFORM</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{email}</span>
          <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.45)', fontSize:11, fontFamily:'inherit', padding:0 }}>
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:'flex', flex:1, background:'#f4f6f9' }}>
        {/* SIDEBAR */}
        <nav style={{ width:210, background:'#1c2d3e', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:44, height:'calc(100vh - 44px)', overflowY:'auto' }}>
          <button style={{ margin:'12px 10px 8px', background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'9px 12px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }} onClick={() => setSection('issue')}>
            <Plus size={12}/> Request a Certificate
          </button>

          <div style={{ padding:'8px 0 4px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.8px', textTransform:'uppercase', padding:'4px 16px 6px' }}>Main</div>
            {NAV_MAIN.map(item => <NavItem key={item.id} {...item}/>)}
          </div>

          <div style={{ padding:'8px 0 4px', borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.8px', textTransform:'uppercase', padding:'4px 16px 6px' }}>More</div>
            {NAV_MORE.map(item => <NavItem key={item.id} {...item}/>)}
          </div>

          <div style={{ marginTop:'auto', padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginBottom:2 }}>Signed in as</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.55)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          <div style={{ background:'white', borderBottom:'1px solid #e8edf2', padding:'0 28px', height:48, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'sticky', top:44, zIndex:30 }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#1a2332', letterSpacing:'-0.3px' }}>{SECTION_TITLES[section]}</div>
            <div style={{ display:'flex', gap:10 }}>
              <button style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#00b48a', color:'white', border:'none', borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }} onClick={() => setSection('issue')}>
                <Plus size={13}/> Issue Certificate
              </button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
