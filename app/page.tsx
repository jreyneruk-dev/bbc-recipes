'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Heart, LogOut, ChevronDown, UtensilsCrossed, Plus, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { RecipeCard } from '@/components/RecipeCard'
import { AuthModal } from '@/components/AuthModal'
import { PlannerTab } from '@/components/PlannerTab'
import { AddRecipeModal } from '@/components/AddRecipeModal'
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
  const [activeTab, setActiveTab] = useState<'browse' | 'planner'>('browse')
  const [plannerView, setPlannerView] = useState<'tonight' | 'week'>('tonight')
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [heartedIds, setHeartedIds] = useState<Set<string>>(new Set())
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<{ id: string; title: string; chef: string; dishType: string; imageUrl: string; ingredients: string; method: string; sourceUrl: string } | null>(null)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [archiving, setArchiving] = useState(false)
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
    if (!user) { setHeartedIds(new Set()); setUserRecipes([]); return }
    fetch('/api/favourites')
      .then(r => r.json())
      .then(({ favourites }) => setHeartedIds(new Set(favourites ?? [])))
    fetch('/api/recipes')
      .then(r => r.json())
      .then(({ recipes: ur }) => {
        if (!Array.isArray(ur)) return
        setUserRecipes(ur.map((r: { id: string; title: string; chef: string; dish_type: string; source_url: string | null; image_url: string | null }) => ({
          id: r.id, title: r.title, chef: r.chef, dishType: r.dish_type,
          url: `/recipe/${r.id}`,
          image: r.image_url ?? null,
        })))
      })
  }, [user])

  const allRecipes = useMemo(() => [...userRecipes, ...recipes], [userRecipes])
  const userRecipeIds = useMemo(() => new Set(userRecipes.map(r => r.id)), [userRecipes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allRecipes.filter(r => {
      if (q && !r.title.toLowerCase().includes(q) && !r.chef.toLowerCase().includes(q)) return false
      if (dishType !== 'All' && r.dishType !== dishType) return false
      if (chef !== 'All' && r.chef !== chef) return false
      if (showFavourites && !heartedIds.has(r.id)) return false
      return true
    })
  }, [search, dishType, chef, showFavourites, heartedIds, allRecipes])

  function handleToggle(recipeId: string, hearted: boolean) {
    setHeartedIds(prev => {
      const next = new Set(prev)
      hearted ? next.add(recipeId) : next.delete(recipeId)
      return next
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  function exitDeleteMode() {
    setDeleteMode(false)
    setSelectedIds(new Set())
    setConfirmingDelete(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function archiveSelected() {
    setArchiving(true)
    try {
      const res = await fetch('/api/recipes/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (res.ok) {
        setUserRecipes(prev => prev.filter(r => !selectedIds.has(r.id)))
        exitDeleteMode()
      }
    } finally {
      setArchiving(false)
    }
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

      {/* Tab bar — main tabs + planner sub-tabs inline */}
      <div className="sticky top-[57px] z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'browse' ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'planner' && plannerView !== 'tonight' && plannerView !== 'week'
                ? 'bg-rose-500 text-white'
                : activeTab === 'planner'
                ? 'text-slate-700 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UtensilsCrossed size={13} />
            Meal Planner
          </button>

          {activeTab === 'planner' && (
            <>
              <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
              {(['tonight', 'week'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setPlannerView(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    plannerView === v ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {v === 'tonight' ? 'Tonight' : 'This week'}
                </button>
              ))}
            </>
          )}

          {/* Action buttons — right side of tab bar */}
          {!deleteMode && (
            <div className="ml-auto flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => { if (!user && !showFavourites) { setShowAuthModal(true); return } setShowFavourites(v => !v) }}
                title="My favourites"
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${showFavourites ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Heart size={15} className={showFavourites ? 'fill-rose-500 stroke-rose-500' : ''} />
              </button>
              {user && (
                <button onClick={() => setShowAddModal(true)} title="Add recipe"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                  <Plus size={15} />
                </button>
              )}
              {user && userRecipes.length > 0 && (
                <button onClick={() => setDeleteMode(true)} title="Remove recipes"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                  <Minus size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === 'planner' && (
        <PlannerTab recipes={allRecipes} loggedIn={!!user} view={plannerView} />
      )}

      {/* Browse tab: filters + grid */}
      {activeTab === 'browse' && (
        <>
          <div className="sticky top-[105px] z-30 bg-white/90 backdrop-blur border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
              {/* Search — icon collapses to input */}
              {searchOpen ? (
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    autoFocus
                    type="search"
                    placeholder="Search recipes or chefs…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onBlur={() => { if (!search) setSearchOpen(false) }}
                    className="w-full pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  title="Search"
                  className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors shrink-0 ${search ? 'border-rose-300 text-rose-500 bg-rose-50' : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700'}`}
                >
                  <Search size={16} />
                </button>
              )}

              {/* Dish type */}
              <div className="relative">
                <select
                  value={dishType}
                  onChange={e => setDishType(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer w-[82px]"
                >
                  <option value="All">Type</option>
                  {ALL_DISH_TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Chef */}
              <div className="relative">
                <select
                  value={chef}
                  onChange={e => setChef(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer w-[82px]"
                >
                  <option value="All">Chef</option>
                  {ALL_CHEFS.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <span className="ml-auto text-xs text-slate-400 shrink-0">{filtered.length} recipes</span>
              {deleteMode && !confirmingDelete && (
                <>
                  <span className="text-xs text-slate-500 shrink-0">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Tap your recipes to select'}
                  </span>
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-2 text-sm rounded-lg bg-red-500 text-white font-medium disabled:opacity-40 hover:bg-red-600 transition-colors shrink-0"
                  >
                    Archive {selectedIds.size > 0 ? selectedIds.size : ''}
                  </button>
                  <button onClick={exitDeleteMode} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0">
                    Cancel
                  </button>
                </>
              )}
              {confirmingDelete && (
                <>
                  <span className="text-xs text-slate-700 font-medium shrink-0">
                    Archive {selectedIds.size} recipe{selectedIds.size !== 1 ? 's' : ''}?
                  </span>
                  <button
                    onClick={archiveSelected}
                    disabled={archiving}
                    className="px-3 py-2 text-sm rounded-lg bg-red-500 text-white font-medium disabled:opacity-50 hover:bg-red-600 transition-colors shrink-0"
                  >
                    {archiving ? 'Archiving…' : 'Confirm'}
                  </button>
                  <button onClick={() => setConfirmingDelete(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0">
                    Cancel
                  </button>
                </>
              )}
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
                    onToggle={handleToggle}
                    isUserRecipe={userRecipeIds.has(recipe.id)}
                    deleteMode={deleteMode}
                    isSelected={selectedIds.has(recipe.id)}
                    onToggleSelect={() => toggleSelect(recipe.id)}
                    onEdit={userRecipeIds.has(recipe.id) ? async () => {
                      const res = await fetch(`/api/recipes/${recipe.id}`)
                      const { recipe: full } = await res.json()
                      if (full) setEditingRecipe({
                        id: full.id, title: full.title, chef: full.chef,
                        dishType: full.dish_type, imageUrl: full.image_url ?? '',
                        ingredients: full.ingredients ?? '', method: full.method ?? '',
                        sourceUrl: full.source_url ?? '',
                      })
                    } : undefined}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAddModal && (
        <AddRecipeModal
          onClose={() => setShowAddModal(false)}
          onSaved={recipe => {
            setUserRecipes(prev => [{
              id: recipe.id, title: recipe.title, chef: recipe.chef,
              dishType: recipe.dish_type, url: `/recipe/${recipe.id}`, image: recipe.image_url ?? null,
            }, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
      {editingRecipe && (
        <AddRecipeModal
          onClose={() => setEditingRecipe(null)}
          editRecipe={editingRecipe}
          onSaved={recipe => {
            setUserRecipes(prev => prev.map(r => r.id === recipe.id ? {
              ...r, title: recipe.title, chef: recipe.chef,
              dishType: recipe.dish_type, image: recipe.image_url ?? null,
            } : r))
            setEditingRecipe(null)
          }}
        />
      )}
    </div>
  )
}
