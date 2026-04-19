'use client'

import PartySocket from 'partysocket'

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
  score: number
  currentWeapon: string
  bodyColor: string
  hatKind: string
  hatColor: string
}

export type LeaderboardEntry = {
  id: string
  nickname: string
  score: number
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
type LeaderboardMsg = {
  type: 'leaderboard'
  top: LeaderboardEntry[]
}
type HitYouMsg = {
  type: 'hit_you'
  fromId: string
  damage: number
  knockX: number
  knockY: number
  knockZ: number
}
type ActionMsg = {
  type: 'action'
  fromId: string
  action: string
  target?: string
}
type ServerMsg = WelcomeMsg | StatesMsg | JoinedMsg | LeftMsg | LeaderboardMsg | HitYouMsg | ActionMsg

const remotes = new Map<string, RemotePlayer>()
let myId: string | null = null
let connected = false
let socket: PartySocket | null = null
let leaderboard: LeaderboardEntry[] = []
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

export function getLeaderboard(): LeaderboardEntry[] {
  return leaderboard
}

export function isConnected(): boolean {
  return connected
}

// HitYou handler — Player tarafında register edilir
type HitYouHandler = (
  damage: number,
  knockback: [number, number, number],
  fromId: string
) => void
let hitHandler: HitYouHandler | null = null
export function registerHitHandler(h: HitYouHandler) {
  hitHandler = h
}
export function unregisterHitHandler() {
  hitHandler = null
}

export function connect(
  nickname: string,
  room = 'public',
  skin?: { bodyColor: string; hatKind: string; hatColor: string }
) {
  if (socket) return
  if (!PARTY_HOST) return
  try {
    socket = new PartySocket({ host: PARTY_HOST, room })

    socket.addEventListener('open', () => {
      connected = true
      socket?.send(
        JSON.stringify({
          type: 'join',
          nickname,
          bodyColor: skin?.bodyColor,
          hatKind: skin?.hatKind,
          hatColor: skin?.hatColor,
        })
      )
      notify()
    })

    socket.addEventListener('close', () => {
      connected = false
      remotes.clear()
      leaderboard = []
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
              score: 0,
              currentWeapon: 'fist',
              bodyColor: '#ef476f',
              hatKind: 'none',
              hatColor: '#1a1a1a',
            }),
            ...p,
          })
        })
        notify()
      } else if (msg.type === 'leaderboard') {
        leaderboard = msg.top
        notify()
      } else if (msg.type === 'hit_you') {
        if (hitHandler) {
          hitHandler(
            msg.damage,
            [msg.knockX, msg.knockY, msg.knockZ],
            msg.fromId
          )
        }
      }
    })
  } catch {
    // silent
  }
}

export function disconnect() {
  if (socket) {
    socket.close()
    socket = null
  }
  connected = false
  remotes.clear()
  leaderboard = []
  myId = null
}

let lastSendT = 0
export function sendState(s: {
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  hp: number
  score: number
  currentWeapon: string
  bodyColor: string
  hatKind: string
  hatColor: string
}) {
  if (!socket || !connected) return
  const now = performance.now()
  if (now - lastSendT < 80) return
  lastSendT = now
  try {
    socket.send(JSON.stringify({ type: 'state', ...s }))
  } catch {}
}

export function sendHit(
  targetId: string,
  damage: number,
  knockback: [number, number, number]
) {
  if (!socket || !connected) return
  try {
    socket.send(
      JSON.stringify({
        type: 'hit',
        targetId,
        damage,
        knockX: knockback[0],
        knockY: knockback[1],
        knockZ: knockback[2],
      })
    )
  } catch {}
}

export function sendAction(action: 'hit' | 'weapon' | 'potion', target?: string) {
  if (!socket || !connected) return
  try {
    socket.send(JSON.stringify({ type: 'action', action, target }))
  } catch {}
}
