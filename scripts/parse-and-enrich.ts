import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const EXCEL_PATH = '/Users/john/Library/CloudStorage/OneDrive-Personal/5 Mum/AutoMate/BBC Food Favourites.xlsx'
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'recipes.json')
const DELAY_MS = 150

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
  url: string
  image: string | null
}

function slugFromUrl(url: string): string {
  const match = url.match(/\/recipes\/([^/]+)$/)
  return match ? match[1] : url.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)

  // Load existing data for idempotency
  let existing: Recipe[] = []
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
  }
  const existingMap = new Map(existing.map(r => [r.id, r]))

  const recipes: Recipe[] = []
  let fetched = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const url = (row['Link'] || '').trim()
    const title = (row['Recipe'] || '').trim()
    const chef = (row['Chef Name'] || '').trim()
    const dishType = (row['Dish Type'] || '').trim()

    if (!url || !title) continue

    const id = slugFromUrl(url)
    const cached = existingMap.get(id)

    if (cached?.image !== undefined) {
      recipes.push(cached)
      skipped++
      process.stdout.write(`\r[${i + 1}/${rows.length}] Skipped (cached): ${title.slice(0, 50)}`)
      continue
    }

    process.stdout.write(`\r[${i + 1}/${rows.length}] Fetching: ${title.slice(0, 50)}`)
    const image = await fetchOgImage(url)
    recipes.push({ id, title, chef, dishType, url, image })
    fetched++

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(recipes, null, 2))

  console.log(`\n\nDone. ${recipes.length} recipes. ${fetched} fetched, ${skipped} from cache.`)
  const withImages = recipes.filter(r => r.image).length
  console.log(`Images found: ${withImages}/${recipes.length}`)
}

main().catch(console.error)
