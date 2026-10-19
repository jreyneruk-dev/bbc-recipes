import { type NextRequest } from 'next/server'

// Daily Vercel cron (see vercel.json). Supabase's free tier pauses a project after about a
// week with no activity, so this makes one real query through the REST API and answers 500
// if it fails, so the failure shows in Vercel's cron logs. The anon key is enough: RLS returns
// an empty list, which still counts as activity.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_recipes?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`REST ${res.status}`)

    return Response.json({ ok: true, at: new Date().toISOString() })
  } catch (e) {
    console.error('[keepalive] failed:', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}
