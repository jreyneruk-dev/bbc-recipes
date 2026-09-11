import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) return Response.json({ error: 'No ids' }, { status: 400 })

  const { error } = await supabase
    .from('user_recipes')
    .update({ archived_at: new Date().toISOString() })
    .in('id', ids)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
