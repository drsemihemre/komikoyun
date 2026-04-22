// PartyKit server — komikoyun multiplayer
// Features: player sync, leaderboard, attack relay, brainrot game state + stealing

import type * as Party from 'partykit/server'

type OwnedSlot = {
  id: string
  defId: string
  slotIdx: number
  lockedUntil: number // unix seconds
}

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
  // Brainrot game state
  brCash: number
  brOwned: OwnedSlot[]
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
  | {
      type: 'hit'
      targetId: string
      damage: number
      knockX: number
      knockY: number
      knockZ: number
    }
  | { type: 'action'; action: string; target?: string }
  | { type: 'br_state'; cash: number; owned: OwnedSlot[] }
  | { type: 'br_steal'; victimId: string; slotIdx: number }

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
  | {
      type: 'br_states'
      players: { id: string; nickname: string; cash: number; owned: OwnedSlot[] }[]
    }
  | {
      type: 'br_stolen'
      thiefId: string
      thiefName: string
      defId: string
      slotIdx: number
    }
  | {
      type: 'br_received'
      victimId: string
      victimName: string
      defId: string
    }

export default class KomikOyunParty implements Party.Server {
  players = new Map<string, PlayerState>()
  broadcastInterval: ReturnType<typeof setInterval> | null = null
  leaderboardInterval: ReturnType<typeof setInterval> | null = null
  brainrotInterval: ReturnType<typeof setInterval> | null = null

  constructor(readonly room: Party.Room) {}

  onStart() {
    this.broadcastInterval = setInterval(() => {
      this.broadcastStates()
    }, 100)
    this.leaderboardInterval = setInterval(() => {
      this.broadcastLeaderboard()
    }, 2000)
    this.brainrotInterval = setInterval(() => {
      this.broadcastBrainrotStates()
    }, 1500)
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
      brCash: 100,
      brOwned: [],
    }
    this.players.set(conn.id, player)

    const msg: ServerMessage = {
      type: 'welcome',
      yourId: conn.id,
      players: Array.from(this.players.values()),
    }
    conn.send(JSON.stringify(msg))
    // Immediately send leaderboard + brainrot snapshot
    conn.send(JSON.stringify(this.buildLeaderboard()))
    conn.send(JSON.stringify(this.buildBrainrotStates()))
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
    } else if (parsed.type === 'br_state') {
      // Client kendi brainrot state'ini bildiriyor
      player.brCash = Math.max(0, Math.floor(parsed.cash))
      player.brOwned = Array.isArray(parsed.owned)
        ? parsed.owned.slice(0, 8).map((o) => ({
            id: String(o.id),
            defId: String(o.defId),
            slotIdx: Math.max(0, Math.min(7, o.slotIdx | 0)),
            lockedUntil: Number(o.lockedUntil) || 0,
          }))
        : []
    } else if (parsed.type === 'br_steal') {
      // Steal isteği — server validate eder, her iki tarafa bildirir
      const victim = this.players.get(parsed.victimId)
      if (!victim || victim.id === sender.id) return
      const slot = victim.brOwned.find((o) => o.slotIdx === parsed.slotIdx)
      if (!slot) return
      const nowS = Date.now() / 1000
      if (slot.lockedUntil > nowS) return // kilitli, çalınamaz
      const stolenDefId = slot.defId

      // Server-side state update (optimistik)
      victim.brOwned = victim.brOwned.filter(
        (o) => o.slotIdx !== parsed.slotIdx
      )
      // Hırsıza boş slot bul
      const usedSlots = new Set(player.brOwned.map((o) => o.slotIdx))
      let freeSlot = -1
      for (let i = 0; i < 8; i++) {
        if (!usedSlots.has(i)) {
          freeSlot = i
          break
        }
      }
      if (freeSlot >= 0) {
        player.brOwned.push({
          id: `o${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          defId: stolenDefId,
          slotIdx: freeSlot,
          lockedUntil: 0,
        })
      }

      // Notify thief
      sender.send(
        JSON.stringify({
          type: 'br_received',
          victimId: victim.id,
          victimName: victim.nickname,
          defId: stolenDefId,
        } satisfies ServerMessage)
      )
      // Notify victim
      const victimConn = this.room.getConnection(victim.id)
      if (victimConn) {
        victimConn.send(
          JSON.stringify({
            type: 'br_stolen',
            thiefId: sender.id,
            thiefName: player.nickname,
            defId: stolenDefId,
            slotIdx: parsed.slotIdx,
          } satisfies ServerMessage)
        )
      }
      // Anında state broadcast
      this.broadcastBrainrotStates()
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

  buildBrainrotStates(): ServerMessage {
    return {
      type: 'br_states',
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        cash: p.brCash,
        owned: p.brOwned,
      })),
    }
  }

  broadcastBrainrotStates() {
    if (this.players.size < 1) return
    this.room.broadcast(JSON.stringify(this.buildBrainrotStates()))
  }
}
