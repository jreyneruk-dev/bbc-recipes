import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ plan: null })

  const { searchParams } = new URL(req.url)
  const week = searchParams.get('week')
  if (!week) return NextResponse.json({ error: 'week param required' }, { status: 400 })

  const { data } = await supabase
    .from('meal_plans')
    .select('plan')
    .eq('user_id', user.id)
    .eq('week_start', week)
    .single()

  return NextResponse.json({ plan: data?.plan ?? null })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { week_start, plan } = await req.json()
  await supabase.from('meal_plans').upsert(
    { user_id: user.id, week_start, plan, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,week_start' }
  )
  return NextResponse.json({ ok: true })
}
