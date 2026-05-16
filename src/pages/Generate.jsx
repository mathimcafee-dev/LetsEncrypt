// Generate.jsx - redirects to /buy (ACME/LetsEncrypt removed, GGS is used now)
export default function Generate({ nav }) {
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/buy')
  }
  if (nav) nav('/buy')
  return null
}
