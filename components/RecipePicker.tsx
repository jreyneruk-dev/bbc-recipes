'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
}

interface Props {
  recipes: Recipe[]
  slotType: 'starter' | 'main' | 'snack'
  onPick: (recipe: Recipe) => void
  onClose: () => void
}

const TYPE_FILTER: Record<string, string[]> = {
  starter: ['Starters & nibbles', 'Light meals & snacks'],
  main: ['Main course'],
  snack: ['Light meals & snacks', 'Cakes and baking'],
}

export function RecipePicker({ recipes, slotType, onPick, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const allowed = TYPE_FILTER[slotType]
    const q = search.toLowerCase()
    return recipes
      .filter(r => allowed.includes(r.dishType))
      .filter(r => !q || r.title.toLowerCase().includes(q) || r.chef.toLowerCase().includes(q))
      .slice(0, 40)
  }, [recipes, slotType, search])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 capitalize">Pick a {slotType}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => onPick(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-medium text-slate-800 line-clamp-1">{r.title}</p>
              <p className="text-xs text-slate-400">{r.chef}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No recipes found</p>
          )}
        </div>
      </div>
    </div>
  )
}
