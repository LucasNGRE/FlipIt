import { cookies } from 'next/headers'
import { isValidAdminToken } from '@/lib/domain/access'

/**
 * Vérifie la session administrateur à partir du cookie httpOnly `admin_token`.
 *
 * Remplace la comparaison directe `cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`
 * utilisée auparavant dans chaque route : celle-ci accordait l'accès lorsque
 * `ADMIN_TOKEN` était absent de l'environnement, `undefined !== undefined`
 * valant `false`. Le middleware ne protégeant que les PAGES `/admin/*`
 * (matcher `/admin/:path*`), les routes `/api/admin/*` étaient alors
 * entièrement exposées.
 */
export function isAdminRequest(): boolean {
  return isValidAdminToken(cookies().get('admin_token')?.value, process.env.ADMIN_TOKEN)
}
