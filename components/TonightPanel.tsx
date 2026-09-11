'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Sparkles, ExternalLink, RefreshCw } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
  url: string
  image: string | null
}

interface Props {
  recipes: Recipe[]
}

type Pref<T extends string> = { label: string; value: T }

const PROTEIN: Pref<string>[] = [
  { label: 'Meat', value: 'meat' },
  { label: 'Fish', value: 'fish' },
  { label: 'Veggie', value: 'veg' },
  { label: 'Anything', value: 'anything' },
]
const EFFORT: Pref<string>[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Go for it', value: 'adventurous' },
]
const TIME: Pref<string>[] = [
  { label: '~30 min', value: '30' },
  { label: '~1 hour', value: '60' },
  { label: 'No rush', value: 'any' },
]

function Chips<T extends string>({ options, value, onChange }: { options: Pref<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value as T)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            value === o.value
              ? 'bg-rose-500 border-rose-500 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SuggestionCard({ label, recipe }: { label: string; recipe: Recipe }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="relative w-full aspect-[16/9] bg-slate-100">
        {recipe.image ? (
          <Image src={recipe.image} alt={recipe.title} fill sizes="400px" className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🍽</div>
        )}
        <span className="absolute top-2 left-2 text-xs font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">{label}</span>
      </div>
      <div className="p-3">
        <p className="font-semibold text-slate-800 text-sm leading-snug">{recipe.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{recipe.chef}</p>
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium"
        >
          View recipe <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

export function TonightPanel({ recipes }: Props) {
  const [protein, setProtein] = useState('anything')
  const [effort, setEffort] = useState('medium')
  const [time, setTime] = useState('any')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ starter_id: string; main_id: string; snack_id: string | null; reason: string } | null>(null)
  const [error, setError] = useState('')

  const recipeMap = new Map(recipes.map(r => [r.id, r]))

  async function suggest() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protein, effort, time }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError('Could not get a suggestion — try again')
    } finally {
      setLoading(false)
    }
  }

  const starter = result ? recipeMap.get(result.starter_id) : null
  const main = result ? recipeMap.get(result.main_id) : null
  const snack = result?.snack_id ? recipeMap.get(result.snack_id) : null

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Protein</p>
          <Chips options={PROTEIN} value={protein} onChange={setProtein} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Effort</p>
          <Chips options={EFFORT} value={effort} onChange={setEffort} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Time</p>
          <Chips options={TIME} value={time} onChange={setTime} />
        </div>
      </div>

      <button
        onClick={suggest}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Finding your dinner…' : 'Suggest dinner'}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className="space-y-4">
          {result.reason && (
            <p className="text-sm text-slate-500 italic border-l-2 border-rose-200 pl-3">{result.reason}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {starter && <SuggestionCard label="Starter" recipe={starter} />}
            {main && <SuggestionCard label="Main" recipe={main} />}
          </div>
          {snack && (
            <div className="max-w-xs">
              <SuggestionCard label="Snack" recipe={snack} />
            </div>
          )}
          <button
            onClick={suggest}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw size={12} /> Try different suggestions
          </button>
        </div>
      )}
    </div>
  )
}
