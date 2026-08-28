/**
 * Génération des captures d'écran pour le dossier CDA.
 *
 * Usage : npm run dev  (dans un autre terminal), puis
 *         node scripts/captures.mjs
 *
 * Sécurité / effets de bord :
 *  - le script lit ADMIN_PASSWORD depuis .env.local mais ne l'affiche jamais ;
 *  - aucune écriture en base : les formulaires de création, de signalement et
 *    d'offre sont ouverts et renseignés, mais jamais soumis ;
 *  - la dernière capture (blocage du login admin) sature volontairement le
 *    compteur de tentatives, qui vit en mémoire du serveur de développement.
 *    Redémarrer `npm run dev` remet ce compteur à zéro.
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.resolve('../dossier-sources/captures')
fs.mkdirSync(OUT, { recursive: true })

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
)

const USER = { email: 'lucas@flipit.com', password: 'Password123!' }
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(Number)) : null

const results = []
let browser

async function shot(page, num, slug, label, opts = {}) {
  const file = `${String(num).padStart(2, '0')}_${slug}.png`
  await page.screenshot({ path: path.join(OUT, file), fullPage: opts.fullPage ?? false })
  results.push({ num, file, label, status: 'OK' })
  console.log(`  ✓ ${file}`)
}

async function capture(num, slug, label, fn, opts = {}) {
  if (ONLY && !ONLY.has(num)) return
  const ctx = await browser.newContext({
    viewport: opts.mobile ? MOBILE : DESKTOP,
    colorScheme: opts.dark ? 'dark' : 'light',
    storageState: opts.state ?? undefined,
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  try {
    await fn(page)
    await shot(page, num, slug, label, opts)
  } catch (err) {
    results.push({ num, file: null, label, status: 'ECHEC', error: err.message.split('\n')[0].slice(0, 120) })
    console.log(`  ✗ ${String(num).padStart(2, '0')}_${slug} — ${err.message.split('\n')[0].slice(0, 100)}`)
  } finally {
    await ctx.close()
  }
}

/** Attend la fin du chargement et neutralise la modal portfolio si présente. */
async function ready(page, url, { skipModal = false } = {}) {
  await page.addInitScript(() => {
    try { localStorage.setItem('flipit_portfolio_seen', '1') } catch {}
  })
  // domcontentloaded plutôt que networkidle : la page d'accueil garde des
  // connexions ouvertes (Pusher) et charge des images base64 volumineuses,
  // networkidle n'y est jamais atteint.
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {})
  if (!skipModal) {
    const close = page.locator('[role="dialog"] button').first()
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {})
  }
  await page.waitForTimeout(700)
}

/** Ouvre une session membre et renvoie l'état de stockage réutilisable. */
async function loginMember() {
  const ctx = await browser.newContext({ viewport: DESKTOP })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try { localStorage.setItem('flipit_portfolio_seen', '1') } catch {}
  })
  await ready(page, '/login')
  // Laisse React s'hydrater : un fill() avant hydratation renseigne le DOM
  // sans mettre à jour l'état du composant, et le formulaire part vide.
  await page.waitForTimeout(2500)
  await page.locator('#email').fill(USER.email)
  await page.locator('#password').fill(USER.password)
  await page.waitForTimeout(300)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForTimeout(1500)
  const state = path.join(OUT, '.member.json')
  await ctx.storageState({ path: state })
  await ctx.close()
  console.log('  → session membre ouverte (lucas@flipit.com)')
  return state
}

/** Ouvre une session administrateur et renvoie l'état de stockage. */
async function loginAdmin() {
  if (!env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD absent de .env.local')
  const ctx = await browser.newContext({ viewport: DESKTOP })
  const page = await ctx.newPage()
  // La modal portfolio est montée sur toutes les pages et intercepte les clics.
  await ready(page, '/admin/login', { skipModal: true })
  await page.locator('input[type="password"]').fill(env.ADMIN_PASSWORD)
  await page.getByRole('button', { name: /accéder/i }).click()
  await page.waitForURL(u => !u.pathname.includes('/admin/login'), { timeout: 20000 })
  await page.waitForTimeout(1500)
  const state = path.join(OUT, '.admin.json')
  await ctx.storageState({ path: state })
  await ctx.close()
  console.log('  → session administrateur ouverte')
  return state
}

;(async () => {
  browser = await chromium.launch()
  console.log('\n== Pages publiques ==')

  await capture(1, 'accueil', "Page d'accueil — bannière et grille d'annonces",
    p => ready(p, '/'), { fullPage: true })

  await capture(2, 'accueil_filtre_categorie', 'Accueil filtré sur une catégorie',
    async p => { await ready(p, '/?cat=Deck'); await p.waitForTimeout(1200) })

  await capture(3, 'accueil_mobile', 'Accueil en largeur mobile (390 px)',
    p => ready(p, '/'), { mobile: true, fullPage: true })

  await capture(4, 'article_detail', "Fiche détaillée d'une annonce",
    p => ready(p, '/article/2'), { fullPage: true })

  await capture(5, 'article_mobile', 'Fiche annonce en largeur mobile',
    p => ready(p, '/article/2'), { mobile: true, fullPage: true })

  await capture(6, 'profil_vendeur', 'Profil public vendeur et ses annonces',
    p => ready(p, '/profile/2'), { fullPage: true })

  await capture(7, 'login', 'Connexion — identifiants ou Google',
    p => ready(p, '/login'))

  await capture(8, 'register', 'Inscription',
    p => ready(p, '/register'), { fullPage: true })

  await capture(9, 'register_erreur_validation', 'Inscription — erreurs de validation affichées',
    async p => {
      await ready(p, '/register')
      await p.locator('#email').fill('adresse-invalide')
      const pwd = p.locator('#password')
      if (await pwd.count()) await pwd.fill('123')
      await p.locator('button[type="submit"]').first().click().catch(() => {})
      await p.waitForTimeout(1200)
    }, { fullPage: true })

  await capture(10, 'about', 'Page À propos',
    p => ready(p, '/about'), { fullPage: true })

  await capture(11, 'privacy', 'Politique de confidentialité',
    p => ready(p, '/privacy'), { fullPage: true })

  await capture(12, 'contact', 'Page Contact',
    p => ready(p, '/contact'), { fullPage: true })

  await capture(13, 'accueil_theme_sombre', 'Accueil en thème sombre',
    p => ready(p, '/'), { dark: true, fullPage: true })

  await capture(14, 'article_theme_sombre', 'Fiche annonce en thème sombre',
    p => ready(p, '/article/2'), { dark: true, fullPage: true })

  await capture(15, 'modal_portfolio', 'Modal d\'avertissement « site de démonstration »',
    async p => {
      await p.goto(BASE + '/', { waitUntil: 'networkidle' })
      await p.waitForTimeout(1800)
    })

  console.log('\n== Espace membre ==')
  let member = null
  try {
    if (ONLY && ![16,17,18,19,20,21,22,23,24,25].some(n => ONLY.has(n))) throw new Error('section ignoree')
    member = await loginMember()
  } catch (e) {
    console.log('  ✗ connexion membre impossible :', e.message.split('\n')[0].slice(0, 100))
  }

  if (member) {
    await capture(16, 'signalement_modal', 'Modal de signalement ouverte',
      async p => {
        await ready(p, '/article/2')
        await p.getByRole('button', { name: /signaler/i }).first().click()
        await p.waitForTimeout(900)
      }, { state: member })

    await capture(17, 'inbox_conversation', 'Messagerie — conversation ouverte',
      async p => { await ready(p, '/inbox?c=3&p=17'); await p.waitForTimeout(2000) },
      { state: member })

    await capture(18, 'inbox_mobile', 'Messagerie en largeur mobile',
      async p => { await ready(p, '/inbox?c=3&p=17'); await p.waitForTimeout(2000) },
      { state: member, mobile: true })

    await capture(19, 'offre_dialog', 'Dialogue « Faire une offre »',
      async p => {
        await ready(p, '/inbox?c=3&p=17')
        await p.waitForTimeout(1800)
        await p.getByRole('button', { name: /offre|proposer/i }).first().click()
        await p.waitForTimeout(900)
      }, { state: member })

    await capture(20, 'add_item_etape1', "Création d'annonce — étape 1 (catégorie)",
      async p => { await ready(p, '/items/add-item'); await p.waitForTimeout(1200) },
      { state: member, fullPage: true })

    await capture(21, 'likes', 'Annonces mises en favori',
      p => ready(p, '/likes'), { state: member, fullPage: true })

    await capture(22, 'orders', 'Suivi des commandes',
      p => ready(p, '/orders'), { state: member, fullPage: true })

    await capture(23, 'settings', 'Paramètres du compte',
      p => ready(p, '/settings'), { state: member, fullPage: true })

    await capture(24, 'seller_onboarding', 'Activation du compte vendeur Stripe Connect',
      p => ready(p, '/profile/seller-onboarding'), { state: member, fullPage: true })

    await capture(25, 'header_menu_mobile', 'Menu de navigation mobile déployé',
      async p => {
        await ready(p, '/')
        await p.getByRole('button', { name: /menu|ouvrir/i }).first().click().catch(async () => {
          await p.locator('header button').last().click()
        })
        await p.waitForTimeout(800)
      }, { state: member, mobile: true })
  }

  console.log('\n== Espace administration ==')
  await capture(26, 'admin_login', 'Connexion administrateur',
    p => ready(p, '/admin/login', { skipModal: true }))

  let admin = null
  try {
    if (ONLY && !Array.from({length:12},(_,i)=>i+26).some(n => ONLY.has(n))) throw new Error('section ignoree')
    admin = await loginAdmin()
  } catch (e) {
    console.log('  ✗ connexion admin impossible :', e.message.split('\n')[0].slice(0, 100))
  }

  if (admin) {
    const pages = [
      [27, 'admin_dashboard', '/admin', 'Tableau de bord administrateur'],
      [28, 'admin_users', '/admin/users', 'Gestion des utilisateurs'],
      [29, 'admin_products', '/admin/products', 'Gestion des annonces'],
      [30, 'admin_reports', '/admin/reports', 'Signalements regroupés par cible'],
      [31, 'admin_orders', '/admin/orders', 'Commandes et actions financières'],
      [32, 'admin_disputes', '/admin/disputes', 'Litiges'],
      [33, 'admin_chargebacks', '/admin/chargebacks', 'Impayés Stripe'],
      [34, 'admin_finances', '/admin/finances', 'Vue financière'],
      [35, 'admin_logs', '/admin/logs', 'Journal des actions administrateur'],
      [36, 'admin_search', '/admin/search', 'Recherche globale'],
    ]
    for (const [num, slug, url, label] of pages) {
      await capture(num, slug, label,
        async p => { await ready(p, url, { skipModal: true }); await p.waitForTimeout(1400) },
        { state: admin, fullPage: true })
    }

    await capture(37, 'admin_mobile_drawer', 'Administration — tiroir de navigation mobile',
      async p => {
        await ready(p, '/admin', { skipModal: true })
        await p.locator('button').first().click().catch(() => {})
        await p.waitForTimeout(800)
      }, { state: admin, mobile: true })
  }

  // En dernier : sature le compteur de tentatives (mémoire du serveur de dev).
  await capture(38, 'admin_rate_limit', 'Blocage après 5 tentatives de connexion admin',
    async p => {
      await ready(p, '/admin/login', { skipModal: true })
      for (let i = 0; i < 6; i++) {
        await p.locator('input[type="password"]').fill('mot-de-passe-errone-' + i)
        await p.getByRole('button', { name: /accéder/i }).click()
        await p.waitForTimeout(1100)
      }
      await p.waitForTimeout(600)
    })

  await browser.close()

  for (const f of ['.member.json', '.admin.json']) {
    const p = path.join(OUT, f)
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }

  const ok = results.filter(r => r.status === 'OK')
  const ko = results.filter(r => r.status !== 'OK')
  console.log(`\n===== ${ok.length} captures réussies, ${ko.length} échecs =====`)
  ko.forEach(r => console.log(`  ✗ ${r.num} ${r.label} — ${r.error}`))

  fs.writeFileSync(
    path.join(OUT, 'index.json'),
    JSON.stringify({ date: new Date().toISOString(), results }, null, 2)
  )
})().catch(async e => {
  console.error('ERREUR FATALE', e)
  if (browser) await browser.close()
  process.exit(1)
})
