'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  recipeId: string
  hearted: boolean
  loggedIn: boolean
  onAuthRequired: () => void
  onToggle: (recipeId: string, hearted: boolean) => void
}

export function HeartButton({ recipeId, hearted, loggedIn, onAuthRequired, onToggle }: Props) {
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!loggedIn) { onAuthRequired(); return }
    setLoading(true)
    const next = !hearted
    onToggle(recipeId, next)
    try {
      const res = await fetch('/api/favourites', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      })
      if (!res.ok) onToggle(recipeId, !next)
    } catch {
      onToggle(recipeId, !next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={hearted ? 'Remove from favourites' : 'Add to favourites'}
      className="p-2 rounded-full transition-colors hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
    >
      <Heart
        size={18}
        className={hearted ? 'fill-rose-500 stroke-rose-500' : 'stroke-slate-400 hover:stroke-rose-400'}
      />
    </button>
  )
}
