import { createServerSupabaseClient } from '@/lib/supabase-server'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ recipes: [] })

  const { data } = await supabase
    .from('user_recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return Response.json({ recipes: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe } = await req.json()
  const id = `${slugify(recipe.title)}_u${Date.now()}`

  const { data, error } = await supabase
    .from('user_recipes')
    .insert({ ...recipe, id, user_id: user.id })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ recipe: data })
}
