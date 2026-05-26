// SSLVault Design System v6 — Warm Cream / Forest Green / Sienna
// Single source of truth — import this everywhere

export const F    = "'Space Grotesk','DM Sans',system-ui,sans-serif"
export const MONO = "'Space Mono','JetBrains Mono','Menlo',monospace"

export const C = {
  // Page backgrounds
  page:     '#F5F0E8',   // warm cream — main bg
  surface:  '#FFFDF8',   // warm white — cards, panels
  alt:      '#EDE8DC',   // deeper cream — section alt, sidebar items
  dark:     '#1C2B1F',   // deep forest — hero, sidebar, topbar, footer
  dark2:    '#243528',   // forest surface — sidebar hover, dark cards

  // Borders
  line:     '#D8D0C0',   // default border on cream
  line2:    '#C4BAA8',   // stronger border
  lineDk:   'rgba(245,240,232,0.08)',  // border on dark bg

  // Text — cream bg
  ink:      '#1C2B1F',   // headings
  body:     '#4A5E4E',   // body text
  faint:    '#8A9E8E',   // muted / placeholders

  // Text — dark bg
  dkText:   'rgba(245,240,232,0.88)',
  dkBody:   'rgba(245,240,232,0.45)',
  dkFaint:  'rgba(245,240,232,0.28)',

  // Primary — forest green
  green:    '#2D6A4F',
  greenLt:  '#52B788',
  greenBg:  '#D8F3DC',
  greenBd:  '#95D5B2',

  // Accent — burnt sienna
  sienna:   '#C1440E',
  siennaBg: '#FDECD8',
  siennaBd: '#F4A96A',

  // Status
  amber:    '#B5652A',
  amberBg:  '#FDF0DC',
  amberBd:  '#E8B87A',

  red:      '#C0392B',
  redBg:    '#FCE8E6',
  redBd:    '#EFA89E',
}

export const FONT_LINK = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"

export const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
  ::selection { background:#D8F3DC; color:#2D6A4F }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
  body { font-family: 'Space Grotesk','DM Sans',system-ui,sans-serif; background:${C.page}; color:${C.ink} }
  a { color: inherit; text-decoration: none }
  button { cursor:pointer; font-family:inherit }
  input, textarea, select { font-family:inherit }
  ::-webkit-scrollbar { width:5px; height:5px }
  ::-webkit-scrollbar-track { background:${C.alt} }
  ::-webkit-scrollbar-thumb { background:${C.line2}; border-radius:99px }
`
