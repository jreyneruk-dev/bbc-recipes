import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const buffer = Buffer.from(imageBase64, 'base64')
  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, buffer, { contentType: mimeType, upsert: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path)

  return Response.json({ url: publicUrl })
}
