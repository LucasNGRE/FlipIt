import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    // Reproduit l'alias `@/*` déclaré dans tsconfig.json
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Aucun test n'accède au réseau ni à une base de données :
    // la couche Prisma, Pusher et Stripe sont systématiquement mockées.
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/db.ts', 'lib/pusher-*.ts', 'lib/stripe.ts', 'lib/auth.ts'],
    },
  },
})
