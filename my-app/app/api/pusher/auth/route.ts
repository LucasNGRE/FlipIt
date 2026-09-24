export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import pusherServer from '@/lib/pusher-server'
import { getSession } from '@/lib/getSession'
import { isAdminRequest } from '@/lib/adminAuth'
import prisma from '@/lib/db'

const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

/**
 * Autorisation d'abonnement aux canaux privés Pusher.
 *
 * Principe : chaque famille de canal est traitée par une branche explicite, et
 * la chaîne se termine par un refus. Aucun canal ne peut atteindre
 * `authorizeChannel` sans avoir été vérifié.
 *
 * `private-admin` est traité AVANT la barrière NextAuth : l'espace
 * d'administration s'appuie sur une session distincte (cookie `admin_token`),
 * un administrateur n'est pas nécessairement authentifié côté NextAuth.
 */
export async function POST(req: Request) {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')
  const channelName = params.get('channel_name')

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // ── Canal d'administration : session admin, indépendante de NextAuth ──
  if (channelName === 'private-admin') {
    if (!isAdminRequest()) return forbidden()
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName))
  }

  // ── Canaux utilisateur : session NextAuth requise ──
  const session = await getSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Résolution par e-mail : fonctionne pour les comptes Credentials comme Google.
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (channelName.startsWith('private-conversation-')) {
    const conversationId = parseInt(channelName.replace('private-conversation-', ''))
    if (!Number.isInteger(conversationId)) return forbidden()

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { id: user.id } } },
    })
    if (!conversation) return forbidden()

    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName))
  }

  if (channelName.startsWith('private-user-')) {
    const channelUserId = parseInt(channelName.replace('private-user-', ''))
    if (!Number.isInteger(channelUserId) || channelUserId !== user.id) return forbidden()

    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName))
  }

  // ── Refus par défaut : tout canal non reconnu est rejeté ──
  return forbidden()
}
