import Link from 'next/link'
import { GitBranch, Mail } from 'lucide-react'

const links = {
  categories: [
    { label: 'Decks',      href: '/?cat=Deck' },
    { label: 'Trucks',     href: '/?cat=Truck' },
    { label: 'Roues',      href: '/?cat=Roue' },
    { label: 'Chaussures', href: '/?cat=Chaussure' },
    { label: 'Vêtements',  href: '/?cat=Vetement' },
    { label: 'Accessoires',href: '/?cat=Accessoire' },
  ],
  infos: [
    { label: 'À propos',        href: '/about' },
    { label: 'Contact',         href: '/contact' },
    { label: 'Confidentialité', href: '/privacy' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-3">
              <span className="font-display text-xl font-bold tracking-tight">
                Flip<span className="text-brand">It</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La marketplace du skate d'occasion entre passionnés. Achète, vends, ride.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="mailto:lucas12negre@gmail.com"
                aria-label="Email"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand hover:text-brand transition-colors duration-150"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/LucasNGRE/FlipIt"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand hover:text-brand transition-colors duration-150"
              >
                <GitBranch className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Catégories */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-4">Catégories</p>
            <ul className="space-y-2.5">
              {links.categories.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Infos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-4">Informations</p>
            <ul className="space-y-2.5">
              {links.infos.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-4">Vendre</p>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Dépose une annonce en moins de 2 minutes.
            </p>
            <Link
              href="/items/add-item"
              className="inline-flex items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors duration-200"
            >
              Publier une annonce
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} FlipIt. Tous droits réservés.</p>
          <p>Fait par des skateurs, pour des skateurs.</p>
        </div>
      </div>
    </footer>
  )
}
