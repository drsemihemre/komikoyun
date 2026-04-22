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

// ─────────────────────────────────────────────────────────────
// STEAL A BRAINROT — Tam oyun
//   Ana dünyada mor portal → uzak bir ada (ZONE_CENTER)
//   Klasik mod: konveyordan satın al, slotta pasif gelir üret, sat, kilitle
//   Tsunami mod: dalgadan kaç, HP kaybet
//   Multiplayer: diğer oyuncuların slotlarını gör, kilitli değilse çal
// ─────────────────────────────────────────────────────────────

const MAIN_PORTAL: [number, number, number] = [0, 1.5, 60]
const ZONE_CENTER: [number, number, number] = [400, 150, 400]

const CONVEYOR_START = -18
const CONVEYOR_END = 18
const CONVEYOR_TRAVEL_TIME = 22
const SPAWN_INTERVAL = 4.5

// 8 base slot konumu — platformun çevresine dizili
const BASE_SLOTS: [number, number, number][] = [
  [-14, 0, -10],
  [-7, 0, -12],
  [0, 0, -13],
  [7, 0, -12],
  [14, 0, -10],
  [-14, 0, 10],
  [14, 0, 10],
  [0, 0, 13],
]

// Remote players için ayrı base'ler (her 50 birim yana bir base kolonu)
const REMOTE_BASE_OFFSET_X = 80

type BeltItem = {
  id: string
  defId: string
  spawnedAt: number
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

function GameZone() {
  const [cx, cy, cz] = ZONE_CENTER
  const [mode, setMode] = useState<'classic' | 'tsunami'>('classic')
  const [belt, setBelt] = useState<BeltItem[]>([])
  const [banner, setBanner] = useState<{ text: string; color: string } | null>(
    null
  )
  const lastSpawnRef = useRef(0)
  const earnTickRef = useRef(0)
  const syncTickRef = useRef(0)

  const { brainrotCash, brainrotOwned, brainrotBuy, brainrotEarn } =
    useGameStore()

  // Remote brainrots (başkalarının base'leri)
  const [, setTick] = useState(0)
  useEffect(() => {
    const unsub = subscribeMP(() => setTick((t) => t + 1))
    return unsub
  }, [])
  const remoteBases = getRemoteBrainrots()
  const myId = getMyId()

  // Stealing event notifications
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

  // Spawn + income + multiplayer sync loop
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (mode === 'classic' && t - lastSpawnRef.current > SPAWN_INTERVAL) {
      lastSpawnRef.current = t
      const def = randomBrainrot()
      setBelt((prev) => [
        ...prev.slice(-9),
        { id: `b${Date.now()}_${Math.random()}`, defId: def.id, spawnedAt: t },
      ])
    }

    // Pasif gelir
    if (t - earnTickRef.current > 1) {
      earnTickRef.current = t
      const totalIncome = brainrotOwned.reduce((sum, o) => {
        const def = getBrainrotDef(o.defId)
        return sum + (def?.income ?? 0)
      }, 0)
      if (totalIncome > 0) brainrotEarn(totalIncome)
    }

    // Server sync (her 1.5 sn)
    if (t - syncTickRef.current > 1.5) {
      syncTickRef.current = t
      const { brainrotCash: cash, brainrotOwned: owned } =
        useGameStore.getState()
      sendBrainrotState(cash, owned)
    }

    // Eski belt item'larını temizle
    setBelt((prev) =>
      prev.filter((it) => t - it.spawnedAt < CONVEYOR_TRAVEL_TIME)
    )
  })

  // Remote player'ları sağa/sola yayılan kolonlar halinde yerleştir
  const remoteLayout = useMemo(() => {
    return remoteBases
      .filter((r) => r.id !== myId && r.owned.length > 0)
      .slice(0, 6)
      .map((r, idx) => {
        // Her remote base yan yana: -2..-1..1..2 gibi sıralı
        const side = idx % 2 === 0 ? -1 : 1
        const step = Math.floor(idx / 2) + 1
        const offsetX = side * REMOTE_BASE_OFFSET_X * step
        return { ...r, offsetX }
      })
  }, [remoteBases, myId])

  return (
    <group position={[cx, cy, cz]}>
      {/* Ana platform */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[30, 0.5, 25]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[60, 1, 50]} />
          <meshToonMaterial color="#ff77ee" />
        </mesh>
        <mesh position={[0, -2, 0]} castShadow>
          <cylinderGeometry args={[25, 22, 3, 32]} />
          <meshToonMaterial color="#a84ed0" />
        </mesh>
      </RigidBody>

      {/* Başlık */}
      <mesh position={[0, 6, 20]} castShadow>
        <boxGeometry args={[22, 3.8, 0.4]} />
        <meshToonMaterial color="#ff006e" />
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
        <meshToonMaterial color="#1f2937" />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const x = -20 + i * 4.4
        return (
          <mesh key={`cline${i}`} position={[x, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        )
      })}

      {/* Base slotları */}
      {BASE_SLOTS.map((s, i) => (
        <BaseSlot key={i} slotIdx={i} position={s} />
      ))}

      {/* Shop alanı — SAT tabelası */}
      <SellZone position={[-22, 0, 16]} />
      <SellZone position={[22, 0, 16]} />

      {/* Konveyordaki brainrotlar */}
      {mode === 'classic' &&
        belt.map((item) => (
          <BeltBrainrot
            key={item.id}
            item={item}
            onBuy={(defId, price) => {
              if (brainrotBuy(defId, price)) {
                setBelt((prev) => prev.filter((b) => b.id !== item.id))
                playPotion('grow')
              }
            }}
          />
        ))}

      {/* Tsunami dalgası */}
      {mode === 'tsunami' && <TsunamiWave />}

      {/* Cash HUD */}
      <Html position={[0, 4, 18]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-lg font-black text-black shadow-xl">
          💰 {Math.floor(brainrotCash)}
        </div>
      </Html>

      {/* Stealing banner */}
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

      {/* REMOTE PLAYER BASE'LERİ */}
      {remoteLayout.map((r) => (
        <RemotePlayerBase key={r.id} remote={r} />
      ))}
    </group>
  )
}

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

function BeltBrainrot({
  item,
  onBuy,
}: {
  item: BeltItem
  onBuy: (defId: string, price: number) => void
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
      onBuy(def.id, def.price)
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
            <span>+{def.income}💰/sn</span>
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

function BaseSlot({
  slotIdx,
  position,
}: {
  slotIdx: number
  position: [number, number, number]
}) {
  const { brainrotOwned, brainrotLockSlot, brainrotCash } = useGameStore()
  const owned = brainrotOwned.find((o) => o.slotIdx === slotIdx)
  const def = owned ? getBrainrotDef(owned.defId) : null
  const lastTapT = useRef(-10)

  useFrame((state) => {
    if (!owned) return
    const t = state.clock.elapsedTime
    const nowS = Date.now() / 1000
    const isLocked = owned.lockedUntil > nowS
    if (isLocked) return
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dz = pp.z - position[2]
    if (Math.hypot(dx, dz) < 1.5 && Math.abs(pp.y - position[1]) < 3) {
      if (brainrotCash >= 50 && t - lastTapT.current > 3) {
        lastTapT.current = t
        brainrotLockSlot(slotIdx)
        playPotion('grow')
      }
    }
  })

  const isLocked = owned ? owned.lockedUntil > Date.now() / 1000 : false

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.2, 0.3, 1.2]} position={[0, 0.3, 0]} />
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.3, 1.5, 0.6, 12]} />
          <meshToonMaterial color={owned ? '#ffd60a' : '#4a5568'} />
        </mesh>
      </RigidBody>
      <Html position={[0, 0.7, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className="pointer-events-none text-lg font-black text-white drop-shadow">
          {slotIdx + 1}
        </div>
      </Html>
      {def && (
        <group position={[0, 0.7, 0]}>
          <BrainrotFigure def={def} idle={false} />
          <Html position={[0, 3.8, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
            <div className="pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-xs text-white shadow">
              <div className="font-bold">{def.name}</div>
              <div className="text-[10px] text-yellow-300">
                +{def.income.toLocaleString('tr')}💰/sn
              </div>
              {isLocked ? (
                <div className="text-[9px] text-green-300">
                  🔒 Kilitli ({Math.ceil((owned!.lockedUntil - Date.now() / 1000))}s)
                </div>
              ) : (
                <div className="text-[9px] text-orange-300">
                  Kilitlemek için üstüne gel (−50💰)
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════
// SAT alanı — yaklaşıp E ile son slotunu satar
// Basit yaklaşım: HTML'de tıklanabilir sell butonu ile her slot satılabilir
// ═══════════════════════════════════════════════════════════
function SellZone({ position }: { position: [number, number, number] }) {
  const glowRef = useRef<Mesh>(null)
  const lastActT = useRef(-10)
  const [expanded, setExpanded] = useState(false)
  const { brainrotOwned, brainrotSell, brainrotEarn } = useGameStore()
  const [recentSold, setRecentSold] = useState<string | null>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (glowRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.05
      glowRef.current.scale.set(s, s, s)
    }
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dz = pp.z - position[2]
    const near = Math.hypot(dx, dz) < 3 && Math.abs(pp.y - position[1]) < 3
    if (near !== expanded && t - lastActT.current > 0.3) {
      lastActT.current = t
      setExpanded(near)
    }
  })

  const handleSell = (slotIdx: number) => {
    const owned = brainrotOwned.find((o) => o.slotIdx === slotIdx)
    if (!owned) return
    const def = getBrainrotDef(owned.defId)
    if (!def) return
    const price = sellPriceFor(def)
    if (brainrotSell(slotIdx)) {
      brainrotEarn(price)
      setRecentSold(`${def.name} → +${price.toLocaleString('tr')} 💰`)
      playPotion('grow')
      setTimeout(() => setRecentSold(null), 2500)
    }
  }

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <boxGeometry args={[3, 2, 0.4]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      <Html position={[0, 1.6, 0.3]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md bg-green-700 px-2 py-1 text-sm font-black text-white shadow">
          💰 SHOP — SAT
        </div>
      </Html>
      {expanded && brainrotOwned.length > 0 && (
        <Html position={[0, 4, 0.3]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <div
            className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-xl bg-black/90 p-3 text-white shadow-2xl"
            style={{ minWidth: '300px' }}
          >
            <div className="mb-1 text-center text-sm font-black">
              💸 Karakter Sat (%60 geri al)
            </div>
            {brainrotOwned.map((o) => {
              const def = getBrainrotDef(o.defId)
              if (!def) return null
              const sellPrice = sellPriceFor(def)
              const rarityColor = RARITY_COLORS[def.rarity]
              return (
                <button
                  key={o.id}
                  onClick={() => handleSell(o.slotIdx)}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-800 px-3 py-2 text-left hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: rarityColor }}
                    />
                    <div>
                      <div className="text-xs font-bold">{def.name}</div>
                      <div className="text-[10px] opacity-70">
                        slot {o.slotIdx + 1} · {RARITY_LABELS[def.rarity]}
                      </div>
                    </div>
                  </div>
                  <div className="rounded bg-green-600 px-2 py-1 text-xs font-black">
                    +{sellPrice.toLocaleString('tr')} 💰
                  </div>
                </button>
              )
            })}
          </div>
        </Html>
      )}
      {recentSold && (
        <Html position={[0, 3, 0.3]} center distanceFactor={10} zIndexRange={[20, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg bg-green-600 px-3 py-1.5 text-sm font-black text-white shadow-xl">
            ✅ {recentSold}
          </div>
        </Html>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════
// TSUNAMI dalgası
// ═══════════════════════════════════════════════════════════
function TsunamiWave() {
  const waveRef = useRef<Mesh>(null)
  const foamRef = useRef<Mesh>(null)
  const lastHitT = useRef(0)
  const [waveX, setWaveX] = useState(-30)

  useEffect(() => {
    let start = performance.now()
    let raf = 0
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000
      const progress = (elapsed / 12) % 1
      const x = -30 + progress * 60
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
      <mesh ref={waveRef} position={[-30, 4, 0]} castShadow>
        <boxGeometry args={[4, 8, 50]} />
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
      <mesh ref={foamRef} position={[-30, 8.5, 0]}>
        <boxGeometry args={[4.5, 1, 51]} />
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

// ═══════════════════════════════════════════════════════════
// REMOTE PLAYER BASE — diğer oyuncunun slot'ları
// Oyuncu yaklaşıp üzerine F basarsa (auto-tetik) kilitli değilse çalar
// ═══════════════════════════════════════════════════════════
function RemotePlayerBase({
  remote,
}: {
  remote: RemoteBrainrotState & { offsetX: number }
}) {
  return (
    <group position={[remote.offsetX, 0, 0]}>
      {/* Platform */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[22, 0.5, 18]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[44, 1, 36]} />
          <meshToonMaterial color="#fef3c7" />
        </mesh>
      </RigidBody>

      {/* Nickname */}
      <Html position={[0, 6, 14]} center distanceFactor={16} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-1.5 text-base font-black text-white shadow-xl">
          🏠 {remote.nickname}'in Bazası
        </div>
      </Html>

      {/* Slot'lar */}
      {BASE_SLOTS.map((s, i) => {
        const owned = remote.owned.find((o) => o.slotIdx === i)
        return (
          <RemoteSlot
            key={`rs${remote.id}-${i}`}
            slotIdx={i}
            position={s}
            owned={owned ?? null}
            victimId={remote.id}
          />
        )
      })}
    </group>
  )
}

function RemoteSlot({
  slotIdx,
  position,
  owned,
  victimId,
}: {
  slotIdx: number
  position: [number, number, number]
  owned: { defId: string; lockedUntil: number } | null
  victimId: string
}) {
  const lastStealT = useRef(-10)
  const def = owned ? getBrainrotDef(owned.defId) : null
  const isLocked = owned ? owned.lockedUntil > Date.now() / 1000 : false

  useFrame((state) => {
    if (!owned || isLocked) return
    const t = state.clock.elapsedTime
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    // offsetX parent group'ta olduğu için bu relatif pozisyon yeterli değil
    // → parent'ın worldPosition'ına göre hesaplama gerek.
    // Kolay yol: iki coordinate sistemini bileştirip distance ölç
    const player2Dx = pp.x
    const player2Dz = pp.z
    // Not: Zone ve parent offset burada bilinmiyor, en güvenlisi:
    // Steal tetiğini sadece çok yakınsa (2m) ve 5sn cooldown'la bırak
    if (t - lastStealT.current > 5) {
      // Basit proxy: oyuncu uzak sahanda değilse yaklaşım aralığını geniş tut
      const zoneSize = 30
      if (Math.abs(player2Dx) < 1000 && Math.abs(player2Dz) < 1000) {
        // Yakın çal tetiği için distance'ı daha hassas yap — parent pozisyonu
        // component'a prop olarak verilmedi, bu yüzden useFrame'de world space'e göre çalıştıralım:
        // Bu hesabı parent group worldPosition'a göre yapalım:
        // (state.scene'de bir ref lazım, ama basit tutmak için yaklaşımı kaldırıyorum)
      }
    }
  })

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.2, 0.3, 1.2]} position={[0, 0.3, 0]} />
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.3, 1.5, 0.6, 12]} />
          <meshToonMaterial color={owned ? (isLocked ? '#dc2626' : '#f97316') : '#52525b'} />
        </mesh>
      </RigidBody>
      <Html position={[0, 0.7, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className="pointer-events-none text-lg font-black text-white drop-shadow">
          {slotIdx + 1}
        </div>
      </Html>
      {def && (
        <group position={[0, 0.7, 0]}>
          <BrainrotFigure def={def} idle={false} />
          <StealTrigger
            victimId={victimId}
            slotIdx={slotIdx}
            isLocked={isLocked}
            defName={def.name}
          />
        </group>
      )}
    </group>
  )
}

// StealTrigger — oyuncu yakınsa 3 sn hover sonrası çalma işlemi
function StealTrigger({
  victimId,
  slotIdx,
  isLocked,
  defName,
}: {
  victimId: string
  slotIdx: number
  isLocked: boolean
  defName: string
}) {
  const group = useRef<Group>(null)
  const lastStealT = useRef(-10)
  const stealStartT = useRef<number | null>(null)
  const [hoverProgress, setHoverProgress] = useState(0)

  useFrame((state) => {
    if (isLocked || !group.current) {
      setHoverProgress(0)
      stealStartT.current = null
      return
    }
    const t = state.clock.elapsedTime
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const worldPos = group.current.getWorldPosition(group.current.position.clone())
    const dx = pp.x - worldPos.x
    const dy = pp.y - worldPos.y
    const dz = pp.z - worldPos.z
    const dist = Math.hypot(dx, dz)

    if (dist < 2.5 && Math.abs(dy) < 3.5) {
      if (stealStartT.current === null) stealStartT.current = t
      const elapsed = t - stealStartT.current
      const STEAL_DURATION = 3
      setHoverProgress(Math.min(1, elapsed / STEAL_DURATION))
      if (elapsed >= STEAL_DURATION && t - lastStealT.current > 5) {
        lastStealT.current = t
        stealStartT.current = null
        setHoverProgress(0)
        sendBrainrotSteal(victimId, slotIdx)
        playLaunch()
      }
    } else {
      stealStartT.current = null
      if (hoverProgress > 0) setHoverProgress(0)
    }
  })

  return (
    <group ref={group}>
      <Html position={[0, 3.8, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <div className="pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-xs text-white shadow">
          <div className="font-bold">{defName}</div>
          {isLocked ? (
            <div className="text-[10px] text-red-400">🔒 KİLİTLİ</div>
          ) : hoverProgress > 0 ? (
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-yellow-300">💎 ÇALIYOR...</div>
              <div className="mt-0.5 h-1.5 w-24 rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all"
                  style={{ width: `${hoverProgress * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-orange-300">
              3sn dur → çal
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
