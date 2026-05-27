import type { Metadata } from "next"
import Link from "next/link"
import LandingHero from "@/components/Banner"
import SkateArticleGrid from "@/components/Articles/ArticleGrid"
import prisma from "@/lib/db"

export const metadata: Metadata = {
  title: "FlipIt — Marketplace du skate d'occasion",
  description: "Achète et vends du matos de skate entre passionnés.",
}

const CATEGORY_DEFS = [
  { name: 'Decks',       cat: 'Deck',       accent: true  },
  { name: 'Trucks',      cat: 'Truck',      accent: false },
  { name: 'Roues',       cat: 'Roue',       accent: false },
  { name: 'Chaussures',  cat: 'Chaussure',  accent: false },
  { name: 'Vêtements',   cat: 'Vetement',   accent: false },
  { name: 'Accessoires', cat: 'Accessoire', accent: false },
]

export default async function Home() {
  const counts = await prisma.product.groupBy({
    by: ['category'],
    _count: { id: true },
  })

  const countMap: Record<string, number> = {}
  for (const row of counts) {
    if (row.category) countMap[row.category] = row._count.id
  }

  const categories = CATEGORY_DEFS.map(c => ({
    ...c,
    count: (countMap[c.cat] ?? 0).toLocaleString('fr-FR'),
  }))

  return (
    <div>
      {/* Hero + stats + marquee */}
      <LandingHero />

      {/* ── Drops du jour ──────────────────────────────── */}
      <section className="mx-auto px-8 pt-12 pb-2" style={{ maxWidth: 1440 }}>
        <SkateArticleGrid />
      </section>

      {/* ── Catégories ──────────────────────────────────── */}
      <section className="mx-auto px-8 pt-12 pb-6" style={{ maxWidth: 1440 }}>
        <div className="mb-7">
          <div
            className="font-mono text-[11px] uppercase tracking-[.14em]"
            style={{ color: 'var(--concrete-4)' }}
          >
            ↳ PAR TYPE DE MATOS
          </div>
          <h2
            className="font-display font-extrabold mt-2"
            style={{ fontSize: 44, letterSpacing: '-.025em', lineHeight: 1 }}
          >
            Catégories.
          </h2>
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
        >
          {categories.map(c => (
            <Link key={c.name} href={`/?cat=${c.cat}`}>
              <div
                className="overflow-hidden border cursor-pointer transition-all duration-250 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--ink)',
                  background: c.accent ? 'var(--acid)' : 'var(--snow)',
                }}
              >
                <div
                  className="w-full flex items-center justify-center font-mono text-[10px] uppercase tracking-widest"
                  style={{
                    height: 120,
                    background: c.accent ? 'rgba(0,0,0,.08)' : 'var(--ink)',
                    color: c.accent ? 'var(--ink)' : 'var(--acid)',
                  }}
                >
                  {c.name.substring(0, 3).toUpperCase()}
                </div>
                <div className="px-4 py-3.5">
                  <div
                    className="font-display font-bold"
                    style={{ fontSize: 20, letterSpacing: '-.02em' }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="font-mono text-[10px] mt-0.5"
                    style={{ color: 'var(--concrete-3)' }}
                  >
                    {c.count} annonces →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Vendre CTA ──────────────────────────────────── */}
      <section className="mx-auto px-8 pt-12 pb-6" style={{ maxWidth: 1440 }}>
        <div
          className="rounded-[20px] p-10 flex flex-col md:flex-row md:items-center justify-between gap-8"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}
        >
          <div style={{ maxWidth: 540 }}>
            <div
              className="font-mono text-[11px] uppercase tracking-[.14em]"
              style={{ color: 'var(--acid)' }}
            >
              ↳ VENDRE TON MATOS
            </div>
            <h3
              className="font-display font-extrabold mt-3 leading-[.92]"
              style={{ fontSize: 'clamp(32px, 4vw, 56px)', letterSpacing: '-.03em' }}
            >
              Ton setup<br />prend la poussière&nbsp;?
            </h3>
            <p
              className="text-[15px] leading-relaxed mt-4"
              style={{ color: 'rgba(245,243,238,.65)' }}
            >
              Dépose une annonce en 2 minutes. FlipIt prend 5% par vente, jamais sur l'acheteur.
            </p>
          </div>
          <div className="flex flex-col gap-3 min-w-[220px]">
            {[
              '3 photos min · vendu 3× plus vite',
              'Paiement sécurisé + protection acheteur',
              'Mondial Relay, Colissimo ou main propre',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(245,243,238,.6)' }}>
                <span style={{ color: 'var(--acid)' }}>✓</span> {item}
              </div>
            ))}
            <Link href="/items/add-item" className="block mt-4">
              <button
                className="w-full rounded-full py-3.5 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                Publier une annonce →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Marquee (acid) ─────────────────────────────── */}
      <section className="mt-20">
        <div
          className="w-full overflow-hidden border-y py-3"
          style={{ background: 'var(--acid)', borderColor: 'var(--ink)' }}
          aria-hidden="true"
        >
          <div
            className="animate-marquee whitespace-nowrap font-mono text-base uppercase tracking-[.1em]"
            style={{ color: 'var(--ink)' }}
          >
            {['skate', 'share', 'repeat', '— la session ne s\'arrête jamais —',
              'skate', 'share', 'repeat', '— la session ne s\'arrête jamais —'].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4 mx-4">
                {item}
                <span className="opacity-40">·</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
