'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Link, Camera, Loader2, ClipboardList } from 'lucide-react'

const DISH_TYPES = ['Main course', 'Starters & nibbles', 'Light meals & snacks', 'Cakes and baking', 'Desserts', 'Side dishes', 'Brunch', 'Other']

const INPUT = 'w-full mt-1 px-3 py-2 text-sm font-normal text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 placeholder:text-slate-400'
const TEXTAREA = `${INPUT} resize-y`
const SELECT = 'mt-1 px-3 py-2 text-sm font-normal text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300'
const LABEL = 'block text-[11px] font-semibold text-slate-600 uppercase tracking-wide'

interface ExtractedRecipe {
  title: string
  chef: string
  dishType: string
  imageUrl: string
  ingredients: string
  method: string
}

interface EditRecipe {
  id: string; title: string; chef: string; dishType: string; imageUrl: string; ingredients: string; method: string; sourceUrl: string
}

interface Props {
  onSaved: (recipe: { id: string; title: string; chef: string; dish_type: string; source_url: string; image_url: string }) => void
  onClose: () => void
  editRecipe?: EditRecipe
}

export function AddRecipeModal({ onSaved, onClose, editRecipe }: Props) {
  const isEditing = !!editRecipe
  const [tab, setTab] = useState<'url' | 'photo' | 'form'>(isEditing ? 'form' : 'url')
  const [manual, setManual] = useState<ExtractedRecipe>({
    title: editRecipe?.title ?? '',
    chef: editRecipe?.chef ?? '',
    dishType: editRecipe?.dishType ?? 'Main course',
    imageUrl: editRecipe?.imageUrl ?? '',
    ingredients: editRecipe?.ingredients ?? '',
    method: editRecipe?.method ?? '',
  })
  const [imageUploading, setImageUploading] = useState(false)
  const formImageRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedRecipe | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function extract(body: object) {
    setExtracting(true); setError(''); setExtracted(null)
    try {
      const res = await fetch('/api/recipes/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setExtracted({
        title: data.title ?? '', chef: data.chef ?? '',
        dishType: DISH_TYPES.includes(data.dishType) ? data.dishType : 'Main course',
        imageUrl: data.imageUrl ?? '', ingredients: data.ingredients ?? '', method: data.method ?? '',
      })
    } catch { setError('Something went wrong. Please try again.') }
    finally { setExtracting(false) }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await extract({ imageBase64: (reader.result as string).split(',')[1], mimeType: file.type })
    }
    reader.readAsDataURL(file)
  }

  async function saveRecipe(fields: {
    title: string; chef: string; dish_type: string; source_url: string; image_url: string | null; ingredients: string; method: string
  }) {
    setSaving(true); setError('')
    try {
      const body = { recipe: { ...fields, chef: fields.chef || 'My recipe' } }
      const res = isEditing
        ? await fetch(`/api/recipes/${editRecipe!.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onSaved(data.recipe)
    } catch { setError('Failed to save. Please try again.') }
    finally { setSaving(false) }
  }

  const handleFormImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImageUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/recipes/image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: (reader.result as string).split(',')[1], mimeType: file.type }),
        })
        const data = await res.json()
        if (data.url) setManual(p => ({ ...p, imageUrl: data.url }))
        else setError(data.error ?? 'Image upload failed')
      } catch { setError('Image upload failed') }
      finally { setImageUploading(false) }
    }
    reader.readAsDataURL(file)
  }, [])

  const tabs = [
    ['url', 'From URL', <Link key="url" size={13} />],
    ['photo', 'From photo', <Camera key="photo" size={13} />],
    ['form', 'Form', <ClipboardList key="form" size={13} />],
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">{isEditing ? 'Edit recipe' : 'Add recipe'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={16} /></button>
        </div>

        {/* Tabs — hidden when editing (always shows the form) */}
        {!isEditing && <div className="flex gap-1 px-5 pt-4">
          {tabs.map(([t, label, icon]) => (
            <button key={t} onClick={() => { setTab(t); setExtracted(null); setError('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-rose-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
              {icon}{label}
            </button>
          ))}
        </div>}

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* URL tab */}
          {tab === 'url' && !extracted && (
            <>
              <div className="flex gap-2">
                <input type="url" placeholder="Paste a recipe URL…" value={url}
                  onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && extract({ url: url.trim() })}
                  className={INPUT} />
                <button onClick={() => extract({ url: url.trim() })} disabled={extracting || !url.trim()}
                  className="px-3 py-2 bg-rose-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-rose-600 transition-colors">
                  {extracting ? <Loader2 size={14} className="animate-spin" /> : 'Extract'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}

          {/* Photo tab */}
          {tab === 'photo' && !extracted && (
            <>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={extracting}
                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-rose-300 hover:text-rose-500 transition-colors text-sm flex flex-col items-center gap-2">
                {extracting
                  ? <><Loader2 size={20} className="animate-spin" /><span>Reading recipe…</span></>
                  : <><Camera size={20} /><span>Tap to choose a photo of your recipe</span></>}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}

          {/* Manual form tab */}
          {tab === 'form' && !extracted && (
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Title *</label>
                <input value={manual.title} onChange={e => setManual(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Grandma's apple crumble" className={INPUT} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={LABEL}>Chef / source</label>
                  <input value={manual.chef} onChange={e => setManual(p => ({ ...p, chef: e.target.value }))}
                    placeholder="e.g. Nigel Slater" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Dish type</label>
                  <select value={manual.dishType} onChange={e => setManual(p => ({ ...p, dishType: e.target.value }))} className={SELECT}>
                    {DISH_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Image <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <input ref={formImageRef} type="file" accept="image/*" onChange={handleFormImage} className="hidden" />
                {manual.imageUrl ? (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
                      <Image src={manual.imageUrl} alt="preview" fill className="object-cover" unoptimized />
                    </div>
                    <button onClick={() => setManual(p => ({ ...p, imageUrl: '' }))}
                      className="text-xs text-slate-500 hover:text-red-500 transition-colors">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => formImageRef.current?.click()} disabled={imageUploading}
                    className="mt-1 w-full py-2.5 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-rose-300 hover:text-rose-500 transition-colors flex items-center justify-center gap-1.5">
                    {imageUploading
                      ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                      : <><Camera size={13} /> Upload a photo</>}
                  </button>
                )}
              </div>
              <div>
                <label className={LABEL}>Ingredients</label>
                <textarea value={manual.ingredients} onChange={e => setManual(p => ({ ...p, ingredients: e.target.value }))}
                  rows={5} placeholder={'1 egg\n200g flour\n…'} className={TEXTAREA} />
              </div>
              <div>
                <label className={LABEL}>Method</label>
                <textarea value={manual.method} onChange={e => setManual(p => ({ ...p, method: e.target.value }))}
                  rows={6} placeholder={'1. Preheat oven to 180°C\n2. …'} className={TEXTAREA} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={() => saveRecipe({ title: manual.title, chef: manual.chef, dish_type: manual.dishType, source_url: '', image_url: manual.imageUrl || null, ingredients: manual.ingredients, method: manual.method })}
                disabled={saving || !manual.title.trim()}
                className="w-full py-2 bg-rose-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-rose-600 transition-colors">
                {saving ? 'Saving…' : 'Save recipe'}
              </button>
            </div>
          )}

          {/* Extracted preview (URL + photo tabs) */}
          {extracted && (
            <div className="space-y-3">
              {extracted.imageUrl && (
                <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                  <Image src={extracted.imageUrl} alt={extracted.title} fill className="object-cover" unoptimized />
                </div>
              )}
              <div>
                <label className={LABEL}>Title</label>
                <input value={extracted.title} onChange={e => setExtracted(p => p && { ...p, title: e.target.value })} className={INPUT} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={LABEL}>Chef / source</label>
                  <input value={extracted.chef} onChange={e => setExtracted(p => p && { ...p, chef: e.target.value })} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Dish type</label>
                  <select value={extracted.dishType} onChange={e => setExtracted(p => p && { ...p, dishType: e.target.value })} className={SELECT}>
                    {DISH_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Ingredients</label>
                <textarea value={extracted.ingredients} onChange={e => setExtracted(p => p && { ...p, ingredients: e.target.value })} rows={5} className={TEXTAREA} />
              </div>
              <div>
                <label className={LABEL}>Method</label>
                <textarea value={extracted.method} onChange={e => setExtracted(p => p && { ...p, method: e.target.value })} rows={6} className={TEXTAREA} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setExtracted(null); setError('') }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Back</button>
                <button
                  onClick={() => saveRecipe({ title: extracted.title, chef: extracted.chef, dish_type: extracted.dishType, source_url: tab === 'url' ? url.trim() : '', image_url: extracted.imageUrl || null, ingredients: extracted.ingredients, method: extracted.method })}
                  disabled={saving || !extracted.title.trim()}
                  className="flex-1 py-2 bg-rose-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-rose-600 transition-colors">
                  {saving ? 'Saving…' : 'Save recipe'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
