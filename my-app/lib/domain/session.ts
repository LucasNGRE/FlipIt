/**
 * Résolution de l'identifiant utilisateur porté par le JWT de session.
 *
 * Contexte du défaut corrigé : le callback `jwt` de `lib/auth.ts` plaçait
 * `user.id` dans `token.sub` sans distinguer le fournisseur. Pour une connexion
 * par identifiants, `authorize()` renvoie déjà l'identifiant numérique en base ;
 * pour une connexion Google, `user.id` est le `sub` OAuth (une vingtaine de
 * chiffres attribués par Google), sans rapport avec la base.
 *
 * Toutes les routes faisant `Number(session.user.id)` puis comparant aux
 * identifiants en base, un utilisateur Google ne pouvait gérer ni ses annonces
 * ni ses commandes.
 *
 * La stratégie retenue reprend celle déjà employée par
 * `app/api/pusher/auth/route.ts`, seul endroit du code qui fonctionnait pour les
 * deux types de compte : résoudre l'utilisateur par son adresse e-mail.
 *
 * La dépendance à la base est injectée afin que cette logique reste testable
 * sans accès réseau.
 */

/** Fournisseur d'authentification tel que NextAuth le transmet. */
export type AuthProvider = 'credentials' | 'google' | (string & {})

export interface SessionUserLike {
  id?: string | null
  email?: string | null
}

export interface ResolveTokenSubjectParams {
  provider: AuthProvider | undefined
  user: SessionUserLike
  /** Recherche de l'utilisateur en base par e-mail (injectée). */
  findUserByEmail: (email: string) => Promise<{ id: number } | null>
}

export interface ResolveTokenSubjectResult {
  /** Valeur à placer dans `token.sub`, ou `null` si elle ne peut être déterminée. */
  sub: string | null
  /** Motif d'échec, à journaliser côté serveur. */
  error?: string
}

/**
 * Détermine l'identifiant à inscrire dans le jeton de session.
 *
 * - connexion par identifiants : `user.id` est déjà l'identifiant en base,
 *   il est conservé tel quel (comportement inchangé) ;
 * - connexion Google : l'identifiant en base est résolu par e-mail. Le compte
 *   a été créé au préalable par le callback `signIn`, qui recherche lui aussi
 *   par e-mail — un compte par identifiants existant est donc réutilisé, sans
 *   création de doublon.
 */
export async function resolveTokenSubject(
  params: ResolveTokenSubjectParams
): Promise<ResolveTokenSubjectResult> {
  const { provider, user, findUserByEmail } = params

  if (provider !== 'google') {
    if (!user.id) return { sub: null, error: 'Identifiant utilisateur absent' }
    return { sub: String(user.id) }
  }

  const email = user.email?.trim()
  if (!email) {
    return { sub: null, error: 'Adresse e-mail absente du profil Google' }
  }

  const dbUser = await findUserByEmail(email)
  if (!dbUser) {
    // Ne devrait pas se produire : le callback `signIn` crée le compte avant
    // que `jwt` ne soit appelé. Signalé plutôt que masqué.
    return { sub: null, error: `Aucun utilisateur en base pour l'e-mail ${email}` }
  }

  return { sub: String(dbUser.id) }
}

/**
 * Vrai si la valeur ressemble à un identifiant en base (entier positif) et non
 * à un `sub` OAuth. Utilisé pour diagnostiquer une session mal formée.
 */
export function isDatabaseUserId(value: unknown): boolean {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0
  if (typeof value !== 'string' || value.trim() === '') return false
  return /^[0-9]+$/.test(value) && Number(value) > 0 && Number.isSafeInteger(Number(value))
}
