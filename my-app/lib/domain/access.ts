/**
 * Contrôles d'accès transverses : session admin et authentification du cron.
 *
 * Ces fonctions durcissent volontairement la comparaison naïve utilisée
 * dans les routes (`cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`),
 * qui accorde l'accès lorsque le secret attendu est absent de
 * l'environnement : `undefined !== undefined` vaut `false`.
 */

/**
 * Vrai uniquement si un jeton attendu non vide est configuré ET que le jeton
 * présenté lui est identique.
 */
export function isValidAdminToken(
  presented: string | undefined | null,
  expected: string | undefined | null
): boolean {
  if (!expected) return false
  if (!presented) return false
  return presented === expected
}

/**
 * Vrai uniquement si l'en-tête `Authorization` porte exactement
 * `Bearer <CRON_SECRET>` et qu'un secret non vide est configuré.
 */
export function isCronAuthorized(
  authorizationHeader: string | undefined | null,
  secret: string | undefined | null
): boolean {
  if (!secret) return false
  if (!authorizationHeader) return false
  return authorizationHeader === `Bearer ${secret}`
}
