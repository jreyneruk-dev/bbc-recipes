'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Check, X, ExternalLink, Wand2, RefreshCw } from 'lucide-react'
import { RecipePicker } from './RecipePicker'

interface Recipe {
  id: string
  title: string
  chef: string
  dishType: string
  url: string
  image: string | null
}

interface DayPlan {
  date: string
  starter_id: string | null
  main_id: string | null
  snack_id: string | null
  cooked: boolean
}

interface Props {
  recipes: Recipe[]
  loggedIn: boolean
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getWeekStart(d = new Date()) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildWeek(weekStart: Date): DayPlan[] {
  return DAYS.map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return { date: formatDate(d), starter_id: null, main_id: null, snack_id: null, cooked: false }
  })
}

function SlotButton({ label, recipe, onPick, onClear }: {
  label: string
  recipe: Recipe | null | undefined
  onPick: () => void
  onClear: () => void
}) {
  if (!recipe) {
    return (
      <button
        onClick={onPick}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors py-0.5"
      >
        <Plus size={11} /> <span className="capitalize">{label}</span>
      </button>
    )
  }
  return (
    <div className="flex items-start gap-1 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2">{recipe.title}</p>
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-[10px] text-rose-500 hover:text-rose-600 inline-flex items-center gap-0.5"
        >
          BBC <ExternalLink size={8} />
        </a>
      </div>
      <button
        onClick={onClear}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 text-slate-300 hover:text-slate-500 mt-0.5"
      >
        <X size={12} />
      </button>
    </div>
  )
}

export function WeekGrid({ recipes, loggedIn }: Props) {
  const weekStart = getWeekStart()
  const weekKey = formatDate(weekStart)

  const [plan, setPlan] = useState<DayPlan[]>(() => buildWeek(weekStart))
  const [loaded, setLoaded] = useState(false)
  const [picker, setPicker] = useState<{ dayIdx: number; slotType: 'starter' | 'main' | 'snack' } | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recipeMap = new Map(recipes.map(r => [r.id, r]))

  // Load plan from Supabase
  useEffect(() => {
    if (!loggedIn) { setLoaded(true); return }
    fetch(`/api/meal-plan?week=${weekKey}`)
      .then(r => r.json())
      .then(({ plan: saved }) => {
        if (saved && Array.isArray(saved) && saved.length === 7) setPlan(saved)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [loggedIn, weekKey])

  const savePlan = useCallback((newPlan: DayPlan[]) => {
    if (!loggedIn) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekKey, plan: newPlan }),
      })
    }, 500)
  }, [loggedIn, weekKey])

  function setSlot(dayIdx: number, slot: 'starter_id' | 'main_id' | 'snack_id', id: string | null) {
    setPlan(prev => {
      const next = prev.map((d, i) => i === dayIdx ? { ...d, [slot]: id } : d)
      savePlan(next)
      return next
    })
  }

  function toggleCooked(dayIdx: number) {
    setPlan(prev => {
      const next = prev.map((d, i) => i === dayIdx ? { ...d, cooked: !d.cooked } : d)
      savePlan(next)
      return next
    })
  }

  async function autoFill() {
    setAutoFilling(true)
    const weekdays = [0, 1, 2, 3, 4] // Mon–Fri
    const proteins = ['meat', 'fish', 'veg', 'anything', 'meat']
    const efforts = ['easy', 'medium', 'adventurous', 'medium', 'easy']

    const updates: Array<{ dayIdx: number; starter_id: string; main_id: string; snack_id: string | null }> = []

    for (const i of weekdays) {
      const day = plan[i]
      if (day.starter_id && day.main_id) continue // already filled
      try {
        const res = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protein: proteins[i], effort: efforts[i], time: 'any' }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.error) updates.push({ dayIdx: i, ...data })
        }
      } catch { /* skip this day */ }
    }

    setPlan(prev => {
      const next = [...prev]
      for (const u of updates) {
        next[u.dayIdx] = {
          ...next[u.dayIdx],
          starter_id: next[u.dayIdx].starter_id ?? u.starter_id,
          main_id: next[u.dayIdx].main_id ?? u.main_id,
          snack_id: next[u.dayIdx].snack_id ?? u.snack_id,
        }
      }
      savePlan(next)
      return next
    })
    setAutoFilling(false)
  }

  if (!loaded) {
    return <div className="text-center py-16 text-sm text-slate-400">Loading your plan…</div>
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">This week</h2>
          <p className="text-xs text-slate-400">
            w/c {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={autoFill}
          disabled={autoFilling}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
        >
          {autoFilling ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
          Auto-fill week
        </button>
      </div>

      {!loggedIn && (
        <p className="mb-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          Sign in to save your week plan.
        </p>
      )}

      <div className="space-y-2">
        {plan.map((day, i) => {
          const dayDate = new Date(weekStart)
          dayDate.setDate(dayDate.getDate() + i)
          const isToday = formatDate(dayDate) === formatDate(new Date())
          const starter = day.starter_id ? recipeMap.get(day.starter_id) : null
          const main = day.main_id ? recipeMap.get(day.main_id) : null
          const snack = day.snack_id ? recipeMap.get(day.snack_id) : null

          return (
            <div
              key={day.date}
              className={`rounded-xl border p-3 transition-all ${
                day.cooked
                  ? 'border-green-200 bg-green-50 opacity-60'
                  : isToday
                  ? 'border-rose-200 bg-rose-50/40'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Day label */}
                <div className="shrink-0 w-20">
                  <p className={`text-sm font-semibold ${isToday ? 'text-rose-600' : 'text-slate-700'}`}>
                    {DAYS[i].slice(0, 3)}
                    {isToday && <span className="ml-1 text-[10px] font-normal text-rose-400">today</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                {/* Slots */}
                <div className="flex-1 space-y-1.5">
                  <SlotButton
                    label="starter"
                    recipe={starter}
                    onPick={() => setPicker({ dayIdx: i, slotType: 'starter' })}
                    onClear={() => setSlot(i, 'starter_id', null)}
                  />
                  <SlotButton
                    label="main"
                    recipe={main}
                    onPick={() => setPicker({ dayIdx: i, slotType: 'main' })}
                    onClear={() => setSlot(i, 'main_id', null)}
                  />
                  <SlotButton
                    label="snack"
                    recipe={snack}
                    onPick={() => setPicker({ dayIdx: i, slotType: 'snack' })}
                    onClear={() => setSlot(i, 'snack_id', null)}
                  />
                </div>

                {/* Cooked toggle */}
                <button
                  onClick={() => toggleCooked(i)}
                  title={day.cooked ? 'Mark uncooked' : 'Mark as cooked'}
                  className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                    day.cooked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-slate-200 text-slate-300 hover:border-green-400 hover:text-green-500'
                  }`}
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {picker && (
        <RecipePicker
          recipes={recipes}
          slotType={picker.slotType}
          onPick={recipe => {
            const slotKey = `${picker.slotType}_id` as 'starter_id' | 'main_id' | 'snack_id'
            setSlot(picker.dayIdx, slotKey, recipe.id)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
