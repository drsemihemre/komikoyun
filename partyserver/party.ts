// PartyKit server — komikoyun multiplayer
// Deploy: npx partykit deploy
// Default room: her oyuncu bu odaya katılır
// Client URL: https://komikoyun-mp.drsemihemre.partykit.dev

import type * as Party from 'partykit/server'

type PlayerState = {
  id: string
  nickname: string
  x: number
  y: number
  z: number
  yaw: number
  scale: number
  hp: number
  currentWeapon: string
  lastSeen: number
}

type ClientMessage =
  | {
      type: 'join'
      nickname: string
    }
  | {
      type: 'state'
      x: number
      y: number
      z: number
      yaw: number
      scale: number
      hp: number
      currentWeapon: string
    }
  | {
      type: 'action'
      action: 'hit' | 'weapon' | 'potion'
      target?: string
    }

type ServerMessage =
  | {
      type: 'welcome'
      yourId: string
      players: PlayerState[]
    }
  | {
      type: 'player_joined'
      player: PlayerState
    }
  | {
      type: 'player_left'
      id: string
    }
  | {
      type: 'states'
      players: { id: string; x: number; y: number; z: number; yaw: number; scale: number; hp: number; currentWeapon: string }[]
    }
  | {
      type: 'action'
      fromId: string
      action: string
      target?: string
    }

export default class KomikOyunParty implements Party.Server {
  players = new Map<string, PlayerState>()
  broadcastInterval: ReturnType<typeof setInterval> | null = null

  constructor(readonly room: Party.Room) {}

  onStart() {
    // 100ms'de bir tüm pozisyonları broadcast et
    this.broadcastInterval = setInterval(() => {
      this.broadcastStates()
    }, 100)
  }

  onConnect(conn: Party.Connection) {
    // Initialize player state
    const player: PlayerState = {
      id: conn.id,
      nickname: 'Oyuncu',
      x: 0,
      y: 3,
      z: 0,
      yaw: 0,
      scale: 1,
      hp: 100,
      currentWeapon: 'fist',
      lastSeen: Date.now(),
    }
    this.players.set(conn.id, player)

    // Send welcome with current roster
    const msg: ServerMessage = {
      type: 'welcome',
      yourId: conn.id,
      players: Array.from(this.players.values()),
    }
    conn.send(JSON.stringify(msg))
  }

  onMessage(message: string, sender: Party.Connection) {
    let parsed: ClientMessage
    try {
      parsed = JSON.parse(message)
    } catch {
      return
    }

    const player = this.players.get(sender.id)
    if (!player) return

    if (parsed.type === 'join') {
      player.nickname = (parsed.nickname || 'Oyuncu').slice(0, 20)
      this.room.broadcast(
        JSON.stringify({
          type: 'player_joined',
          player,
        } satisfies ServerMessage),
        [sender.id]
      )
    } else if (parsed.type === 'state') {
      player.x = parsed.x
      player.y = parsed.y
      player.z = parsed.z
      player.yaw = parsed.yaw
      player.scale = parsed.scale
      player.hp = parsed.hp
      player.currentWeapon = parsed.currentWeapon
      player.lastSeen = Date.now()
    } else if (parsed.type === 'action') {
      this.room.broadcast(
        JSON.stringify({
          type: 'action',
          fromId: sender.id,
          action: parsed.action,
          target: parsed.target,
        } satisfies ServerMessage),
        [sender.id]
      )
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id)
    this.room.broadcast(
      JSON.stringify({
        type: 'player_left',
        id: conn.id,
      } satisfies ServerMessage)
    )
  }

  broadcastStates() {
    if (this.players.size < 2) return
    const msg: ServerMessage = {
      type: 'states',
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        scale: p.scale,
        hp: p.hp,
        currentWeapon: p.currentWeapon,
      })),
    }
    this.room.broadcast(JSON.stringify(msg))
  }
}
