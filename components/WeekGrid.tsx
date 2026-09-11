'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pin, RefreshCw, ChevronLeft, ChevronRight, Wand2, X } from 'lucide-react'
import { RecipePicker } from './RecipePicker'

interface SlotData { id: string; pinned: boolean }
interface DayPlan {
  date: string
  starter: SlotData | null
  main: SlotData | null
  snack: SlotData | null
}
interface Recipe { id: string; title: string; chef: string; dishType: string; url: string; image: string | null }
interface Props { recipes: Recipe[]; loggedIn: boolean }

type SlotKey = 'starter' | 'main' | 'snack'

function getMonday(offset = 0): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildWeek(weekStart: Date): DayPlan[] {
  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return { date: fmtDate(d), starter: null, main: null, snack: null }
  })
}

function normalizePlan(raw: unknown[]): DayPlan[] {
  // handles both old { starter_id } and new { starter: { id, pinned } } formats
  return (raw as any[]).map(d => ({
    date: d.date,
    starter: d.starter ?? (d.starter_id ? { id: d.starter_id, pinned: false } : null),
    main: d.main ?? (d.main_id ? { id: d.main_id, pinned: false } : null),
    snack: d.snack ?? (d.snack_id ? { id: d.snack_id, pinned: false } : null),
  }))
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS: SlotKey[] = ['starter', 'main', 'snack']
const PROTEINS = ['meat', 'fish', 'veg', 'anything', 'meat', 'anything', 'veg']

export function WeekGrid({ recipes, loggedIn }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getMonday(weekOffset)
  const weekKey = fmtDate(weekStart)
  const today = fmtDate(new Date())
  const isCurrentWeek = weekOffset === 0
  const isLastWeek = weekOffset === -1

  const [plan, setPlan] = useState<DayPlan[]>(() => buildWeek(weekStart))
  const [loaded, setLoaded] = useState(false)
  const [picker, setPicker] = useState<{ dayIdx: number; slotKey: SlotKey } | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recipeMap = new Map(recipes.map(r => [r.id, r]))

  useEffect(() => {
    setLoaded(false)
    setPlan(buildWeek(getMonday(weekOffset)))
    if (!loggedIn) { setLoaded(true); return }
    fetch(`/api/meal-plan?week=${weekKey}`)
      .then(r => r.json())
      .then(({ plan: saved }) => {
        if (saved && Array.isArray(saved) && saved.length === 7) setPlan(normalizePlan(saved))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [loggedIn, weekKey])

  const savePlan = useCallback((next: DayPlan[]) => {
    if (!loggedIn) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekKey, plan: next }),
      })
    }, 500)
  }, [loggedIn, weekKey])

  function setSlot(dayIdx: number, slotKey: SlotKey, data: SlotData | null) {
    setPlan(prev => {
      const next = prev.map((d, i) => i === dayIdx ? { ...d, [slotKey]: data } : d)
      savePlan(next)
      return next
    })
  }

  function togglePin(dayIdx: number, slotKey: SlotKey) {
    setPlan(prev => {
      const slot = prev[dayIdx][slotKey]
      if (!slot) return prev
      const next = prev.map((d, i) => i === dayIdx ? { ...d, [slotKey]: { ...slot, pinned: !slot.pinned } } : d)
      savePlan(next)
      return next
    })
  }

  async function refreshSlot(dayIdx: number, slotKey: SlotKey) {
    const key = `${dayIdx}-${slotKey}`
    setRefreshing(key)
    const existingIds = plan.flatMap(d => [d.starter?.id, d.main?.id, d.snack?.id]).filter(Boolean) as string[]
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protein: 'anything', effort: 'medium', time: 'any', exclude_ids: existingIds }),
      })
      if (res.ok) {
        const data = await res.json()
        const newId = data[`${slotKey}_id`]
        if (newId) setSlot(dayIdx, slotKey, { id: newId, pinned: false })
      }
    } catch {}
    setRefreshing(null)
  }

  async function autoFill() {
    setAutoFilling(true)
    const usedIds: string[] = []
    const updates: { dayIdx: number; starter_id: string; main_id: string; snack_id: string | null }[] = []

    for (let i = 0; i < 7; i++) {
      const day = plan[i]
      if (day.date < today) continue
      if (day.starter?.id && day.main?.id) {
        if (day.starter.id) usedIds.push(day.starter.id)
        if (day.main.id) usedIds.push(day.main.id)
        continue
      }
      try {
        const res = await fetch('/api/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protein: PROTEINS[i], effort: 'medium', time: 'any', exclude_ids: usedIds }),
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.error) {
            updates.push({ dayIdx: i, ...data })
            if (data.starter_id) usedIds.push(data.starter_id)
            if (data.main_id) usedIds.push(data.main_id)
          }
        }
      } catch {}
    }

    setPlan(prev => {
      const next = [...prev]
      for (const u of updates) {
        const d = next[u.dayIdx]
        next[u.dayIdx] = {
          ...d,
          starter: d.starter ?? (u.starter_id ? { id: u.starter_id, pinned: false } : null),
          main: d.main ?? (u.main_id ? { id: u.main_id, pinned: false } : null),
          snack: d.snack ?? (u.snack_id ? { id: u.snack_id, pinned: false } : null),
        }
      }
      savePlan(next)
      return next
    })
    setAutoFilling(false)
  }

  if (!loaded) return <div className="text-center py-16 text-sm text-slate-400">Loading…</div>

  const weekLabel = isLastWeek ? 'Last week' : isCurrentWeek ? 'This week' : 'Next week'

  return (
    <div className="py-5 px-4">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(v => Math.max(-1, v - 1))}
            disabled={weekOffset <= -1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-700 w-24 text-center">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset(v => Math.min(1, v + 1))}
            disabled={weekOffset >= 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {isCurrentWeek && (
          <button
            onClick={autoFill}
            disabled={autoFilling}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            {autoFilling
              ? <RefreshCw size={13} className="animate-spin" />
              : <Wand2 size={13} />}
            Auto-fill
          </button>
        )}
      </div>

      {!loggedIn && (
        <p className="mb-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Sign in to save your week plan.
        </p>
      )}

      {/* Horizontal days */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {plan.map((day, i) => {
            const isPast = day.date < today
            const isToday = day.date === today
            const readOnly = isLastWeek
            const dimDay = isCurrentWeek && isPast

            const dayDate = new Date(weekStart)
            dayDate.setDate(dayDate.getDate() + i)

            return (
              <div
                key={day.date}
                style={{ width: '152px' }}
                className={`flex flex-col gap-2 rounded-xl border p-3 flex-shrink-0 transition-all ${
                  dimDay
                    ? 'border-slate-100 bg-slate-50 opacity-40'
                    : isToday
                    ? 'border-rose-200 bg-rose-50/40'
                    : 'border-slate-100 bg-white'
                }`}
              >
                {/* Day header */}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-rose-600' : 'text-slate-500'}`}>
                    {DAYS[i]}{isToday ? ' · today' : ''}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                {/* Slots */}
                {SLOTS.map(slotKey => {
                  const slot = day[slotKey]
                  const recipe = slot ? recipeMap.get(slot.id) : null
                  const refreshKey = `${i}-${slotKey}`

                  return (
                    <div key={slotKey}>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 capitalize">
                        {slotKey}
                      </p>
                      {recipe ? (
                        <div className={`rounded-lg p-2 border ${slot?.pinned ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
                          <p className="text-[11px] font-medium text-slate-700 leading-snug line-clamp-2">
                            {recipe.title}
                          </p>
                          {!readOnly && (
                            <div className="flex items-center gap-0.5 mt-1.5">
                              <button
                                onClick={() => refreshSlot(i, slotKey)}
                                title="New suggestion"
                                className="flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-rose-500 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                              >
                                <RefreshCw size={10} className={refreshing === refreshKey ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={() => togglePin(i, slotKey)}
                                title={slot?.pinned ? 'Unpin' : 'Confirm'}
                                className={`flex items-center justify-center w-6 h-6 rounded border transition-colors ${
                                  slot?.pinned
                                    ? 'text-rose-500 bg-rose-50 border-rose-200'
                                    : 'text-slate-400 hover:text-rose-500 border-transparent hover:border-slate-200 hover:bg-white'
                                }`}
                              >
                                <Pin size={10} />
                              </button>
                              <button
                                onClick={() => setSlot(i, slotKey, null)}
                                title="Remove"
                                className="ml-auto flex items-center justify-center w-6 h-6 rounded text-slate-300 hover:text-slate-500 border border-transparent hover:border-slate-200 hover:bg-white transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                          {readOnly && slot?.pinned && (
                            <Pin size={9} className="text-rose-400 mt-1" />
                          )}
                        </div>
                      ) : (
                        !readOnly && !dimDay && (
                          <button
                            onClick={() => setPicker({ dayIdx: i, slotKey })}
                            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-rose-500 transition-colors py-0.5"
                          >
                            <Plus size={10} /> Add
                          </button>
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {picker && (
        <RecipePicker
          recipes={recipes}
          slotType={picker.slotKey}
          onPick={recipe => {
            setSlot(picker.dayIdx, picker.slotKey, { id: recipe.id, pinned: false })
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
