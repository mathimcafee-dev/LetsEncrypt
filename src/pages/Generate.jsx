// Generate.jsx - redirects to /buy (ACME/LetsEncrypt removed, GGS is used now)
function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function Generate({ nav }) {
  const isMobile = useIsMobile()
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/buy')
  }
  if (nav) nav('/buy')
  return null
}
