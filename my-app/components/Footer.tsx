import Link from 'next/link'

const columns = [
  {
    title: 'Explorer',
    items: [
      { label: 'Accueil',           href: '/' },
      { label: 'Decks',             href: '/?cat=Deck' },
      { label: 'Trucks',            href: '/?cat=Truck' },
      { label: 'Roues',             href: '/?cat=Roue' },
      { label: 'Chaussures',        href: '/?cat=Chaussure' },
    ],
  },
  {
    title: 'Vendre',
    items: [
      { label: 'Créer une annonce', href: '/items/add-item' },
      { label: 'Mes annonces',      href: '/items' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { label: 'Connexion',         href: '/login' },
      { label: 'Inscription',       href: '/register' },
      { label: 'Messages',          href: '/inbox' },
      { label: 'Paramètres',        href: '/settings' },
    ],
  },
  {
    title: 'Infos',
    items: [
      { label: 'À propos',          href: '/about' },
      { label: 'Contact',           href: '/contact' },
      { label: 'Confidentialité',   href: '/privacy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--paper)' }} className="mt-20 px-4 sm:px-8 pt-16 pb-6">
      <div className="mx-auto" style={{ maxWidth: 1440 }}>

        {/* Giant wordmark */}
        <div
          className="font-logo pb-8 border-b select-none"
          style={{
            fontSize: 'clamp(64px, 11vw, 180px)',
            letterSpacing: '-.04em',
            lineHeight: .85,
            borderColor: 'rgba(255,255,255,.1)',
          }}
        >
          <span>FL</span>
          <span className="animate-flip-i inline-block">I</span>
          <span>P</span>
          <span
            className="ml-[.04em] px-[.08em]"
            style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >IT</span>
          <span>.</span>
        </div>

        {/* 5-col grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] py-10 gap-8">
          {/* Brand blurb */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <p
              className="font-display font-semibold leading-[1.2] max-w-xs"
              style={{ fontSize: 22, letterSpacing: '-.02em' }}
            >
              Achète et revends ton matos skate.<br />
              <span style={{ color: 'var(--acid)' }}>Simple, rapide, entre passionnés.</span>
            </p>
          </div>

          {/* Link columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h4
                className="font-mono text-[10px] uppercase tracking-[.12em] mb-3.5"
                style={{ color: 'var(--acid)' }}
              >
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2">
                {col.items.map(item => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-[13px] opacity-75 hover:opacity-100 transition-opacity duration-150"
                      style={{ color: 'var(--paper)' }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="border-t flex items-center justify-between pt-5 font-mono text-[11px]"
          style={{ borderColor: 'rgba(255,255,255,.1)', color: 'rgba(245,243,238,.5)' }}
        >
          <span>© 2026 FLIPIT — Conçu &amp; développé par LucasNGRE.</span>
          <span>v0.4 · BETA</span>
        </div>

      </div>
    </footer>
  )
}
