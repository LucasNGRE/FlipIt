import prisma from '@/lib/db'

export async function logAdmin(action: string, target?: string, details?: string) {
  try {
    await prisma.adminLog.create({ data: { action, target, details } })
  } catch {
    // non-blocking
  }
}
