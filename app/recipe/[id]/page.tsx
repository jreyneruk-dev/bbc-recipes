'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const DISH_COLOURS: Record<string, string> = {
  'Main course':          'bg-indigo-100 text-indigo-700',
  'Light meals & snacks': 'bg-amber-100 text-amber-700',
  'Cakes and baking':     'bg-pink-100 text-pink-700',
  'Side dishes':          'bg-green-100 text-green-700',
  'Starters & nibbles':   'bg-orange-100 text-orange-700',
  'Desserts':             'bg-purple-100 text-purple-700',
  'Brunch':               'bg-sky-100 text-sky-700',
  'Other':                'bg-slate-100 text-slate-600',
}

interface UserRecipe {
  id: string
  title: string
  chef: string
  dish_type: string
  image_url: string | null
  ingredients: string | null
  method: string | null
}

export default function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<UserRecipe | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.json())
      .then(({ recipe: r }) => {
        if (!r) { setNotFound(true); return }
        setRecipe(r)
      })
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-4xl mb-3">🍽</p>
          <p className="text-sm">Recipe not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-xs text-rose-500 hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Loading…</div>
  }

  const badgeClass = DISH_COLOURS[recipe.dish_type] ?? DISH_COLOURS['Other']
  const ingredients = recipe.ingredients?.split('\n').filter(Boolean) ?? []
  const method = recipe.method?.split('\n').filter(Boolean) ?? []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold text-slate-800 truncate">{recipe.title}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {recipe.image_url && (
          <div className="relative w-full rounded-2xl overflow-hidden shadow-sm" style={{ paddingTop: '56.25%' }}>
            <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" unoptimized />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              {recipe.dish_type}
            </span>
            <span className="text-[11px] text-rose-400 italic">My recipe</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">{recipe.title}</h2>
          {recipe.chef && <p className="text-sm text-slate-500 mt-1">{recipe.chef}</p>}
        </div>

        {ingredients.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Ingredients</h3>
            <ul className="space-y-1.5">
              {ingredients.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-slate-300 shrink-0">–</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {method.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Method</h3>
            <ol className="space-y-4">
              {method.map((step, i) => {
                const text = step.replace(/^\d+\.\s*/, '')
                return (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{text}</span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </main>
    </div>
  )
}
