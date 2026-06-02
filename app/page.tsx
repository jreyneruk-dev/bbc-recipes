'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Heart, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { RecipeCard } from '@/components/RecipeCard'
import { AuthModal } from '@/components/AuthModal'
import recipesData from '@/data/recipes.json'

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
  url: string
  image: string | null
}

const recipes = recipesData as Recipe[]

const ALL_DISH_TYPES = ['All', ...Array.from(new Set(recipes.map(r => r.dishType))).sort()]
const ALL_CHEFS = ['All', ...Array.from(new Set(recipes.map(r => r.chef))).sort()]

export default function Home() {
  const [search, setSearch] = useState('')
  const [dishType, setDishType] = useState('All')
  const [chef, setChef] = useState('All')
  const [showFavourites, setShowFavourites] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [heartedIds, setHeartedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setHeartedIds(new Set()); return }
    fetch('/api/favourites')
      .then(r => r.json())
      .then(({ favourites }) => setHeartedIds(new Set(favourites ?? [])))
  }, [user])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return recipes.filter(r => {
      if (q && !r.title.toLowerCase().includes(q) && !r.chef.toLowerCase().includes(q)) return false
      if (dishType !== 'All' && r.dishType !== dishType) return false
      if (chef !== 'All' && r.chef !== chef) return false
      if (showFavourites && !heartedIds.has(r.id)) return false
      return true
    })
  }, [search, dishType, chef, showFavourites, heartedIds])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-slate-800 shrink-0">My Favourite Foods</h1>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">
                {initials}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs text-rose-600 font-medium hover:text-rose-700 transition-colors"
            >
              Sign in to save favourites
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-[57px] z-30 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search recipes or chefs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:bg-white"
            />
          </div>

          {/* Dish type */}
          <div className="relative">
            <select
              value={dishType}
              onChange={e => setDishType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
            >
              {ALL_DISH_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Chef */}
          <div className="relative">
            <select
              value={chef}
              onChange={e => setChef(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
            >
              {ALL_CHEFS.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* My favourites toggle */}
          <button
            onClick={() => {
              if (!user && !showFavourites) { setShowAuthModal(true); return }
              setShowFavourites(v => !v)
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFavourites
                ? 'bg-rose-50 border-rose-300 text-rose-600'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Heart size={13} className={showFavourites ? 'fill-rose-500 stroke-rose-500' : ''} />
            My favourites
          </button>

          <span className="ml-auto text-xs text-slate-400 shrink-0">{filtered.length} recipes</span>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">No recipes match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                hearted={heartedIds.has(recipe.id)}
                loggedIn={!!user}
                onAuthRequired={() => setShowAuthModal(true)}
              />
            ))}
          </div>
        )}
      </main>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
