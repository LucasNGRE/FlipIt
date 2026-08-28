import { describe, it, expect } from 'vitest'
import { isValidAdminToken, isCronAuthorized } from '@/lib/domain/access'

describe('isValidAdminToken — session administrateur', () => {
  it('autorise un jeton identique au secret configuré (cas nominal)', () => {
    expect(isValidAdminToken('secret-attendu', 'secret-attendu')).toBe(true)
  })

  it('refuse un jeton différent', () => {
    expect(isValidAdminToken('mauvais-jeton', 'secret-attendu')).toBe(false)
  })

  it('refuse une requête sans cookie', () => {
    expect(isValidAdminToken(undefined, 'secret-attendu')).toBe(false)
    expect(isValidAdminToken(null, 'secret-attendu')).toBe(false)
    expect(isValidAdminToken('', 'secret-attendu')).toBe(false)
  })

  /**
   * Régression : la comparaison naïve `cookie !== process.env.ADMIN_TOKEN`
   * utilisée dans les routes `/api/admin/*` accorde l'accès lorsque la
   * variable d'environnement est absente, car `undefined !== undefined`
   * est faux. Le helper doit refuser ce cas.
   */
  it('refuse l\'accès quand le secret n\'est pas configuré (faille undefined === undefined)', () => {
    expect(isValidAdminToken(undefined, undefined)).toBe(false)
    expect(isValidAdminToken(undefined, '')).toBe(false)
    expect(isValidAdminToken('', '')).toBe(false)
    expect(isValidAdminToken(null, null)).toBe(false)
  })

  it('refuse tout jeton lorsque le secret est absent, même non vide', () => {
    expect(isValidAdminToken('n-importe-quoi', undefined)).toBe(false)
  })

  it('est sensible à la casse et aux espaces', () => {
    expect(isValidAdminToken('Secret', 'secret')).toBe(false)
    expect(isValidAdminToken(' secret', 'secret')).toBe(false)
  })
})

describe('isCronAuthorized — appel du cron Vercel', () => {
  it('autorise un en-tête Bearer exact (cas nominal)', () => {
    expect(isCronAuthorized('Bearer s3cr3t', 's3cr3t')).toBe(true)
  })

  it('refuse un secret erroné', () => {
    expect(isCronAuthorized('Bearer autre', 's3cr3t')).toBe(false)
  })

  it('refuse un en-tête absent', () => {
    expect(isCronAuthorized(undefined, 's3cr3t')).toBe(false)
    expect(isCronAuthorized(null, 's3cr3t')).toBe(false)
  })

  it('refuse un en-tête mal formé (schéma manquant ou incorrect)', () => {
    expect(isCronAuthorized('s3cr3t', 's3cr3t')).toBe(false)
    expect(isCronAuthorized('Basic s3cr3t', 's3cr3t')).toBe(false)
    expect(isCronAuthorized('bearer s3cr3t', 's3cr3t')).toBe(false)
  })

  it('refuse l\'appel quand CRON_SECRET n\'est pas configuré', () => {
    expect(isCronAuthorized('Bearer undefined', undefined)).toBe(false)
    expect(isCronAuthorized(undefined, undefined)).toBe(false)
  })
})
