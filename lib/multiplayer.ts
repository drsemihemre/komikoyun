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
  gender: string
  hairColor: string
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
export type OwnedSlot = {
  id: string
  defId: string
  slotIdx: number
  lockedUntil: number
}
export type RemoteBrainrotState = {
  id: string
  nickname: string
  cash: number
  owned: OwnedSlot[]
}
type BrStatesMsg = {
  type: 'br_states'
  players: RemoteBrainrotState[]
}
type BrStolenMsg = {
  type: 'br_stolen'
  thiefId: string
  thiefName: string
  defId: string
  slotIdx: number
}
type BrReceivedMsg = {
  type: 'br_received'
  victimId: string
  victimName: string
  defId: string
}
type ServerMsg =
  | WelcomeMsg
  | StatesMsg
  | JoinedMsg
  | LeftMsg
  | LeaderboardMsg
  | HitYouMsg
  | ActionMsg
  | BrStatesMsg
  | BrStolenMsg
  | BrReceivedMsg

const remotes = new Map<string, RemotePlayer>()
let myId: string | null = null
let connected = false
let socket: PartySocket | null = null
let leaderboard: LeaderboardEntry[] = []
const remoteBrainrots = new Map<string, RemoteBrainrotState>()
const subscribers = new Set<() => void>()

// Brainrot stealing event handlers (UI tarafından register edilir)
type BrStolenHandler = (msg: BrStolenMsg) => void
type BrReceivedHandler = (msg: BrReceivedMsg) => void
let brStolenHandler: BrStolenHandler | null = null
let brReceivedHandler: BrReceivedHandler | null = null
export function registerBrainrotHandlers(
  onStolen: BrStolenHandler,
  onReceived: BrReceivedHandler
) {
  brStolenHandler = onStolen
  brReceivedHandler = onReceived
}
export function unregisterBrainrotHandlers() {
  brStolenHandler = null
  brReceivedHandler = null
}

export function getRemoteBrainrots(): RemoteBrainrotState[] {
  return Array.from(remoteBrainrots.values()).filter((p) => p.id !== myId)
}

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
  skin?: {
    bodyColor: string
    hatKind: string
    hatColor: string
    gender: string
    hairColor: string
  }
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
          gender: skin?.gender,
          hairColor: skin?.hairColor,
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
              gender: 'boy',
              hairColor: '#3d2817',
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
      } else if (msg.type === 'br_states') {
        remoteBrainrots.clear()
        msg.players.forEach((p) => remoteBrainrots.set(p.id, p))
        notify()
      } else if (msg.type === 'br_stolen') {
        if (brStolenHandler) brStolenHandler(msg)
      } else if (msg.type === 'br_received') {
        if (brReceivedHandler) brReceivedHandler(msg)
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
  gender: string
  hairColor: string
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

let lastBrSendT = 0
export function sendBrainrotState(cash: number, owned: OwnedSlot[]) {
  if (!socket || !connected) return
  const now = performance.now()
  if (now - lastBrSendT < 1000) return // saniyede 1 kez yeter
  lastBrSendT = now
  try {
    socket.send(
      JSON.stringify({
        type: 'br_state',
        cash: Math.floor(cash),
        owned: owned.slice(0, 8),
      })
    )
  } catch {}
}

export function sendBrainrotSteal(victimId: string, slotIdx: number) {
  if (!socket || !connected) return
  try {
    socket.send(
      JSON.stringify({ type: 'br_steal', victimId, slotIdx })
    )
  } catch {}
}
