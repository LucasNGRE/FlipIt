import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import LandingHero from "@/components/Banner"
import SkateArticleGrid from "@/components/Articles/ArticleGrid"
import Marquee from "@/components/Marquee"
import prisma from "@/lib/db"

const ACID_MARQUEE = ['skate', 'share', 'repeat', '— la session ne s\'arrête jamais —']

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

  // Fetch one product image per category for card backgrounds
  const categoryProducts = await prisma.product.findMany({
    where: {
      category: { in: ['Deck', 'Truck', 'Roue', 'Chaussure', 'Vetement', 'Accessoire'] as any[] },
      suspended: false,
      status: { not: 'sold' },
      images: { some: {} },
    },
    select: { category: true, images: { select: { url: true }, take: 1 } },
    distinct: ['category'],
    orderBy: { createdAt: 'desc' },
  })

  const imageMap: Record<string, string> = {}
  for (const p of categoryProducts) {
    if (p.category && p.images[0]) imageMap[p.category] = p.images[0].url
  }

  const categories = CATEGORY_DEFS.map(c => ({
    ...c,
    count: (countMap[c.cat] ?? 0).toLocaleString('fr-FR'),
    image: imageMap[c.cat] ?? null,
  }))

  return (
    <div>
      {/* Hero + stats + marquee */}
      <LandingHero />

      {/* ── Drops du jour ──────────────────────────────── */}
      <section className="mx-auto px-4 sm:px-8 pt-12 pb-2" style={{ maxWidth: 1440 }}>
        <SkateArticleGrid />
      </section>

      {/* ── Catégories ──────────────────────────────────── */}
      <section className="mx-auto px-4 sm:px-8 pt-12 pb-6" style={{ maxWidth: 1440 }}>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map(c => (
            <Link key={c.name} href={`/?cat=${c.cat}`}>
              <div
                className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl group"
                style={{
                  height: 200,
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--ink)',
                  background: c.image ? 'var(--ink)' : c.accent ? 'var(--acid)' : 'var(--ink)',
                }}
              >
                {/* Product photo background */}
                {c.image && (
                  <>
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(10,10,10,.7) 30%, rgba(10,10,10,.0) 100%)' }}
                    />
                  </>
                )}

                {/* Acid badge top-left for accent card without photo */}
                {!c.image && c.accent && (
                  <div className="absolute inset-0" style={{ background: 'var(--acid)' }} />
                )}

                {/* Text */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div
                    className="font-display font-extrabold leading-none"
                    style={{
                      fontSize: 20,
                      letterSpacing: '-.02em',
                      color: c.image || !c.accent ? 'var(--paper)' : 'var(--ink)',
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="font-mono text-[10px] mt-1 uppercase tracking-widest"
                    style={{ color: c.image || !c.accent ? 'rgba(245,243,238,.55)' : 'rgba(0,0,0,.5)' }}
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
      <section className="mx-auto px-4 sm:px-8 pt-12 pb-6" style={{ maxWidth: 1440 }}>
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
        <Marquee
          items={ACID_MARQUEE}
          speed="normal"
          repeat={3}
          background="var(--acid)"
          color="var(--ink)"
          borderColor="var(--ink)"
        />
      </section>
    </div>
  )
}
