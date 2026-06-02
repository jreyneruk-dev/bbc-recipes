import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ favourites: [] })

  const { data } = await supabase
    .from('recipe_favourites')
    .select('recipe_id')
    .eq('user_id', user.id)

  return NextResponse.json({ favourites: data?.map(r => r.recipe_id) ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { recipeId } = await req.json()
  await supabase.from('recipe_favourites').upsert({ user_id: user.id, recipe_id: recipeId })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { recipeId } = await req.json()
  await supabase.from('recipe_favourites').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
  return NextResponse.json({ ok: true })
}
