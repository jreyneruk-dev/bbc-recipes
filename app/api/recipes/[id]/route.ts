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
