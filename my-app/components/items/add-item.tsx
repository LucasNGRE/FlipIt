"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ImagePlus, X, ArrowLeft, Check, Search, Pencil,
  Layers, Settings, Circle, ShoppingBag, Shirt, Wrench,
  Tag, Shield, Package,
} from "lucide-react";
import Image from "next/image";

// ─── Catégories principales ─────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'Deck',       label: 'Deck',        icon: Layers,      desc: 'Planche complète ou deck nu' },
  { value: 'Truck',      label: 'Truck',        icon: Settings,    desc: 'Trucks (paire ou à l\'unité)' },
  { value: 'Roue',       label: 'Roues',        icon: Circle,      desc: 'Roues de skate' },
  { value: 'Chaussure',  label: 'Chaussures',   icon: ShoppingBag, desc: 'Skate shoes, baskets' },
  { value: 'Vetement',   label: 'Vêtement',     icon: Shirt,       desc: 'T-shirt, hoodie, pantalon…' },
  { value: 'Accessoire', label: 'Accessoire',   icon: Wrench,      desc: 'Grip, roulements, casque…' },
]

// ─── Sous-catégories ────────────────────────────────────────────────────────

const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  Vetement: [
    { value: 'Tshirt',      label: 'T-shirt' },
    { value: 'Hoodie',      label: 'Hoodie / Sweat' },
    { value: 'Pull',        label: 'Pull' },
    { value: 'Veste',       label: 'Veste / Manteau' },
    { value: 'Pantalon',    label: 'Pantalon' },
    { value: 'Short',       label: 'Short' },
    { value: 'Casquette',   label: 'Casquette' },
    { value: 'Bonnet',      label: 'Bonnet' },
    { value: 'Chaussettes', label: 'Chaussettes' },
    { value: 'Autre',       label: 'Autre' },
  ],
  Accessoire: [
    { value: 'Grip',        label: 'Grip tape' },
    { value: 'Roulements',  label: 'Roulements' },
    { value: 'Casque',      label: 'Casque' },
    { value: 'Protection',  label: 'Protections (genoux, coudes…)' },
    { value: 'Outil',       label: 'Outil skate' },
    { value: 'Sac',         label: 'Sac à dos' },
    { value: 'Autre',       label: 'Autre accessoire' },
  ],
}

// ─── Marques par catégorie / sous-catégorie ──────────────────────────────────

const BRANDS: Record<string, string[]> = {
  Deck: [
    'Almost', 'Anti Hero', 'Baker', 'Birdhouse', 'Blind', 'Chocolate',
    'Creature', 'Deathwish', 'Element', 'Enjoi', 'Evisen', 'Flip',
    'Fucking Awesome', 'Girl', 'Globe', 'Isle', 'Jart', 'Krooked',
    'Magenta', 'Plan B', 'Polar Skate Co.', 'Powell Peralta', 'Primitive',
    'Quasi', 'Real', 'Santa Cruz', 'Thank You', 'Toy Machine', 'Voltage',
    'Welcome', 'Zero', 'Autre',
  ],
  Truck: [
    'Ace', 'Caliber', 'Crail', 'Destructo', 'Grind King', 'Independent',
    'Krux', 'Paris', 'Randal', 'Royal', 'Sabre', 'Tensor',
    'Theeve', 'Thunder', 'Venture', 'Autre',
  ],
  Roue: [
    'Autobahn', 'Bones', 'Chocolate', 'Clouds', 'Cult', 'Hawgs',
    'Hyper', 'OJ Wheels', 'Pig', 'Powell', 'Ricta', 'Sector 9',
    'Spitfire', 'Wayward', 'Autre',
  ],
  Chaussure: [
    'Adidas', 'Airwalk', 'Circa', 'Converse', 'DC Shoes', 'Dekline',
    'DVS', 'Emerica', 'Es Footwear', 'Etnies', 'Fallen', 'Globe',
    'Huf', 'Jordan', 'Lakai', 'Macbeth', 'New Balance Numeric',
    'Nike SB', 'Osiris', 'Puma', 'Reebok', 'Supra', 'Vans',
    'Vox', 'Autre',
  ],
  Vetement: [
    'Anti Hero', 'Brixton', 'Bronze 56k', 'Carhartt WIP', 'Chocolate',
    'Creature', 'Dickies', 'Element', 'Emerica', 'Etnies', 'Evisen',
    'Fucking Awesome', 'Gifted Hater', 'Girl', 'HUF', 'Independent',
    'Krooked', 'Magenta', 'Nike SB', 'Palace', 'Polar Skate Co.',
    'Primitive', 'Quasi', 'Rip N Dip', 'Ripndip', 'Santa Cruz',
    'Stüssy', 'Supreme', 'Thrasher', 'Theories', 'Toy Machine',
    'Vans', 'Volcom', 'Welcome', 'Autre',
  ],
  // Accessoires par sous-catégorie
  Grip: [
    'Black Magic', 'Bones', 'Diamond', 'Grizzly', 'Jessup', 'Mob',
    'Shake Junt', 'Venom', 'Autre',
  ],
  Roulements: [
    'Andale', 'Bones', 'Bronson', 'Independent', 'Shake Junt',
    'Spitfire', 'Tensor', 'Zealous', 'Autre',
  ],
  Casque: [
    'Bern', 'Nutcase', 'Pro-Tec', 'Sandbox', 'Smith', 'Triple 8', 'TSG', 'Autre',
  ],
  Protection: [
    'Bern', 'Pro-Tec', 'Triple 8', 'TSG', 'Demon', 'Anon', 'Autre',
  ],
  Outil: [
    'Independent', 'Lucky', 'Skate One', 'Tensor', 'Autre',
  ],
  Sac: [
    'Dakine', 'Element', 'Herschel', 'Jansport', 'Nike', 'Vans', 'Autre',
  ],
  Accessoire: [
    'Bones', 'Diamond', 'Grizzly', 'Independent', 'Mob', 'Shake Junt', 'Spitfire', 'Autre',
  ],
}

// ─── Tailles par catégorie / sous-catégorie ──────────────────────────────────

const SIZES: Record<string, string[]> = {
  Deck:       ['7.25"', '7.5"', '7.75"', '8.0"', '8.125"', '8.25"', '8.375"', '8.5"', '8.75"', '9.0"', '9.5"+'],
  Truck:      ['129 mm', '139 mm', '149 mm', '159 mm', '169 mm', '180 mm'],
  Roue:       ['48 mm', '49 mm', '50 mm', '51 mm', '52 mm', '53 mm', '54 mm', '55 mm', '56 mm', '58 mm', '60 mm+'],
  Chaussure:  ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'],
  // Vêtements
  Tshirt:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  Hoodie:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  Pull:       ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Veste:      ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Pantalon:   ['28', '29', '30', '31', '32', '33', '34', '36', '38'],
  Short:      ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Casquette:  ['Taille unique', 'S/M', 'L/XL'],
  Bonnet:     ['Taille unique'],
  Chaussettes:['36–39', '40–43', '44–47'],
  Vetement:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Accessoires
  Grip:       ['9"×33"', '10"×33"', '11"×33"'],
  Roulements: ['Standard (8 pcs)', 'Standard (4 pcs)'],
  Casque:     ['XS', 'S', 'M', 'L', 'XL'],
  Protection: ['XS/S', 'S/M', 'M/L', 'L/XL'],
  Outil:      ['Unique'],
  Sac:        ['Unique'],
  Autre:      ['Unique'],
  Accessoire: ['Unique'],
}

// ─── État ────────────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'Neuf',         label: 'Neuf',         desc: 'Jamais utilisé, emballage d\'origine' },
  { value: 'Comme_neuf',   label: 'Comme neuf',   desc: 'Très peu utilisé, aucun défaut visible' },
  { value: 'Bon_etat',     label: 'Bon état',     desc: 'Quelques traces d\'usure normales' },
  { value: 'Moyen_etat',   label: 'Moyen état',   desc: 'Usure visible mais fonctionnel' },
  { value: 'Mauvais_etat', label: 'Mauvais état', desc: 'Très usé, vendu pour pièces' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBrands(category: string, subcat: string): string[] {
  if (category === 'Accessoire' && subcat && BRANDS[subcat]) return BRANDS[subcat]
  return BRANDS[category] ?? []
}

function getSizes(category: string, subcat: string): string[] {
  if (subcat && SIZES[subcat]) return SIZES[subcat]
  return SIZES[category] ?? ['Unique']
}

function hasSubcat(category: string) {
  return !!SUBCATEGORIES[category]
}

// ─── Composant ───────────────────────────────────────────────────────────────

type FormData = {
  category: string; subcat: string; brand: string;
  title: string; size: string; condition: string;
  price: string; description: string; photos: File[];
}

// Steps: 0=category 1=subcat 2=brand 3=details 4=condition+price 5=photos 6=review
const STEP_LABELS = ['Catégorie', 'Type', 'Marque', 'Détails', 'État & Prix', 'Photos', 'Récapitulatif']

export default function AddItem() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [formData, setFormData] = useState<FormData>({
    category: '', subcat: '', brand: '', title: '',
    size: '', condition: '', price: '', description: '', photos: [],
  })

  const set = (field: keyof FormData, value: string | File[]) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  // Skip step 1 if no subcategory for this category
  const next = () => {
    if (step === 0 && !hasSubcat(formData.category)) { setStep(2); return }
    if (step < 6) setStep(s => s + 1)
  }
  const prev = () => {
    if (step === 2 && !hasSubcat(formData.category)) { setStep(0); return }
    if (step > 0) setStep(s => s - 1)
  }

  const canNext = () => {
    if (step === 0) return !!formData.category
    if (step === 1) return !!formData.subcat
    if (step === 2) return !!formData.brand
    if (step === 3) return !!formData.title && !!formData.size
    if (step === 4) return !!formData.condition && !!formData.price
    if (step === 5) return formData.photos.length > 0
    return true
  }

  const brands = useMemo(() => {
    const all = getBrands(formData.category, formData.subcat)
    const q = brandSearch.trim().toLowerCase()
    return q ? all.filter(b => b.toLowerCase().includes(q)) : all
  }, [formData.category, formData.subcat, brandSearch])

  const sizes = getSizes(formData.category, formData.subcat)

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    set('photos', [...formData.photos, ...Array.from(e.target.files)].slice(0, 5))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('category', formData.category)
      fd.append('brand', formData.brand)
      fd.append('title', formData.title)
      fd.append('size', formData.size)
      fd.append('condition', formData.condition)
      fd.append('price', formData.price)
      fd.append('description', formData.description)
      formData.photos.forEach(p => fd.append('photos', p))
      const res = await fetch('/api/items', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      setSuccess(true)
      setTimeout(() => router.push('/'), 2500)
    } catch {
      alert('Une erreur est survenue. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  // Effective steps to show in progress bar (skip step 1 if no subcat)
  const totalSteps = hasSubcat(formData.category) || step <= 0 ? 7 : 6
  const effectiveStep = step === 0 ? 0 : (hasSubcat(formData.category) ? step : step - 1)

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-800/20">
          <Check className="h-8 w-8 text-brand" />
        </div>
        <h2 className="font-display text-2xl font-bold">Annonce publiée !</h2>
        <p className="text-muted-foreground text-sm">Redirection vers l'accueil…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Publier une annonce</h1>
        <p className="text-sm text-muted-foreground">
          {STEP_LABELS[step]} — étape {effectiveStep + 1}/{totalSteps}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= effectiveStep ? 'bg-brand' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* ── STEP 0 : Catégorie ── */}
      {step === 0 && (
        <div className="space-y-2.5">
          <p className="font-semibold mb-4">Qu'est-ce que tu vends ?</p>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => { set('category', cat.value); set('subcat', ''); set('brand', ''); set('size', '') }}
                className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer ${
                  formData.category === cat.value
                    ? 'border-brand bg-brand-50 dark:bg-brand-800/20'
                    : 'border-border hover:border-brand/40 hover:bg-muted/40'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors duration-150 ${
                  formData.category === cat.value ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
                {formData.category === cat.value && <Check className="h-4 w-4 text-brand flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {/* ── STEP 1 : Sous-catégorie ── */}
      {step === 1 && formData.category && SUBCATEGORIES[formData.category] && (
        <div>
          <p className="font-semibold mb-4">
            Quel type de {CATEGORIES.find(c => c.value === formData.category)?.label.toLowerCase()} ?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUBCATEGORIES[formData.category].map(sub => (
              <button
                key={sub.value}
                onClick={() => { set('subcat', sub.value); set('brand', ''); set('size', '') }}
                className={`rounded-2xl border px-4 py-3.5 text-sm font-medium text-left transition-all duration-150 cursor-pointer ${
                  formData.subcat === sub.value
                    ? 'border-brand bg-brand-50 dark:bg-brand-800/20 text-brand'
                    : 'border-border hover:border-brand/40 hover:bg-muted/40'
                }`}
              >
                {sub.label}
                {formData.subcat === sub.value && <Check className="h-3.5 w-3.5 inline ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2 : Marque ── */}
      {step === 2 && (
        <div>
          <p className="font-semibold mb-4">Quelle est la marque ?</p>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              placeholder="Rechercher une marque…"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
            />
            {brandSearch && (
              <button onClick={() => setBrandSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Brand grid - scrollable */}
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              {brands.length === 0 ? (
                <p className="col-span-2 text-center py-6 text-sm text-muted-foreground">Aucun résultat</p>
              ) : brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => set('brand', brand)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all duration-150 cursor-pointer ${
                    formData.brand === brand
                      ? 'border-brand bg-brand-50 dark:bg-brand-800/20 text-brand'
                      : 'border-border hover:border-brand/40 hover:bg-muted/40'
                  }`}
                >
                  {brand}
                  {formData.brand === brand && <Check className="h-3.5 w-3.5 inline ml-1.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Titre + Taille ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre de l'annonce</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => set('title', e.target.value)}
              placeholder={`Ex. : ${formData.brand} ${SUBCATEGORIES[formData.category]?.find(s => s.value === formData.subcat)?.label ?? CATEGORIES.find(c => c.value === formData.category)?.label ?? ''} — bon état`}
            />
            <p className="text-xs text-muted-foreground">Sois précis : marque, modèle, couleur, état.</p>
          </div>

          <div className="space-y-2">
            <Label>Taille</Label>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => set('size', size)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    formData.size === size
                      ? 'border-brand bg-brand-50 dark:bg-brand-800/20 text-brand'
                      : 'border-border hover:border-brand/40'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 : État + Prix ── */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>État de l'article</Label>
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                onClick={() => set('condition', c.value)}
                className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                  formData.condition === c.value
                    ? 'border-brand bg-brand-50 dark:bg-brand-800/20'
                    : 'border-border hover:border-brand/40 hover:bg-muted/40'
                }`}
              >
                {formData.condition === c.value
                  ? <Check className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                  : <div className="h-4 w-4 rounded-full border border-muted-foreground mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Prix</Label>
            <div className="relative max-w-xs">
              <Input
                id="price"
                type="number"
                min="1"
                value={formData.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">€</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <textarea
              id="desc"
              value={formData.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Décris l'article : couleur, état détaillé, raison de la vente…"
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40 resize-none transition-shadow"
            />
          </div>
        </div>
      )}

      {/* ── STEP 5 : Photos ── */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Photos de l'article</p>
            <p className="text-sm text-muted-foreground mt-0.5">Minimum 1, maximum 5. La première sera la photo principale.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {formData.photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                <Image src={URL.createObjectURL(photo)} alt="" fill className="object-cover" />
                <button
                  onClick={() => set('photos', formData.photos.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer hover:bg-black/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {formData.photos.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-brand flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ajouter</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 6 : Récapitulatif ── */}
      {step === 6 && (() => {
        const condColor: Record<string, string> = {
          Neuf:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          Comme_neuf:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          Bon_etat:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          Moyen_etat:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          Mauvais_etat: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        }
        const condLabel = CONDITIONS.find(c => c.value === formData.condition)?.label ?? ''
        const catLabel  = CATEGORIES.find(c => c.value === formData.category)?.label ?? ''
        const subcatLabel = formData.subcat
          ? SUBCATEGORIES[formData.category]?.find(s => s.value === formData.subcat)?.label
          : null
        const mainPhoto = formData.photos[0] ? URL.createObjectURL(formData.photos[0]) : null

        return (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Aperçu de ton annonce</p>
              <p className="text-xs text-muted-foreground mt-0.5">C'est ainsi qu'elle apparaîtra sur FlipIt.</p>
            </div>

            {/* Card preview */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">

              {/* Photo principale */}
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {mainPhoto ? (
                  <Image src={mainPhoto} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Aucune photo
                  </div>
                )}
                {/* Condition badge */}
                <span className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${condColor[formData.condition] ?? 'bg-muted text-muted-foreground'}`}>
                  {condLabel}
                </span>
                {/* Photos count */}
                {formData.photos.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white font-medium">
                    {formData.photos.length} photos
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="divide-y divide-border">

                {/* Catégorie + marque */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-50 dark:bg-brand-800/20 border border-brand-100 dark:border-brand-800/40 px-2.5 py-0.5 text-xs font-semibold text-brand">
                      {catLabel}{subcatLabel ? ` · ${subcatLabel}` : ''}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                      {formData.brand}
                    </span>
                  </div>
                  <button
                    onClick={() => setStep(hasSubcat(formData.category) ? 1 : 0)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors cursor-pointer ml-3 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

                {/* Titre + prix */}
                <div className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="font-display text-base font-bold leading-snug">{formData.title || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Taille {formData.size}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xl font-bold tabular-nums">{formData.price} €</p>
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Modifier
                    </button>
                  </div>
                </div>

                {/* État + description */}
                <div className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${condColor[formData.condition] ?? 'bg-muted text-muted-foreground'}`}>
                      {condLabel}
                    </span>
                    {formData.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{formData.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep(4)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

                {/* Photos */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex gap-2 overflow-x-auto">
                    {formData.photos.map((p, i) => (
                      <div key={i} className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden border border-border">
                        <Image src={URL.createObjectURL(p)} alt="" width={48} height={48} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep(5)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand transition-colors cursor-pointer ml-3 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Tu pourras modifier ou supprimer cette annonce depuis tes paramètres.
            </p>
          </div>
        )
      })()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={prev}
          disabled={step === 0}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>

        {step < 6 ? (
          <Button
            onClick={next}
            disabled={!canNext()}
            className="bg-brand hover:bg-brand-700 text-white cursor-pointer min-w-[120px]"
          >
            Continuer
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-brand hover:bg-brand-700 text-white cursor-pointer min-w-[150px]"
          >
            {submitting ? 'Publication…' : 'Publier l\'annonce'}
          </Button>
        )}
      </div>
    </div>
  )
}
