'use client'

import PartySocket from 'partysocket'

// PartyKit server host. Boş ise multiplayer devre dışı (offline mode).
// Deploy sonrası burası: 'komikoyun-mp.drsemihemre.partykit.dev' olacak
export const PARTY_HOST =
  process.env.NEXT_PUBLIC_PARTY_HOST ||
  'komikoyun-mp.drsemihemre.partykit.dev'

export type RemotePlayer = {
  id: string
  nickname: string
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  hp: number
  currentWeapon: string
}

type WelcomeMsg = {
  type: 'welcome'
  yourId: string
  players: RemotePlayer[]
}
type StatesMsg = {
  type: 'states'
  players: Omit<RemotePlayer, 'nickname'>[]
}
type JoinedMsg = {
  type: 'player_joined'
  player: RemotePlayer
}
type LeftMsg = {
  type: 'player_left'
  id: string
}
type ActionMsg = {
  type: 'action'
  fromId: string
  action: string
  target?: string
}
type ServerMsg = WelcomeMsg | StatesMsg | JoinedMsg | LeftMsg | ActionMsg

// Global MP state — non-Zustand to avoid re-rendering on every state update
const remotes = new Map<string, RemotePlayer>()
let myId: string | null = null
let connected = false
let socket: PartySocket | null = null
const subscribers = new Set<() => void>()

function notify() {
  subscribers.forEach((fn) => fn())
}

export function subscribeMP(fn: () => void) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function getRemotes(): RemotePlayer[] {
  return Array.from(remotes.values()).filter((p) => p.id !== myId)
}

export function getMyId(): string | null {
  return myId
}

export function isConnected(): boolean {
  return connected
}

export function connect(nickname: string, room = 'public') {
  if (socket) return
  if (!PARTY_HOST) return
  try {
    socket = new PartySocket({
      host: PARTY_HOST,
      room,
    })

    socket.addEventListener('open', () => {
      connected = true
      socket?.send(JSON.stringify({ type: 'join', nickname }))
      notify()
    })

    socket.addEventListener('close', () => {
      connected = false
      remotes.clear()
      notify()
    })

    socket.addEventListener('error', () => {
      connected = false
      notify()
    })

    socket.addEventListener('message', (e) => {
      let msg: ServerMsg
      try {
        msg = JSON.parse(e.data as string)
      } catch {
        return
      }
      if (msg.type === 'welcome') {
        myId = msg.yourId
        remotes.clear()
        msg.players.forEach((p) => remotes.set(p.id, p))
        notify()
      } else if (msg.type === 'player_joined') {
        remotes.set(msg.player.id, msg.player)
        notify()
      } else if (msg.type === 'player_left') {
        remotes.delete(msg.id)
        notify()
      } else if (msg.type === 'states') {
        // Merge (nicknames kept from earlier msgs)
        msg.players.forEach((p) => {
          const existing = remotes.get(p.id)
          remotes.set(p.id, {
            ...(existing ?? {
              id: p.id,
              nickname: '',
              x: 0,
              y: 0,
              z: 0,
              yaw: 0,
              scale: 1,
              hp: 100,
              currentWeapon: 'fist',
            }),
            ...p,
          })
        })
        notify()
      }
    })
  } catch {
    // connection failed — silent
  }
}

export function disconnect() {
  if (socket) {
    socket.close()
    socket = null
  }
  connected = false
  remotes.clear()
  myId = null
}

// Called from Player useFrame (throttled)
let lastSendT = 0
export function sendState(s: {
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  hp: number
  currentWeapon: string
}) {
  if (!socket || !connected) return
  const now = performance.now()
  if (now - lastSendT < 80) return
  lastSendT = now
  try {
    socket.send(JSON.stringify({ type: 'state', ...s }))
  } catch {
    // ignore
  }
}

export function sendAction(action: 'hit' | 'weapon' | 'potion', target?: string) {
  if (!socket || !connected) return
  try {
    socket.send(JSON.stringify({ type: 'action', action, target }))
  } catch {
    // ignore
  }
}
