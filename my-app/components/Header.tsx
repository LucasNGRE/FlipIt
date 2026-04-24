'use client'

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, CirclePlus, Mail, Search, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { ModeToggle } from './toggle.mode';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function useUnreadCount(status: string) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') return
    let pusher: any
    let channel: any
    let userId: number | null = null

    const fetchCount = () =>
      fetch('/api/messages/unread').then(r => r.ok ? r.json() : { count: 0 }).then(d => setCount(d.count))

    fetch('/api/user').then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.[0]) return
      userId = data[0].id
      fetchCount()
      import('pusher-js').then(({ default: Pusher }) => {
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: '/api/pusher/auth',
        })
        channel = pusher.subscribe(`private-user-${userId}`)
        channel.bind('new-conversation-message', () => fetchCount())
      })
    })

    const onRead = () => fetchCount()
    window.addEventListener('conversation-read', onRead)

    return () => {
      window.removeEventListener('conversation-read', onRead)
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [status])

  return count
}

interface NavCategory {
  label: string;
  cat: string;
  columns: { heading: string; links: { label: string; q: string }[] }[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: 'Decks',
    cat: 'Deck',
    columns: [
      {
        heading: 'Par marque',
        links: [
          { label: 'Powell Peralta', q: 'powell' },
          { label: 'Element',        q: 'element' },
          { label: 'Baker',          q: 'baker' },
          { label: 'Santa Cruz',     q: 'santa cruz' },
          { label: 'Primitive',      q: 'primitive' },
        ],
      },
      {
        heading: 'Par taille',
        links: [
          { label: '7.75"', q: '7.75' },
          { label: '8.0"',  q: '8.0' },
          { label: '8.25"', q: '8.25' },
          { label: '8.5"',  q: '8.5' },
        ],
      },
    ],
  },
  {
    label: 'Trucks',
    cat: 'Truck',
    columns: [
      {
        heading: 'Par marque',
        links: [
          { label: 'Independent', q: 'independent' },
          { label: 'Thunder',     q: 'thunder' },
          { label: 'Venture',     q: 'venture' },
          { label: 'Ace',         q: 'ace' },
        ],
      },
      {
        heading: 'Par taille',
        links: [
          { label: '129 mm', q: '129' },
          { label: '139 mm', q: '139' },
          { label: '149 mm', q: '149' },
          { label: '169 mm', q: '169' },
        ],
      },
    ],
  },
  {
    label: 'Roues',
    cat: 'Roue',
    columns: [
      {
        heading: 'Par marque',
        links: [
          { label: 'Spitfire',  q: 'spitfire' },
          { label: 'Bones',     q: 'bones' },
          { label: 'OJ Wheels', q: 'oj' },
          { label: 'Ricta',     q: 'ricta' },
        ],
      },
      {
        heading: 'Par diamètre',
        links: [
          { label: '50 – 52 mm', q: '52' },
          { label: '53 – 54 mm', q: '54' },
          { label: '55 mm +',    q: '55' },
        ],
      },
    ],
  },
  {
    label: 'Chaussures',
    cat: 'Chaussure',
    columns: [
      {
        heading: 'Par marque',
        links: [
          { label: 'Vans',     q: 'vans' },
          { label: 'Nike SB',  q: 'nike' },
          { label: 'DC Shoes', q: 'dc' },
          { label: 'Emerica',  q: 'emerica' },
          { label: 'Etnies',   q: 'etnies' },
        ],
      },
    ],
  },
];

function MegaMenuNav({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (label: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(label);
  };

  const handleLeave = () => {
    timerRef.current = setTimeout(() => setOpen(null), 120);
  };

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
      {NAV_CATEGORIES.map(cat => (
        <div
          key={cat.label}
          className="relative"
          onMouseEnter={() => handleEnter(cat.label)}
          onMouseLeave={handleLeave}
        >
          {/* Trigger */}
          <Link
            href={`/?cat=${cat.cat}`}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer ${
              open === cat.label ? 'text-foreground bg-muted' : 'hover:text-foreground hover:bg-muted'
            }`}
          >
            {cat.label}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open === cat.label ? 'rotate-180' : ''}`} />
          </Link>

          {/* Dropdown panel */}
          {open === cat.label && (
            <div
              className="absolute top-full left-0 mt-1 z-50 rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-xl p-5 flex gap-8 min-w-[300px]"
              onMouseEnter={() => handleEnter(cat.label)}
              onMouseLeave={handleLeave}
            >
              {cat.columns.map(col => (
                <div key={col.heading} className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map(link => (
                      <li key={link.label}>
                        <Link
                          href={`/?cat=${cat.cat}&q=${encodeURIComponent(link.q)}`}
                          onClick={() => { setOpen(null); onNavigate(); }}
                          className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 inline-block transition-all duration-150"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

const Header = () => {
  const { status } = useSession();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const unreadCount = useUnreadCount(status);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-display text-2xl font-bold tracking-tight">
              Flip<span className="text-brand">It</span>
            </span>
          </Link>

          {/* Mega menu nav */}
          <MegaMenuNav onNavigate={() => setSearchValue('')} />

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex flex-1 max-w-sm items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground focus-within:border-brand focus-within:bg-background transition-all duration-200">
            <Search className="h-4 w-4 flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {status === 'authenticated' && (
              <Link href="/items/add-item">
                <button className="hidden sm:flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors duration-200 cursor-pointer">
                  <CirclePlus className="h-4 w-4" />
                  Vendre
                </button>
              </Link>
            )}

            {status === 'authenticated' && (
              <>
                <Link href="/inbox" aria-label="Messagerie" className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors duration-150 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <button aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors duration-150 cursor-pointer">
                  <Bell className="h-4 w-4" />
                </button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Mon compte" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors duration-150 cursor-pointer">
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {status === 'authenticated' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" /> Paramètres
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" /> Déconnexion
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="cursor-pointer">Connexion</Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
