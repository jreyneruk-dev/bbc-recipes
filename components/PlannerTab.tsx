'use client'

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
  view: 'tonight' | 'week'
}

export function PlannerTab({ recipes, loggedIn, view }: Props) {
  return view === 'tonight'
    ? <TonightPanel recipes={recipes} />
    : <WeekGrid recipes={recipes} loggedIn={loggedIn} />
}
