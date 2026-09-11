import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ recipe: null })

  const { data } = await supabase
    .from('user_recipes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return Response.json({ recipe: data ?? null })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipe } = await req.json()
  const { data, error } = await supabase
    .from('user_recipes')
    .update({
      title: recipe.title,
      chef: recipe.chef,
      dish_type: recipe.dish_type,
      source_url: recipe.source_url,
      image_url: recipe.image_url,
      ingredients: recipe.ingredients,
      method: recipe.method,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ recipe: data })
}
