'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore } from '@/lib/store'
import {
  BRAINROTS,
  RARITY_COLORS,
  RARITY_LABELS,
  getBrainrotDef,
  randomBrainrot,
  sellPriceFor,
} from '@/lib/brainrots'
import { playLaunch, playKo, playPotion } from '@/lib/sounds'
import { spawnImpact } from '@/lib/particles'
import BrainrotFigure from './BrainrotFigure'
import {
  getRemoteBrainrots,
  registerBrainrotHandlers,
  unregisterBrainrotHandlers,
  sendBrainrotState,
  sendBrainrotSteal,
  subscribeMP,
  getMyId,
  type RemoteBrainrotState,
} from '@/lib/multiplayer'
import { loadNickname } from '@/lib/nickname'

// ═══════════════════════════════════════════════════════════════
//   STEAL A BRAINROT — Tam oyun
//   - Merkezde konveyor + mod tabelalar
//   - Her oyuncunun kendi EV'i (nickname üstünde)
//   - Satın alınan brainrot konveyordan çıkıp yürüyerek eve gelir
//   - Z tuşu (mobile'de SAT butonu) ile slot satılır (%50 fiyat)
//   - Başkasının kilitsiz slot'unda 3sn dur → çal
// ═══════════════════════════════════════════════════════════════

const MAIN_PORTAL: [number, number, number] = [0, 1.5, 60]
const ZONE_CENTER: [number, number, number] = [400, 150, 400]

const CONVEYOR_START = -18
const CONVEYOR_END = 18
const CONVEYOR_TRAVEL_TIME = 22
const SPAWN_INTERVAL = 4.5

// Ev içinde slot konumları (ev merkezine relatif)
const HOME_SLOTS: [number, number, number][] = [
  [-5, 0, -3],
  [-2.5, 0, -4],
  [0, 0, -4.5],
  [2.5, 0, -4],
  [5, 0, -3],
  [-5, 0, 3],
  [0, 0, 4.5],
  [5, 0, 3],
]

const HOME_SIZE = 7 // yarı-genişlik (toplam 14x14 platform)

// Local ev konumu (merkez konveyorun güneyi)
const LOCAL_HOME: [number, number, number] = [0, 0, -28]

// Remote ev konumları — merkez etrafında halka
function remoteHomeOffset(index: number): [number, number] {
  // 6 çevre + 1 local (merkez). Halka: 60 birim yarıçap
  const angle = (index / 6) * Math.PI * 2 + Math.PI / 6
  const r = 45
  return [Math.cos(angle) * r, Math.sin(angle) * r]
}

type BeltItem = {
  id: string
  defId: string
  spawnedAt: number
}

type WalkingItem = {
  id: string
  defId: string
  from: [number, number, number]
  to: [number, number, number]
  startT: number
  duration: number
}

export default function BrainrotGame() {
  return (
    <>
      <Portal
        position={MAIN_PORTAL}
        destination={[ZONE_CENTER[0], ZONE_CENTER[1] + 1, ZONE_CENTER[2] + 22]}
        label="🧠 STEAL A BRAINROT"
        frameColor="#c77dff"
        innerColor="#ff00ff"
      />
      <GameZone />
      <Portal
        position={[ZONE_CENTER[0], ZONE_CENTER[1] + 1.5, ZONE_CENTER[2] + 25]}
        destination={[MAIN_PORTAL[0], MAIN_PORTAL[1] + 1.5, MAIN_PORTAL[2] + 3]}
        label="🚪 Dünyaya Dön"
        frameColor="#ffd60a"
        innerColor="#4cc9f0"
      />
    </>
  )
}

function Portal({
  position,
  destination,
  label,
  frameColor,
  innerColor,
}: {
  position: [number, number, number]
  destination: [number, number, number]
  label: string
  frameColor: string
  innerColor: string
}) {
  const ringRef = useRef<Mesh>(null)
  const lastTriggerAt = useRef(-10)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) ringRef.current.rotation.z = t * 0.5
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dy = pp.y - position[1]
    const dz = pp.z - position[2]
    if (Math.hypot(dx, dy, dz) < 2.5 && t - lastTriggerAt.current > 3) {
      lastTriggerAt.current = t
      spawnImpact(position[0], position[1], position[2], frameColor, 2)
      spawnImpact(destination[0], destination[1], destination[2], frameColor, 2)
      playLaunch()
      player?.teleportTo(destination[0], destination[1], destination[2])
    }
  })

  return (
    <group position={position}>
      <mesh ref={ringRef}>
        <torusGeometry args={[2, 0.3, 12, 32]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameColor}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color={innerColor} transparent opacity={0.65} />
      </mesh>
      <Html position={[0, 2.8, 0]} center distanceFactor={16} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-sm font-black text-white shadow-xl">
          {label}
        </div>
      </Html>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME ZONE
// ═══════════════════════════════════════════════════════════════
function GameZone() {
  const [cx, cy, cz] = ZONE_CENTER
  const [mode, setMode] = useState<'classic' | 'tsunami'>('classic')
  const [belt, setBelt] = useState<BeltItem[]>([])
  const [walking, setWalking] = useState<WalkingItem[]>([])
  const [banner, setBanner] = useState<{ text: string; color: string } | null>(
    null
  )
  const lastSpawnRef = useRef(0)
  const earnTickRef = useRef(0)
  const syncTickRef = useRef(0)
  const nickname = useMemo(() => loadNickname() || 'Sen', [])

  const { brainrotCash, brainrotOwned, brainrotBuy, brainrotEarn, brainrotTransform } =
    useGameStore()
  const isMobile = useGameStore((s) => s.isMobile)

  // Şans Bloğu zamanlayıcıları: slotIdx → yerleştirilme zamanı (ms)
  const [luckyTimers, setLuckyTimers] = useState<Record<number, number>>({})
  const luckyTimersRef = useRef<Record<number, number>>({})

  const [, setTick] = useState(0)
  useEffect(() => {
    const unsub = subscribeMP(() => setTick((t) => t + 1))
    return unsub
  }, [])
  const remoteBases = getRemoteBrainrots()
  const myId = getMyId()

  // Stealing notifications
  useEffect(() => {
    registerBrainrotHandlers(
      (stolen) => {
        const def = getBrainrotDef(stolen.defId)
        useGameStore.getState().brainrotApplySteal(stolen.slotIdx)
        setBanner({
          text: `⚠️ ${stolen.thiefName} senden "${def?.name ?? stolen.defId}" çaldı!`,
          color: '#dc2626',
        })
        playKo()
        setTimeout(() => setBanner(null), 4000)
      },
      (received) => {
        const def = getBrainrotDef(received.defId)
        useGameStore.getState().brainrotReceiveStolen(received.defId)
        setBanner({
          text: `💰 ${received.victimName}'den "${def?.name ?? received.defId}" çaldın!`,
          color: '#16a34a',
        })
        playPotion('grow')
        setTimeout(() => setBanner(null), 4000)
      }
    )
    return () => unregisterBrainrotHandlers()
  }, [])

  // ───── Z TUŞU: Local slot yakınında → sat ─────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'z' && e.key !== 'Z') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted || state.paused) return
      const player = getPlayerHandle()
      const pp = player?.getPos()
      if (!pp) return
      // Her owned slot için distance check
      for (const owned of state.brainrotOwned) {
        const slotLocal = HOME_SLOTS[owned.slotIdx]
        if (!slotLocal) continue
        const worldX = cx + LOCAL_HOME[0] + slotLocal[0]
        const worldZ = cz + LOCAL_HOME[2] + slotLocal[2]
        const dist = Math.hypot(pp.x - worldX, pp.z - worldZ)
        if (dist < 2.5) {
          const def = getBrainrotDef(owned.defId)
          if (!def) return
          const gain = sellPriceFor(def)
          if (state.brainrotSell(owned.slotIdx)) {
            state.brainrotEarn(gain)
            playPotion('grow')
            setBanner({
              text: `💰 ${def.name} satıldı +${gain.toLocaleString('tr')}`,
              color: '#16a34a',
            })
            setTimeout(() => setBanner(null), 2000)
          }
          return
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cx, cz])

  // Spawn + income + server sync loop
  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Konveyor spawn (sadece classic modda)
    if (mode === 'classic' && t - lastSpawnRef.current > SPAWN_INTERVAL) {
      lastSpawnRef.current = t
      const def = randomBrainrot()
      if (def) {
        setBelt((prev) => [
          ...prev.slice(-9),
          { id: `b${Date.now()}_${Math.random()}`, defId: def.id, spawnedAt: t },
        ])
      }
      // def null ise konveyor boş geçti (%15)
    }

    // Pasif gelir + Şans Bloğu dönüşüm kontrolü
    if (t - earnTickRef.current > 1) {
      earnTickRef.current = t
      const storeState = useGameStore.getState()
      const totalIncome = storeState.brainrotOwned.reduce((sum, o) => {
        const def = getBrainrotDef(o.defId)
        return sum + (def?.income ?? 0)
      }, 0)
      if (totalIncome > 0) brainrotEarn(totalIncome)

      // ── Şans Bloğu: 60 saniye dolunca dönüştür ──
      for (const owned of storeState.brainrotOwned) {
        if (owned.defId !== 'sansblogu') continue
        const now = Date.now()
        let placedAt = luckyTimersRef.current[owned.slotIdx]
        if (!placedAt) {
          // Sayfa yenilemede başla
          placedAt = now
          luckyTimersRef.current[owned.slotIdx] = now
          setLuckyTimers((prev) => ({ ...prev, [owned.slotIdx]: now }))
          continue
        }
        const elapsed = (now - placedAt) / 1000
        if (elapsed >= 60) {
          // Aynı rarity'den rastgele bir brainrot seç (Şans Bloğu hariç)
          const sansDef = getBrainrotDef('sansblogu')
          const candidates = BRAINROTS.filter(
            (b) => b.rarity === sansDef?.rarity && b.id !== 'sansblogu'
          )
          if (candidates.length > 0) {
            const revealed = candidates[Math.floor(Math.random() * candidates.length)]
            // Zamanlayıcıyı temizle
            delete luckyTimersRef.current[owned.slotIdx]
            setLuckyTimers((prev) => {
              const next = { ...prev }
              delete next[owned.slotIdx]
              return next
            })
            storeState.brainrotTransform(owned.slotIdx, revealed.id)
            setBanner({
              text: `🎰 Şans Bloğu açıldı! → ${revealed.name} çıktı!`,
              color: '#f59e0b',
            })
            playPotion('grow')
            setTimeout(() => setBanner(null), 5000)
          }
        }
      }
    }

    // Server sync
    if (t - syncTickRef.current > 1.5) {
      syncTickRef.current = t
      const { brainrotCash: cash, brainrotOwned: owned } =
        useGameStore.getState()
      sendBrainrotState(cash, owned)
    }

    // Eski belt ve walking item'ları temizle
    setBelt((prev) =>
      prev.filter((it) => t - it.spawnedAt < CONVEYOR_TRAVEL_TIME)
    )
    setWalking((prev) => prev.filter((w) => t - w.startT < w.duration + 0.5))
  })

  // Remote player'ları halka düzeninde yerleştir
  const remoteLayout = useMemo(() => {
    const active = remoteBases
      .filter((r) => r.id !== myId)
      .slice(0, 6)
    return active.map((r, idx) => {
      const [ox, oz] = remoteHomeOffset(idx)
      return { ...r, offsetX: ox, offsetZ: oz }
    })
  }, [remoteBases, myId])

  // Konveyordan satın alma handler
  const handleBuy = (
    defId: string,
    price: number,
    fromX: number,
    fromZ: number
  ) => {
    const slotIdx = brainrotBuy(defId, price)
    if (slotIdx < 0) return false
    // Walking animation
    const slotLocal = HOME_SLOTS[slotIdx]
    if (slotLocal) {
      const toX = LOCAL_HOME[0] + slotLocal[0]
      const toZ = LOCAL_HOME[2] + slotLocal[2]
      const id = `w${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      setWalking((prev) => [
        ...prev,
        {
          id,
          defId,
          from: [fromX, 0.2, fromZ],
          to: [toX, 0.2, toZ],
          startT: performance.now() / 1000,
          duration: 2.8,
        },
      ])
    }
    // Şans Bloğu zamanlayıcısını başlat
    if (defId === 'sansblogu') {
      const now = Date.now()
      luckyTimersRef.current[slotIdx] = now
      setLuckyTimers((prev) => ({ ...prev, [slotIdx]: now }))
    }
    playPotion('grow')
    return true
  }

  return (
    <group position={[cx, cy, cz]}>
      {/* Ana büyük platform — tüm evler bunun üzerinde */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[60, 0.5, 60]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[120, 1, 120]} />
          <meshStandardMaterial color="#ff77ee" roughness={0.8} />
        </mesh>
        {/* Alt süslü disk */}
        <mesh position={[0, -2, 0]}>
          <cylinderGeometry args={[55, 50, 3, 40]} />
          <meshStandardMaterial color="#a84ed0" roughness={0.7} />
        </mesh>
      </RigidBody>

      {/* Başlık */}
      <mesh position={[0, 6, 20]} castShadow>
        <boxGeometry args={[22, 3.8, 0.4]} />
        <meshStandardMaterial
          color="#ff006e"
          emissive="#ff006e"
          emissiveIntensity={0.3}
        />
      </mesh>
      <Html position={[0, 6, 20.25]} center distanceFactor={18} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap px-2 text-4xl font-black text-white drop-shadow-[3px_3px_0_#000]">
          🧠 STEAL A BRAINROT
        </div>
      </Html>

      {/* Mod tabelaları */}
      <ModeSign
        label="🎯 Klasik"
        desc="Konveyordan satın al"
        active={mode === 'classic'}
        position={[-10, 2, 18]}
        onActivate={() => setMode('classic')}
      />
      <ModeSign
        label="🌊 Tsunami"
        desc="Dalgadan kaç!"
        active={mode === 'tsunami'}
        position={[10, 2, 18]}
        onActivate={() => setMode('tsunami')}
      />

      {/* Konveyor zemini */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[44, 4]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const x = -20 + i * 4.4
        return (
          <mesh key={`cline${i}`} position={[x, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 0.3]} />
            <meshStandardMaterial
              color="#facc15"
              emissive="#facc15"
              emissiveIntensity={0.3}
            />
          </mesh>
        )
      })}

      {/* ═══ LOCAL HOME (benim evim) ═══ */}
      <PlayerHome
        position={LOCAL_HOME}
        nickname={nickname}
        isLocal
        owned={brainrotOwned}
        isMobile={isMobile}
        luckyTimers={luckyTimers}
      />

      {/* ═══ REMOTE HOMES ═══ */}
      {remoteLayout.map((r) => (
        <PlayerHome
          key={r.id}
          position={[r.offsetX, 0, r.offsetZ]}
          nickname={r.nickname}
          isLocal={false}
          owned={r.owned}
          victimId={r.id}
          isMobile={isMobile}
        />
      ))}

      {/* Konveyordaki brainrotlar */}
      {mode === 'classic' &&
        belt.map((item) => (
          <BeltBrainrot
            key={item.id}
            item={item}
            onBuy={(defId, price, bx, bz) => {
              if (handleBuy(defId, price, bx, bz)) {
                setBelt((prev) => prev.filter((b) => b.id !== item.id))
              }
            }}
          />
        ))}

      {/* Yürüyen karakterler */}
      {walking.map((w) => (
        <WalkingBrainrot key={w.id} item={w} />
      ))}

      {/* Tsunami */}
      {mode === 'tsunami' && <TsunamiWave />}

      {/* Cash HUD */}
      <Html position={[0, 4, 18]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-lg font-black text-black shadow-xl">
          💰 {Math.floor(brainrotCash).toLocaleString('tr')}
        </div>
      </Html>

      {/* Banner */}
      {banner && (
        <Html position={[0, 10, 15]} center distanceFactor={14} zIndexRange={[20, 0]}>
          <div
            className="pointer-events-none whitespace-nowrap rounded-xl px-5 py-3 text-lg font-black text-white shadow-2xl"
            style={{ background: banner.color }}
          >
            {banner.text}
          </div>
        </Html>
      )}

      {/* Klavye yardım etiketi */}
      {!isMobile && (
        <Html position={[0, 2, -12]} center distanceFactor={16} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/70 px-3 py-1.5 text-xs font-bold text-white shadow">
            💡 Slot üzerine gel + <kbd className="rounded bg-white/20 px-1">Z</kbd> = SAT (alım fiyatının %50'si)
          </div>
        </Html>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// PLAYER HOME — her oyuncunun kendi ev'i
// ═══════════════════════════════════════════════════════════════
function PlayerHome({
  position,
  nickname,
  isLocal,
  owned,
  victimId,
  isMobile,
  luckyTimers,
}: {
  position: [number, number, number]
  nickname: string
  isLocal: boolean
  owned: Array<{ defId: string; slotIdx: number; lockedUntil: number }>
  victimId?: string
  isMobile: boolean
  luckyTimers?: Record<number, number>
}) {
  const platformColor = isLocal ? '#fef3c7' : '#e2e8f0'
  const fenceColor = isLocal ? '#f97316' : '#64748b'
  const roofColor = isLocal ? '#dc2626' : '#475569'

  return (
    <group position={position}>
      {/* Platform */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[HOME_SIZE, 0.3, HOME_SIZE]}
          position={[0, 0.1, 0]}
        />
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[HOME_SIZE * 2, 0.2, HOME_SIZE * 2]} />
          <meshStandardMaterial color={platformColor} roughness={0.75} />
        </mesh>
      </RigidBody>

      {/* 4 köşe direk */}
      {[
        [-HOME_SIZE + 0.3, -HOME_SIZE + 0.3],
        [HOME_SIZE - 0.3, -HOME_SIZE + 0.3],
        [-HOME_SIZE + 0.3, HOME_SIZE - 0.3],
        [HOME_SIZE - 0.3, HOME_SIZE - 0.3],
      ].map(([x, z], i) => (
        <mesh key={`post${i}`} position={[x, 2, z]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 4, 8]} />
          <meshStandardMaterial color={fenceColor} roughness={0.6} />
        </mesh>
      ))}

      {/* Çit — 4 tarafa düşük duvar */}
      <mesh position={[0, 0.7, -HOME_SIZE + 0.3]} receiveShadow>
        <boxGeometry args={[HOME_SIZE * 2 - 0.6, 0.3, 0.15]} />
        <meshStandardMaterial color={fenceColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, HOME_SIZE - 0.3]} receiveShadow>
        <boxGeometry args={[HOME_SIZE * 2 - 0.6, 0.3, 0.15]} />
        <meshStandardMaterial color={fenceColor} roughness={0.5} />
      </mesh>
      <mesh position={[-HOME_SIZE + 0.3, 0.7, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.3, HOME_SIZE * 2 - 0.6]} />
        <meshStandardMaterial color={fenceColor} roughness={0.5} />
      </mesh>
      <mesh position={[HOME_SIZE - 0.3, 0.7, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.3, HOME_SIZE * 2 - 0.6]} />
        <meshStandardMaterial color={fenceColor} roughness={0.5} />
      </mesh>

      {/* Çatı kasası — üst kolonlar arasına yatay kiriş */}
      <mesh position={[0, 4, -HOME_SIZE + 0.3]}>
        <boxGeometry args={[HOME_SIZE * 2 - 0.6, 0.15, 0.12]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      <mesh position={[0, 4, HOME_SIZE - 0.3]}>
        <boxGeometry args={[HOME_SIZE * 2 - 0.6, 0.15, 0.12]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>

      {/* Nickname TABELASI — çatı üstünde */}
      <mesh position={[0, 5.5, 0]} castShadow>
        <boxGeometry args={[HOME_SIZE * 1.5, 1.2, 0.3]} />
        <meshStandardMaterial
          color={isLocal ? '#fbbf24' : '#3b82f6'}
          emissive={isLocal ? '#fbbf24' : '#3b82f6'}
          emissiveIntensity={0.4}
        />
      </mesh>
      <Html position={[0, 5.5, 0.2]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap px-2 text-xl font-black text-white drop-shadow-[2px_2px_0_#000]">
          🏠 {nickname}
        </div>
      </Html>

      {/* 8 SLOT */}
      {HOME_SLOTS.map((s, i) => {
        const ownedItem = owned.find((o) => o.slotIdx === i)
        return (
          <HomeSlot
            key={i}
            slotIdx={i}
            position={s}
            owned={ownedItem ?? null}
            isLocal={isLocal}
            victimId={victimId}
            isMobile={isMobile}
            luckyPlacedAt={luckyTimers?.[i]}
          />
        )
      })}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// HOME SLOT — Local slot'ta Z ile sat / mobile buton
//            Remote slot'ta 3 saniye dur → çal
// ═══════════════════════════════════════════════════════════════
function HomeSlot({
  slotIdx,
  position,
  owned,
  isLocal,
  victimId,
  isMobile,
  luckyPlacedAt,
}: {
  slotIdx: number
  position: [number, number, number]
  owned: { defId: string; slotIdx: number; lockedUntil: number } | null
  isLocal: boolean
  victimId?: string
  isMobile: boolean
  luckyPlacedAt?: number
}) {
  const { brainrotSell, brainrotEarn, brainrotLockSlot, brainrotCash } =
    useGameStore()
  const lastLockT = useRef(-10)
  const stealStartT = useRef<number | null>(null)
  const [stealProgress, setStealProgress] = useState(0)
  const [nearby, setNearby] = useState(false)
  const [lbCountdown, setLbCountdown] = useState<number | null>(null)
  const groupRef = useRef<Group>(null)

  // Şans Bloğu geri sayım
  useEffect(() => {
    if (owned?.defId !== 'sansblogu' || !luckyPlacedAt) {
      setLbCountdown(null)
      return
    }
    const update = () => {
      const elapsed = (Date.now() - luckyPlacedAt) / 1000
      setLbCountdown(Math.max(0, Math.ceil(60 - elapsed)))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [owned?.defId, luckyPlacedAt])

  const def = owned ? getBrainrotDef(owned.defId) : null
  const nowS = Date.now() / 1000
  const isLocked = owned ? owned.lockedUntil > nowS : false

  useFrame((state) => {
    if (!owned || !groupRef.current) return
    const t = state.clock.elapsedTime
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) {
      setNearby(false)
      return
    }
    const worldPos = groupRef.current.getWorldPosition(
      groupRef.current.position.clone()
    )
    const dx = pp.x - worldPos.x
    const dy = pp.y - worldPos.y
    const dz = pp.z - worldPos.z
    const dist = Math.hypot(dx, dz)
    const near = dist < 2.5 && Math.abs(dy) < 3.5
    if (near !== nearby) setNearby(near)

    if (isLocal) {
      // Local: Auto-lock (3s cooldown, cash >= 50)
      if (!isLocked && near && brainrotCash >= 50 && t - lastLockT.current > 3) {
        lastLockT.current = t
        brainrotLockSlot(slotIdx)
        playPotion('grow')
      }
    } else {
      // Remote: 3 sn dur → çal (kilit değilse)
      if (isLocked) {
        stealStartT.current = null
        if (stealProgress > 0) setStealProgress(0)
        return
      }
      if (near) {
        if (stealStartT.current === null)
          stealStartT.current = state.clock.elapsedTime
        const elapsed = state.clock.elapsedTime - stealStartT.current
        const STEAL_DUR = 3
        const progress = Math.min(1, elapsed / STEAL_DUR)
        if (progress !== stealProgress) setStealProgress(progress)
        if (progress >= 1 && victimId) {
          stealStartT.current = state.clock.elapsedTime + 5 // cooldown
          setStealProgress(0)
          sendBrainrotSteal(victimId, slotIdx)
          playLaunch()
        }
      } else {
        stealStartT.current = null
        if (stealProgress > 0) setStealProgress(0)
      }
    }
  })

  const handleSellClick = () => {
    if (!owned || !def) return
    const gain = sellPriceFor(def)
    if (brainrotSell(slotIdx)) {
      brainrotEarn(gain)
      playPotion('grow')
    }
  }

  // Zemin rengi: local = altın, remote kilitli = kırmızı, remote = turuncu, boş = gri
  const basePlateColor = owned
    ? isLocal
      ? '#fbbf24'
      : isLocked
        ? '#dc2626'
        : '#f97316'
    : '#52525b'

  return (
    <group ref={groupRef} position={position}>
      {/* Slot kaidesi */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1, 0.2, 1]} position={[0, 0.2, 0]} />
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <cylinderGeometry args={[1.1, 1.3, 0.4, 14]} />
          <meshStandardMaterial color={basePlateColor} roughness={0.65} />
        </mesh>
      </RigidBody>
      {/* Slot numarası */}
      <Html position={[0, 0.55, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className="pointer-events-none text-base font-black text-white drop-shadow">
          {slotIdx + 1}
        </div>
      </Html>

      {/* Owned karakter */}
      {def && (
        <group position={[0, 0.5, 0]}>
          <BrainrotFigure def={def} idle={false} scale={0.85} />
          <Html position={[0, 3.2, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
            <div className="pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-xs text-white shadow">
              <div className="font-bold">{def.name}</div>
              <div className="text-[10px] text-yellow-300">
                +{def.income.toLocaleString('tr')}💰/sn
              </div>
              {/* Şans Bloğu geri sayım */}
              {owned?.defId === 'sansblogu' && lbCountdown !== null && (
                <div className="text-[9px] font-black text-amber-300">
                  🎰 {lbCountdown}s sonra açılıyor!
                </div>
              )}
              {isLocked && isLocal && (
                <div className="text-[9px] text-green-300">
                  🔒 Kilitli ({Math.ceil(owned!.lockedUntil - nowS)}s)
                </div>
              )}
              {isLocked && !isLocal && (
                <div className="text-[9px] text-red-300">🔒 KİLİTLİ</div>
              )}
            </div>
          </Html>

          {/* ─ LOCAL: Mobile SAT butonu (yakındaysa) ─ */}
          {isLocal && isMobile && nearby && (
            <Html
              position={[0, 4.3, 0]}
              center
              distanceFactor={12}
              zIndexRange={[30, 0]}
            >
              <button
                onPointerDown={(e) => {
                  e.stopPropagation()
                  handleSellClick()
                }}
                className="pointer-events-auto rounded-xl bg-green-600 px-4 py-2 text-base font-black text-white shadow-2xl ring-2 ring-green-300 active:scale-95 active:bg-green-700"
              >
                💰 SAT +{sellPriceFor(def).toLocaleString('tr')}
              </button>
            </Html>
          )}

          {/* ─ LOCAL: Desktop Z hint (yakındaysa) ─ */}
          {isLocal && !isMobile && nearby && (
            <Html
              position={[0, 4.3, 0]}
              center
              distanceFactor={12}
              zIndexRange={[30, 0]}
            >
              <div className="pointer-events-none rounded-xl bg-green-600 px-3 py-1.5 text-sm font-black text-white shadow-2xl ring-2 ring-green-300">
                💰 Z ile sat +{sellPriceFor(def).toLocaleString('tr')}
              </div>
            </Html>
          )}

          {/* ─ REMOTE: Çalma progress bar ─ */}
          {!isLocal && stealProgress > 0 && !isLocked && (
            <Html
              position={[0, 4.3, 0]}
              center
              distanceFactor={12}
              zIndexRange={[30, 0]}
            >
              <div className="pointer-events-none flex flex-col items-center gap-1 rounded-xl bg-black/85 px-3 py-1.5 shadow-2xl">
                <div className="text-xs font-black text-yellow-300">
                  💎 ÇALIYOR...
                </div>
                <div className="h-1.5 w-28 rounded-full bg-gray-700">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{ width: `${stealProgress * 100}%` }}
                  />
                </div>
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// MOD SIGNS
// ═══════════════════════════════════════════════════════════════
function ModeSign({
  label,
  desc,
  active,
  position,
  onActivate,
}: {
  label: string
  desc: string
  active: boolean
  position: [number, number, number]
  onActivate: () => void
}) {
  const ref = useRef<Group>(null)
  const glowRef = useRef<Mesh>(null)
  const lastTapT = useRef(-10)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.1
    if (glowRef.current && active) {
      const s = 1 + Math.sin(t * 3) * 0.1
      glowRef.current.scale.set(s, s, s)
    }
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp || !ref.current) return
    const worldPos = ref.current.getWorldPosition(ref.current.position.clone())
    const dx = pp.x - worldPos.x
    const dz = pp.z - worldPos.z
    if (
      Math.hypot(dx, dz) < 2 &&
      Math.abs(pp.y - worldPos.y) < 3 &&
      t - lastTapT.current > 1.5 &&
      !active
    ) {
      lastTapT.current = t
      onActivate()
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh ref={glowRef} castShadow>
        <boxGeometry args={[4, 1.4, 0.3]} />
        <meshStandardMaterial
          color={active ? '#ffd60a' : '#4a5568'}
          emissive={active ? '#ffd60a' : '#000'}
          emissiveIntensity={active ? 0.8 : 0}
          toneMapped={false}
        />
      </mesh>
      <Html position={[0, 0, 0.2]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className={`pointer-events-none flex flex-col items-center whitespace-nowrap px-2 py-0.5 text-sm font-bold ${
            active ? 'text-black' : 'text-white'
          }`}
        >
          <div>{label}</div>
          <div className="text-[10px] opacity-80">{desc}</div>
        </div>
      </Html>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// BELT BRAINROT — konveyordaki karakterler, yakınlaşınca satın al
// ═══════════════════════════════════════════════════════════════
function BeltBrainrot({
  item,
  onBuy,
}: {
  item: BeltItem
  onBuy: (defId: string, price: number, fromX: number, fromZ: number) => void
}) {
  const groupRef = useRef<Group>(null)
  const def = useMemo(() => getBrainrotDef(item.defId), [item.defId])
  const { brainrotCash } = useGameStore()

  useFrame((state) => {
    if (!groupRef.current || !def) return
    const t = state.clock.elapsedTime
    const progress = Math.min(1, (t - item.spawnedAt) / CONVEYOR_TRAVEL_TIME)
    const x = CONVEYOR_START + (CONVEYOR_END - CONVEYOR_START) * progress
    groupRef.current.position.x = x
    groupRef.current.position.z = 0

    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const worldPos = groupRef.current.getWorldPosition(
      groupRef.current.position.clone()
    )
    const dx = pp.x - worldPos.x
    const dz = pp.z - worldPos.z
    const near = Math.hypot(dx, dz) < 2.5 && Math.abs(pp.y - worldPos.y) < 3.5
    if (near && brainrotCash >= def.price) {
      onBuy(def.id, def.price, x, 0)
    }
  })

  if (!def) return null
  const canAfford = brainrotCash >= def.price
  const rarityColor = RARITY_COLORS[def.rarity]

  return (
    <group ref={groupRef} position={[CONVEYOR_START, 0.2, 0]}>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshBasicMaterial color={rarityColor} transparent opacity={0.6} />
      </mesh>
      <BrainrotFigure def={def} idle />
      <Html position={[0, 3.8, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div
          className="pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center shadow-xl"
          style={{
            background: `linear-gradient(180deg, ${rarityColor}ee, ${rarityColor}99)`,
          }}
        >
          <div className="text-xs font-black text-white drop-shadow">
            {def.name}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-white">
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px]"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              {RARITY_LABELS[def.rarity].toUpperCase()}
            </span>
            <span>+{def.income.toLocaleString('tr')}💰/sn</span>
          </div>
          <div
            className={`rounded-md px-2 py-0.5 text-sm font-black ${
              canAfford ? 'bg-green-500 text-white' : 'bg-red-600 text-white'
            }`}
          >
            💰 {def.price.toLocaleString('tr')}{' '}
            {canAfford ? '→ Yaklaş!' : 'yetersiz'}
          </div>
        </div>
      </Html>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// WALKING BRAINROT — satın alınan karakter konveyordan eve yürür
// ═══════════════════════════════════════════════════════════════
function WalkingBrainrot({ item }: { item: WalkingItem }) {
  const groupRef = useRef<Group>(null)
  const def = useMemo(() => getBrainrotDef(item.defId), [item.defId])

  useFrame(() => {
    if (!groupRef.current || !def) return
    const nowS = performance.now() / 1000
    const progress = Math.min(1, (nowS - item.startT) / item.duration)
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2
    const x = item.from[0] + (item.to[0] - item.from[0]) * ease
    const z = item.from[2] + (item.to[2] - item.from[2]) * ease
    // Zıplama efekti — her adım 0.5s
    const bob = Math.abs(Math.sin(progress * Math.PI * 6)) * 0.35
    groupRef.current.position.set(x, item.from[1] + bob, z)
    // Yüz yönü
    const dx = item.to[0] - item.from[0]
    const dz = item.to[2] - item.from[2]
    groupRef.current.rotation.y = Math.atan2(dx, dz)
  })

  if (!def) return null

  return (
    <group ref={groupRef} position={item.from}>
      <BrainrotFigure def={def} idle={false} scale={0.9} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// TSUNAMI
// ═══════════════════════════════════════════════════════════════
function TsunamiWave() {
  const waveRef = useRef<Mesh>(null)
  const foamRef = useRef<Mesh>(null)
  const lastHitT = useRef(0)
  const [waveX, setWaveX] = useState(-40)

  useEffect(() => {
    let start = performance.now()
    let raf = 0
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      const progress = (elapsed / 14) % 1
      const x = -40 + progress * 80
      setWaveX(x)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useFrame((state) => {
    if (!waveRef.current) return
    const t = state.clock.elapsedTime
    waveRef.current.position.x = waveX
    if (foamRef.current) foamRef.current.position.x = waveX

    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp || !waveRef.current) return
    const wp = waveRef.current.getWorldPosition(waveRef.current.position.clone())
    const dx = pp.x - wp.x
    if (Math.abs(dx) < 2.5 && Math.abs(pp.y - wp.y) < 5) {
      if (t - lastHitT.current > 1) {
        lastHitT.current = t
        player?.takeHit(12, [Math.sign(waveX) * 15, 6, 0])
        spawnImpact(pp.x, pp.y + 0.5, pp.z, '#4aa3df', 2.5)
        playKo()
      }
    }
  })

  return (
    <>
      <mesh ref={waveRef} position={[-40, 4, 0]} castShadow>
        <boxGeometry args={[4, 8, 80]} />
        <meshStandardMaterial
          color="#2e9fd8"
          emissive="#1e90ff"
          emissiveIntensity={0.4}
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      <mesh ref={foamRef} position={[-40, 8.5, 0]}>
        <boxGeometry args={[4.5, 1, 81]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
      <Html position={[0, 10, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-xl font-black text-white shadow-xl">
          🌊 DALGADAN KAÇ!
        </div>
      </Html>
    </>
  )
}
