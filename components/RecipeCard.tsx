'use client'

import Image from 'next/image'
import { HeartButton } from './HeartButton'

const DISH_COLOURS: Record<string, string> = {
  'Main course':        'bg-indigo-100 text-indigo-700',
  'Light meals & snacks': 'bg-amber-100 text-amber-700',
  'Cakes and baking':   'bg-pink-100 text-pink-700',
  'Side dishes':        'bg-green-100 text-green-700',
  'Side Dish':          'bg-green-100 text-green-700',
  'Starters & nibbles': 'bg-orange-100 text-orange-700',
  'Desserts':           'bg-purple-100 text-purple-700',
  'Brunch':             'bg-sky-100 text-sky-700',
  'Other':              'bg-slate-100 text-slate-600',
}

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
  url: string
  image: string | null
}

interface Props {
  recipe: Recipe
  hearted: boolean
  loggedIn: boolean
  onAuthRequired: () => void
  onToggle: (recipeId: string, hearted: boolean) => void
  isUserRecipe?: boolean
  deleteMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export function RecipeCard({ recipe, hearted, loggedIn, onAuthRequired, onToggle, isUserRecipe, deleteMode, isSelected, onToggleSelect }: Props) {
  const badgeClass = DISH_COLOURS[recipe.dishType] ?? DISH_COLOURS['Other']
  const selectable = deleteMode && isUserRecipe

  function handleClick() {
    if (selectable) { onToggleSelect?.(); return }
    if (recipe.url) window.open(recipe.url, '_blank')
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-150 ${selectable ? 'cursor-pointer' : recipe.url ? 'cursor-pointer hover:shadow-md hover:border-slate-200' : 'cursor-default'} ${isSelected ? 'border-rose-400 ring-2 ring-rose-300' : isUserRecipe ? 'border-rose-100' : 'border-slate-100'} ${deleteMode && !isUserRecipe ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {selectable && (
        <div className="absolute top-2 left-2 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-rose-500 border-rose-500' : 'bg-white/90 border-slate-300'}`}>
            {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        </div>
      )}
      {recipe.image ? (
        <div className="relative w-full aspect-[4/3] bg-slate-100 shrink-0">
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 flex items-center justify-center">
          <span className="text-4xl opacity-30">🍽</span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
            {recipe.dishType}
          </span>
          {!deleteMode && (
            <div onClick={e => e.stopPropagation()}>
              <HeartButton
                recipeId={recipe.id}
                hearted={hearted}
                loggedIn={loggedIn}
                onAuthRequired={onAuthRequired}
                onToggle={onToggle}
              />
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 mt-0.5">
          {recipe.title}
        </p>
        <p className="text-xs text-slate-400 mt-auto pt-1">{recipe.chef}</p>
        {isUserRecipe && <p className="text-[9px] text-rose-400 italic">My recipe</p>}
      </div>
    </div>
  )
}
