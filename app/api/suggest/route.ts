import { GoogleGenerativeAI } from '@google/generative-ai'
import recipesData from '@/data/recipes.json'

interface Recipe { id: string; title: string; dishType: string }
const recipes = recipesData as Recipe[]

const STARTER_TYPES = ['Starters & nibbles', 'Light meals & snacks']
const MAIN_TYPES = ['Main course']
const SNACK_TYPES = ['Light meals & snacks', 'Cakes and baking']

const starters = recipes.filter(r => STARTER_TYPES.includes(r.dishType))
const mains = recipes.filter(r => MAIN_TYPES.includes(r.dishType))
const snacks = recipes.filter(r => SNACK_TYPES.includes(r.dishType))

const recipeList = JSON.stringify(
  recipes.map(r => ({ id: r.id, title: r.title, dishType: r.dishType }))
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

export async function POST(req: Request) {
  const { protein, effort, time, exclude_ids = [] } = await req.json()

  const validIds = new Set(recipes.map(r => r.id))
  const excludeSet = new Set<string>(exclude_ids)

  const availableStarters = starters.filter(r => !excludeSet.has(r.id))
  const availableMains = mains.filter(r => !excludeSet.has(r.id))
  const availableSnacks = snacks.filter(r => !excludeSet.has(r.id))

  const prompt = `You are a dinner planner. You have these recipes available:
${recipeList}

Starter ids (dishType Starters & nibbles or Light meals & snacks): ${JSON.stringify(availableStarters.map(r => r.id))}
Main ids (dishType Main course): ${JSON.stringify(availableMains.map(r => r.id))}
Snack ids (dishType Light meals & snacks or Cakes and baking): ${JSON.stringify(availableSnacks.map(r => r.id))}

Suggest a dinner for two tonight. Preferences: protein=${protein}, effort=${effort}, time=${time} minutes.
Pick one starter, one main, optionally one snack. Only use ids from the lists above. Vary your choices.

Reply with ONLY valid JSON (no markdown, no code fences):
{"starter_id":"<id>","main_id":"<id>","snack_id":"<id or null>","reason":"<1-2 sentences why>"}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  let parsed: { starter_id: string; main_id: string; snack_id: string | null; reason: string }
  try {
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(clean)
  } catch {
    return Response.json({ error: 'Parse error', raw: text }, { status: 500 })
  }

  if (!validIds.has(parsed.starter_id) || !validIds.has(parsed.main_id)) {
    return Response.json({ error: 'Invalid recipe IDs returned', raw: parsed }, { status: 500 })
  }
  if (parsed.snack_id && !validIds.has(parsed.snack_id)) {
    parsed.snack_id = null
  }

  return Response.json(parsed)
}
