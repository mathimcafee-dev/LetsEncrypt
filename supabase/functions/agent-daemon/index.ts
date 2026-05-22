import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

function adminDb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function getUser(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  const { data: { user } } = await createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY') || '',
    { global: { headers: { Authorization: auth } } }
  ).auth.getUser()
  return user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const user = await getUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action, agent_id, user_id } = body
    const uid = user_id || user.id
    const db = adminDb()

    if (action === 'list_agents') {
      const { data, error } = await db.from('persistent_agents')
        .select('id, hostname, ip_address, status, last_seen_at, created_at, version, user_id')
        .eq('user_id', uid).order('last_seen_at', { ascending: false })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, agents: data || [] })
    }

    if (action === 'list_jobs') {
      if (!agent_id) return json({ error: 'agent_id required' }, 400)
      const { data, error } = await db.from('agent_jobs')
        .select('id, job_type, status, domain, created_at, completed_at, error_message')
        .eq('agent_id', agent_id).eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(50)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, jobs: data || [] })
    }

    if (action === 'agent_health_events') {
      if (!agent_id) return json({ error: 'agent_id required' }, 400)
      const { data, error } = await db.from('agent_health_events')
        .select('id, event_type, message, created_at')
        .eq('agent_id', agent_id).eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(body.limit || 20)
      if (error) {
        // table may not exist yet — return empty
        return json({ ok: true, events: [] })
      }
      return json({ ok: true, events: data || [] })
    }

    if (action === 'deregister') {
      if (!agent_id) return json({ error: 'agent_id required' }, 400)
      const { error } = await db.from('persistent_agents')
        .update({ status: 'offline', deregistered_at: new Date().toISOString() })
        .eq('id', agent_id).eq('user_id', uid)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'dispatch_job') {
      // Queue a job for a specific agent (install cert, renew, etc.)
      const { job_type, domain, cert_id, payload } = body
      if (!agent_id || !job_type) return json({ error: 'agent_id and job_type required' }, 400)
      const { data, error } = await db.from('agent_jobs').insert({
        agent_id, user_id: uid, job_type, domain: domain || null,
        cert_id: cert_id || null, status: 'queued',
        payload: payload || null, created_at: new Date().toISOString(),
      }).select().single()
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, job: data })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})
