// PartyKit server — komikoyun multiplayer
// Features: player sync, leaderboard (top 5 by score), attack relay

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
  score: number
  currentWeapon: string
  bodyColor: string
  hatKind: string
  hatColor: string
  gender: string
  hairColor: string
  lastSeen: number
}

type ClientMessage =
  | {
      type: 'join'
      nickname: string
      bodyColor?: string
      hatKind?: string
      hatColor?: string
      gender?: string
      hairColor?: string
    }
  | {
      type: 'state'
      x: number
      y: number
      z: number
      yaw: number
      scale: number
      hp: number
      score: number
      currentWeapon: string
      bodyColor?: string
      hatKind?: string
      hatColor?: string
      gender?: string
      hairColor?: string
    }
  | { type: 'hit'; targetId: string; damage: number; knockX: number; knockY: number; knockZ: number }
  | { type: 'action'; action: string; target?: string }

type ServerMessage =
  | { type: 'welcome'; yourId: string; players: PlayerState[] }
  | { type: 'player_joined'; player: PlayerState }
  | { type: 'player_left'; id: string }
  | {
      type: 'states'
      players: {
        id: string
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
      }[]
    }
  | {
      type: 'leaderboard'
      top: { id: string; nickname: string; score: number }[]
    }
  | {
      type: 'hit_you'
      fromId: string
      damage: number
      knockX: number
      knockY: number
      knockZ: number
    }
  | { type: 'action'; fromId: string; action: string; target?: string }

export default class KomikOyunParty implements Party.Server {
  players = new Map<string, PlayerState>()
  broadcastInterval: ReturnType<typeof setInterval> | null = null
  leaderboardInterval: ReturnType<typeof setInterval> | null = null

  constructor(readonly room: Party.Room) {}

  onStart() {
    this.broadcastInterval = setInterval(() => {
      this.broadcastStates()
    }, 100)
    this.leaderboardInterval = setInterval(() => {
      this.broadcastLeaderboard()
    }, 2000)
  }

  onConnect(conn: Party.Connection) {
    const player: PlayerState = {
      id: conn.id,
      nickname: 'Oyuncu',
      x: 0,
      y: 3,
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
      lastSeen: Date.now(),
    }
    this.players.set(conn.id, player)

    const msg: ServerMessage = {
      type: 'welcome',
      yourId: conn.id,
      players: Array.from(this.players.values()),
    }
    conn.send(JSON.stringify(msg))
    // Immediately send leaderboard
    conn.send(JSON.stringify(this.buildLeaderboard()))
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
      if (parsed.bodyColor) player.bodyColor = parsed.bodyColor
      if (parsed.hatKind) player.hatKind = parsed.hatKind
      if (parsed.hatColor) player.hatColor = parsed.hatColor
      if (parsed.gender) player.gender = parsed.gender
      if (parsed.hairColor) player.hairColor = parsed.hairColor
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
      player.score = parsed.score
      player.currentWeapon = parsed.currentWeapon
      if (parsed.bodyColor) player.bodyColor = parsed.bodyColor
      if (parsed.hatKind) player.hatKind = parsed.hatKind
      if (parsed.hatColor) player.hatColor = parsed.hatColor
      if (parsed.gender) player.gender = parsed.gender
      if (parsed.hairColor) player.hairColor = parsed.hairColor
      player.lastSeen = Date.now()
    } else if (parsed.type === 'hit') {
      // Relay hit to the target
      const targetConn = this.room.getConnection(parsed.targetId)
      if (targetConn) {
        const hitMsg: ServerMessage = {
          type: 'hit_you',
          fromId: sender.id,
          damage: parsed.damage,
          knockX: parsed.knockX,
          knockY: parsed.knockY,
          knockZ: parsed.knockZ,
        }
        targetConn.send(JSON.stringify(hitMsg))
      }
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
        score: p.score,
        currentWeapon: p.currentWeapon,
        bodyColor: p.bodyColor,
        hatKind: p.hatKind,
        hatColor: p.hatColor,
        gender: p.gender,
        hairColor: p.hairColor,
      })),
    }
    this.room.broadcast(JSON.stringify(msg))
  }

  buildLeaderboard(): ServerMessage {
    const top = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((p) => ({ id: p.id, nickname: p.nickname, score: p.score }))
    return { type: 'leaderboard', top }
  }

  broadcastLeaderboard() {
    if (this.players.size < 1) return
    this.room.broadcast(JSON.stringify(this.buildLeaderboard()))
  }
}
