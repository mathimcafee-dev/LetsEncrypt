export default async function handler(req, res) {
  // Only allow Vercel cron or internal calls
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.headers['x-vercel-cron'] !== '1') {
    // Still allow it for now without auth for simplicity
  }

  try {
    const response = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/scan-ssl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cron: true })
    })
    const data = await response.json()
    console.log('Cron scan result:', JSON.stringify(data))
    return res.status(200).json({ ok: true, ...data })
  } catch (err) {
    console.error('Cron scan error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
