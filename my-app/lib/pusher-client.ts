import PusherJs from 'pusher-js'

let pusherClient: PusherJs | null = null

export function getPusherClient(): PusherJs {
  if (!pusherClient && typeof window !== 'undefined') {
    pusherClient = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherClient!
}

export default getPusherClient
