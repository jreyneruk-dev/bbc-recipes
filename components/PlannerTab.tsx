'use client'

import { useState } from 'react'
import { TonightPanel } from './TonightPanel'
import { WeekGrid } from './WeekGrid'

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
  loggedIn: boolean
}

export function PlannerTab({ recipes, loggedIn }: Props) {
  const [view, setView] = useState<'tonight' | 'week'>('tonight')

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-slate-100">
        {(['tonight', 'week'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-rose-500 text-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {v === 'tonight' ? 'Tonight' : 'This week'}
          </button>
        ))}
      </div>

      {view === 'tonight' ? (
        <TonightPanel recipes={recipes} />
      ) : (
        <WeekGrid recipes={recipes} loggedIn={loggedIn} />
      )}
    </div>
  )
}
