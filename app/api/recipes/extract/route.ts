import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

const DISH_TYPES = ['Main course', 'Starters & nibbles', 'Light meals & snacks', 'Cakes and baking', 'Desserts', 'Side dishes', 'Brunch', 'Other']

const EXTRACT_PROMPT = `Extract the recipe from the content and return ONLY valid JSON (no markdown, no code fences):
{"title":"","chef":"","dishType":"","imageUrl":"","ingredients":"","method":""}

Rules:
- dishType must be exactly one of: ${DISH_TYPES.join(', ')}
- ingredients: full list as a single string, newline-separated
- method: numbered steps as a single string, newline-separated
- chef: recipe author or site name; empty string if unknown
- imageUrl: full URL to the main recipe image; empty string if none found`

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
}

function extractOgImage(html: string): string {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  return match?.[1] ?? ''
}

export async function POST(req: Request) {
  const body = await req.json()

  let prompt: string
  let imagePart: { inlineData: { data: string; mimeType: string } } | null = null
  let ogImage = ''

  if (body.url) {
    let html = ''
    try {
      const res = await fetch(body.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; recipe-extractor/1.0)' },
        signal: AbortSignal.timeout(10000),
      })
      html = await res.text()
    } catch {
      return Response.json({ error: 'Failed to fetch URL' }, { status: 400 })
    }
    ogImage = extractOgImage(html)
    const text = stripHtml(html)
    prompt = `${EXTRACT_PROMPT}\n\nPage content:\n${text}\n\nNote: the og:image URL is "${ogImage}" — use it as imageUrl if it looks like a recipe photo.`
  } else if (body.imageBase64 && body.mimeType) {
    imagePart = { inlineData: { data: body.imageBase64, mimeType: body.mimeType } }
    prompt = `${EXTRACT_PROMPT}\n\nThis is a photo of a recipe. Extract all details visible in the image. imageUrl should be empty string.`
  } else {
    return Response.json({ error: 'Provide url or imageBase64+mimeType' }, { status: 400 })
  }

  try {
    const parts = imagePart ? [imagePart, prompt] : [prompt]
    const result = await model.generateContent(parts as Parameters<typeof model.generateContent>[0])
    const text = result.response.text().trim()
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(clean)
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
