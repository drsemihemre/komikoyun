'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore, type PuzzleProgress } from '@/lib/store'
import { playLaunch, playPotion, playKo } from '@/lib/sounds'
import { spawnImpact } from '@/lib/particles'

// ═══════════════════════════════════════════════════════════════
//   KAÇIRILAN AKRABA — Bulmaca / Kurtarma Modu
//   - Başlangıç alanında posterli giriş portalı
//   - Uzak bir "kaçıranın inine" ışınlar
//   - 4 renkli anahtar gizli: çekmecede, dolabın arkasında,
//     vidalı kapağın açtığı merdivenin tepesinde, ikinci çekmecede
//   - 🔧 İngiliz anahtarı vidalı kapağı söker → merdiven yükselir
//   - 4 anahtarla kafes açılır → akraba kurtarılır → ödül
// ═══════════════════════════════════════════════════════════════

// Bulmaca alanı merkezi (haritadan çok uzakta, kendi platformu)
const PZONE: [number, number, number] = [-400, 0, -400]
const [CX, , CZ] = PZONE

// Başlangıç alanındaki giriş portalı
const ENTRANCE: [number, number, number] = [14, 1.5, 8]
// Portala girince varış noktası (dönüş portalından uzakta)
const ZONE_ARRIVAL: [number, number, number] = [CX, 1.5, CZ + 12]
// Bulmaca alanındaki dönüş portalı
const RETURN_PORTAL: [number, number, number] = [CX, 1.5, CZ + 18]
const RETURN_DEST: [number, number, number] = [ENTRANCE[0], 1.5, ENTRANCE[2] - 4]

const KEY_COLOR_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}
const KEY_LABEL: Record<string, string> = {
  red: '🔴 Kırmızı',
  blue: '🔵 Mavi',
  green: '🟢 Yeşil',
  yellow: '🟡 Sarı',
}

type Banner = { text: string; color: string }

// Etkileşim noktası tanımı — sadece o an "görünür" olanlar döner
type Interactable = {
  id: string
  pos: [number, number, number] // dünya koordinatı
  radius: number
  prompt: string
  actionable: boolean // E bir şey yapıyor mu
  run?: (setBanner: (b: Banner | null) => void) => void
}

function flash(setBanner: (b: Banner | null) => void, text: string, color: string, ms = 2200) {
  setBanner({ text, color })
  setTimeout(() => setBanner(null), ms)
}

// O anki bulmaca durumuna göre etkileşilebilir nesneleri üret
function getInteractables(p: PuzzleProgress): Interactable[] {
  const list: Interactable[] = []
  const w = (rx: number, ry: number, rz: number): [number, number, number] => [
    CX + rx,
    ry,
    CZ + rz,
  ]

  // ─── Çekmece A → Kırmızı anahtar ───
  if (!p.drawers.includes('a')) {
    list.push({
      id: 'drawer_a',
      pos: w(-12, 1, 7),
      radius: 3,
      prompt: '🗄️ Çekmeceyi aç',
      actionable: true,
      run: (sb) => {
        useGameStore.getState().puzzleOpenDrawer('a')
        playPotion('shrink')
        flash(sb, '🔴 Çekmeceden kırmızı anahtar çıktı!', '#ef4444')
      },
    })
  } else if (!p.keys.includes('red')) {
    list.push({
      id: 'key_red',
      pos: w(-12, 1.3, 7.6),
      radius: 2.6,
      prompt: '🔴 Kırmızı anahtarı al',
      actionable: true,
      run: (sb) => collectKey('red', sb),
    })
  }

  // ─── Dolap → arkasında Mavi anahtar ───
  if (!p.cabinet) {
    list.push({
      id: 'cabinet',
      pos: w(-19, 1, -2),
      radius: 3.2,
      prompt: '🪑 Dolabı it',
      actionable: true,
      run: (sb) => {
        useGameStore.getState().puzzleMoveCabinet()
        playPotion('shrink')
        flash(sb, '🔵 Dolabın arkasında mavi anahtar var!', '#3b82f6')
      },
    })
  } else if (!p.keys.includes('blue')) {
    list.push({
      id: 'key_blue',
      pos: w(-19, 0.8, -4.2),
      radius: 2.6,
      prompt: '🔵 Mavi anahtarı al',
      actionable: true,
      run: (sb) => collectKey('blue', sb),
    })
  }

  // ─── Tezgah → İngiliz anahtarı ───
  if (!p.wrench) {
    list.push({
      id: 'wrench',
      pos: w(12, 1.1, 7),
      radius: 2.8,
      prompt: '🔧 İngiliz anahtarını al',
      actionable: true,
      run: (sb) => {
        useGameStore.getState().puzzleCollectWrench()
        playPotion('grow')
        flash(sb, '🔧 İngiliz anahtarı alındı! Vidalı kapağı sökebilirsin.', '#f59e0b', 3000)
      },
    })
  }

  // ─── Vidalı kapak → merdiven ───
  if (!p.stairs) {
    list.push({
      id: 'hatch',
      pos: w(14, 1, -6.5),
      radius: 3,
      prompt: p.wrench ? '🔧 Vidaları sök' : '🔩 Önce İngiliz anahtarı bul',
      actionable: p.wrench,
      run: (sb) => {
        if (useGameStore.getState().puzzleOpenStairs()) {
          playLaunch()
          spawnImpact(CX + 14, 1, CZ - 8, '#f59e0b', 3)
          flash(sb, '🪜 Vidalar söküldü — merdiven yükseldi!', '#22c55e', 3000)
        }
      },
    })
  } else if (!p.keys.includes('green')) {
    // ─── Merdiven tepesi → Yeşil anahtar ───
    list.push({
      id: 'key_green',
      pos: w(14, 6.7, -17.5),
      radius: 2.8,
      prompt: '🟢 Yeşil anahtarı al',
      actionable: true,
      run: (sb) => collectKey('green', sb),
    })
  }

  // ─── Çekmece B → Sarı anahtar ───
  if (!p.drawers.includes('b')) {
    list.push({
      id: 'drawer_b',
      pos: w(-11, 1, -15),
      radius: 3,
      prompt: '🗄️ Çekmeceyi aç',
      actionable: true,
      run: (sb) => {
        useGameStore.getState().puzzleOpenDrawer('b')
        playPotion('shrink')
        flash(sb, '🟡 Çekmeceden sarı anahtar çıktı!', '#eab308')
      },
    })
  } else if (!p.keys.includes('yellow')) {
    list.push({
      id: 'key_yellow',
      pos: w(-11, 1.3, -15.6),
      radius: 2.6,
      prompt: '🟡 Sarı anahtarı al',
      actionable: true,
      run: (sb) => collectKey('yellow', sb),
    })
  }

  // ─── Kafes → Akrabayı kurtar ───
  if (!p.solved) {
    const have = p.keys.length
    const ready = have >= 4
    list.push({
      id: 'cage',
      pos: w(0, 1.2, -10),
      radius: 4,
      prompt: ready
        ? '🔓 Akrabayı KURTAR!'
        : `🔒 ${4 - have} anahtar daha lazım`,
      actionable: ready,
      run: (sb) => {
        if (useGameStore.getState().puzzleSolve()) {
          playKo()
          playLaunch()
          for (let i = 0; i < 6; i++) {
            spawnImpact(
              CX + (Math.random() - 0.5) * 6,
              1 + Math.random() * 3,
              CZ - 10 + (Math.random() - 0.5) * 4,
              ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i % 4],
              3
            )
          }
          flash(sb, '🎉 Akraban kurtuldu! +500.000 💰', '#22c55e', 6000)
          useGameStore.getState().brainrotEarn(500000)
          useGameStore.getState().addScore(1000)
        }
      },
    })
  }

  return list
}

function collectKey(color: string, setBanner: (b: Banner | null) => void) {
  if (useGameStore.getState().puzzleCollectKey(color)) {
    playPotion('grow')
    spawnImpact(0, 0, 0, KEY_COLOR_HEX[color], 1) // ses/efekt; pozisyon önemsiz
    flash(setBanner, `${KEY_LABEL[color]} anahtar alındı!`, KEY_COLOR_HEX[color])
  }
}

export default function PuzzleZone() {
  return (
    <>
      <Portal
        position={ENTRANCE}
        destination={ZONE_ARRIVAL}
        label="🔒 KAÇIRILAN AKRABA"
        sublabel="Bulmacaları çöz, kurtar!"
        frameColor="#a855f7"
        innerColor="#7c3aed"
        poster
      />
      <Lair />
      <Portal
        position={RETURN_PORTAL}
        destination={RETURN_DEST}
        label="🚪 Dünyaya Dön"
        frameColor="#ffd60a"
        innerColor="#4cc9f0"
      />
    </>
  )
}

// ───────────────────────────────────────────────────────────────
//  Bulmaca alanı içeriği + etkileşim mantığı
// ───────────────────────────────────────────────────────────────
function Lair() {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [nearest, setNearest] = useState<{
    pos: [number, number, number]
    prompt: string
  } | null>(null)
  const nearestIdRef = useRef<string | null>(null)

  const solved = useGameStore((s) => s.puzzle.solved)
  const stairsOpen = useGameStore((s) => s.puzzle.stairs)
  const cabinetMoved = useGameStore((s) => s.puzzle.cabinet)
  const drawerA = useGameStore((s) => s.puzzle.drawers.includes('a'))
  const drawerB = useGameStore((s) => s.puzzle.drawers.includes('b'))
  const wrenchTaken = useGameStore((s) => s.puzzle.wrench)
  const keys = useGameStore((s) => s.puzzle.keys)

  // Yakınlık taraması → en yakın etkileşim noktası → prompt + store
  useFrame(() => {
    const player = getPlayerHandle()?.getPos()
    const state = useGameStore.getState()
    const inZone = player
      ? Math.hypot(player.x - CX, player.z - CZ) < 32
      : false
    state.setPuzzleActive(inZone)

    if (!inZone || !player) {
      if (nearestIdRef.current !== null) {
        nearestIdRef.current = null
        setNearest(null)
        state.setPuzzlePrompt(null)
      }
      return
    }

    const list = getInteractables(state.puzzle)
    let best: Interactable | null = null
    let bestD = Infinity
    for (const it of list) {
      const d = Math.hypot(
        player.x - it.pos[0],
        (player.y - it.pos[1]) * 0.6,
        player.z - it.pos[2]
      )
      if (d < it.radius && d < bestD) {
        bestD = d
        best = it
      }
    }

    const newId = best?.id ?? null
    if (newId !== nearestIdRef.current) {
      nearestIdRef.current = newId
      setNearest(best ? { pos: best.pos, prompt: best.prompt } : null)
      state.setPuzzlePrompt(best ? best.prompt : null)
    }
  })

  // E tuşu (ve mobil buton dispatch) → en yakın etkileşilebilir noktayı çalıştır
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted || state.paused) return
      const player = getPlayerHandle()?.getPos()
      if (!player) return
      if (Math.hypot(player.x - CX, player.z - CZ) >= 32) return
      const list = getInteractables(state.puzzle)
      let best: Interactable | null = null
      let bestD = Infinity
      for (const it of list) {
        if (!it.actionable || !it.run) continue
        const d = Math.hypot(
          player.x - it.pos[0],
          (player.y - it.pos[1]) * 0.6,
          player.z - it.pos[2]
        )
        if (d < it.radius && d < bestD) {
          bestD = d
          best = it
        }
      }
      best?.run?.(setBanner)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <group position={PZONE}>
      {/* ── Zemin ── */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[23, 0.5, 23]} position={[0, -0.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[46, 1, 46]} />
          <meshToonMaterial color="#3a2f3f" />
        </mesh>
        {/* Çevre duvarları */}
        {([
          [0, 3.5, -22.5, 46, 0.6],
          [0, 3.5, 22.5, 46, 0.6],
          [-22.5, 3.5, 0, 0.6, 46],
          [22.5, 3.5, 0, 0.6, 46],
        ] as const).map(([x, y, z, w, d], i) => (
          <group key={i}>
            <CuboidCollider args={[w / 2, 3.5, d / 2]} position={[x, y, z]} />
            <mesh position={[x, y, z]} castShadow receiveShadow>
              <boxGeometry args={[w, 7, d]} />
              <meshToonMaterial color="#2a2030" />
            </mesh>
          </group>
        ))}
      </RigidBody>

      {/* Atmosfer ışıkları (meşale) */}
      <pointLight position={[-16, 5, -16]} intensity={18} distance={28} color="#ff8c42" />
      <pointLight position={[16, 5, -16]} intensity={18} distance={28} color="#ff8c42" />
      <pointLight position={[0, 6, 10]} intensity={14} distance={26} color="#c084fc" />

      {/* Tabela */}
      <Html position={[0, 6.2, 20]} center distanceFactor={20} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-5 py-2 text-base font-black text-white shadow-xl">
          😈 Kaçıranın İni — anahtarları bul, akrabanı kurtar!
        </div>
      </Html>

      {/* ── Çekmece A (kırmızı) ── */}
      <Dresser position={[-12, 0, 8]} open={drawerA} keyColor="red" />

      {/* ── Dolap (mavi anahtar arkada) ── */}
      <Cabinet position={[-19, 0, -2.5]} moved={cabinetMoved} hasKey={!keys.includes('blue')} />

      {/* ── Tezgah + İngiliz anahtarı ── */}
      <Workbench position={[12, 0, 8]} wrenchTaken={wrenchTaken} />

      {/* ── Vidalı kapak + merdiven ── */}
      <BoltedStairs open={stairsOpen} hasKey={!keys.includes('green')} />

      {/* ── Çekmece B (sarı) ── */}
      <Dresser position={[-11, 0, -15.6]} open={drawerB} keyColor="yellow" />

      {/* ── Kafes + akraba ── */}
      <Cage position={[0, 0, -12]} keys={keys} solved={solved} />

      {/* En yakın etkileşim prompt'u */}
      {nearest && (
        <Html
          position={[nearest.pos[0] - CX, nearest.pos[1] + 1.6, nearest.pos[2] - CZ]}
          center
          distanceFactor={11}
          zIndexRange={[10, 0]}
        >
          <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-lg bg-yellow-400/95 px-3 py-1 text-sm font-black text-black shadow-xl">
            <span className="rounded border border-black bg-white px-1.5">E</span>
            <span>{nearest.prompt}</span>
          </div>
        </Html>
      )}

      {/* Olay banner'ı */}
      {banner && (
        <Html position={[0, 9, 8]} center distanceFactor={18} zIndexRange={[20, 0]}>
          <div
            className="pointer-events-none whitespace-nowrap rounded-2xl px-6 py-3 text-lg font-black text-white shadow-2xl"
            style={{ backgroundColor: banner.color }}
          >
            {banner.text}
          </div>
        </Html>
      )}
    </group>
  )
}

// ───────────────────────────────────────────────────────────────
//  3D parçalar (hepsi PZONE merkezine relatif)
// ───────────────────────────────────────────────────────────────

// Yüzen, dönen anahtar
function FloatingKey({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (!ref.current) return
    ref.current.rotation.y = s.clock.elapsedTime * 2
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 2.5) * 0.15
  })
  return (
    <group ref={ref} position={position}>
      {/* halka */}
      <mesh castShadow>
        <torusGeometry args={[0.18, 0.06, 8, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      {/* sap */}
      <mesh position={[0, -0.32, 0]} castShadow>
        <boxGeometry args={[0.09, 0.4, 0.09]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      {/* dişler */}
      <mesh position={[0.1, -0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 0.08, 0.09]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Çekmeceli dolap — açıkken çekmece dışarı kayar + anahtar görünür
function Dresser({
  position,
  open,
  keyColor,
}: {
  position: [number, number, number]
  open: boolean
  keyColor: string
}) {
  const drawerRef = useRef<Group>(null)
  useFrame(() => {
    if (!drawerRef.current) return
    const target = open ? 1.0 : 0
    drawerRef.current.position.z +=
      (target - drawerRef.current.position.z) * 0.15
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.3, 1, 0.9]} position={[0, 1, 0]} />
        {/* gövde */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 2, 1.8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
      </RigidBody>
      {/* çekmece */}
      <group ref={drawerRef} position={[0, 1, 0]}>
        <mesh position={[0, 0, 0.95]} castShadow>
          <boxGeometry args={[2.2, 0.7, 0.5]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[0, 0, 1.22]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#3e2723" />
        </mesh>
      </group>
      {open && (
        <FloatingKey position={[0, 1.5, 1.6]} color={KEY_COLOR_HEX[keyColor]} />
      )}
    </group>
  )
}

// Dolap — itildiğinde yana kayar, arkasında anahtar
function Cabinet({
  position,
  moved,
  hasKey,
}: {
  position: [number, number, number]
  moved: boolean
  hasKey: boolean
}) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const target = moved ? 3.2 : 0
    ref.current.position.x += (target - ref.current.position.x) * 0.12
  })
  return (
    <group position={position}>
      {/* anahtar (arkada, duvara yakın) */}
      {moved && hasKey && (
        <FloatingKey position={[0, 0.9, -1.6]} color={KEY_COLOR_HEX.blue} />
      )}
      <group ref={ref}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1.1, 1.8, 0.7]} position={[0, 1.8, 0]} />
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 3.6, 1.4]} />
            <meshToonMaterial color="#4e342e" />
          </mesh>
          {/* kapaklar */}
          <mesh position={[-0.5, 1.8, 0.72]}>
            <boxGeometry args={[0.9, 3.2, 0.06]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          <mesh position={[0.5, 1.8, 0.72]}>
            <boxGeometry args={[0.9, 3.2, 0.06]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
        </RigidBody>
      </group>
    </group>
  )
}

// Tezgah + İngiliz anahtarı
function Workbench({
  position,
  wrenchTaken,
}: {
  position: [number, number, number]
  wrenchTaken: boolean
}) {
  const wrenchRef = useRef<Group>(null)
  useFrame((s) => {
    if (!wrenchRef.current) return
    wrenchRef.current.rotation.y = s.clock.elapsedTime * 1.5
    wrenchRef.current.position.y = 1.35 + Math.sin(s.clock.elapsedTime * 3) * 0.1
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.5, 0.55, 0.8]} position={[0, 0.55, 0]} />
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 1.1, 1.6]} />
          <meshToonMaterial color="#5d4037" />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <boxGeometry args={[3.1, 0.12, 1.7]} />
          <meshToonMaterial color="#795548" />
        </mesh>
      </RigidBody>
      {!wrenchTaken && (
        <group ref={wrenchRef} position={[0, 1.35, 0]}>
          {/* İngiliz anahtarı gövdesi */}
          <mesh castShadow rotation={[0, 0, Math.PI / 5]}>
            <boxGeometry args={[0.16, 1.0, 0.12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0.18, 0.42, 0]} rotation={[0, 0, Math.PI / 5]}>
            <torusGeometry args={[0.16, 0.06, 6, 12, Math.PI * 1.4]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
          </mesh>
          <Html position={[0, 0.8, 0]} center distanceFactor={14} zIndexRange={[9, 0]}>
            <div className="pointer-events-none rounded-full bg-amber-400/90 px-2 py-0.5 text-xs font-black text-black shadow">
              🔧 Alet
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

// Vidalı kapak + (açılınca) merdiven & ledge + yeşil anahtar
function BoltedStairs({ open, hasKey }: { open: boolean; hasKey: boolean }) {
  const STEPS = 12
  return (
    <group position={[14, 0, 0]}>
      {/* Vidalı kapak (kapalıyken) */}
      {!open && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[1.6, 1, 0.25]} position={[0, 1, -6.5]} />
          <mesh position={[0, 1, -6.5]} castShadow receiveShadow>
            <boxGeometry args={[3.2, 2, 0.4]} />
            <meshToonMaterial color="#52525b" />
          </mesh>
          {/* vidalar */}
          {[
            [-1.2, 1.7],
            [1.2, 1.7],
            [-1.2, 0.3],
            [1.2, 0.3],
          ].map(([bx, by], i) => (
            <mesh key={i} position={[bx, by, -6.28]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.1, 6]} />
              <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </RigidBody>
      )}

      {/* Merdiven + ledge (açıkken) */}
      {open && (
        <RigidBody type="fixed" colliders={false}>
          {Array.from({ length: STEPS }).map((_, i) => {
            const h = 0.5 * (i + 1)
            const z = -7 - i * 0.75
            return (
              <group key={i}>
                <CuboidCollider args={[1.6, h / 2, 0.42]} position={[0, h / 2, z]} />
                <mesh position={[0, h / 2, z]} castShadow receiveShadow>
                  <boxGeometry args={[3.2, h, 0.85]} />
                  <meshToonMaterial color={i % 2 ? '#6d4c41' : '#795548'} />
                </mesh>
              </group>
            )
          })}
          {/* tepe platformu (ledge) */}
          <CuboidCollider args={[2.2, 0.3, 2.2]} position={[0, 5.7, -17.5]} />
          <mesh position={[0, 5.7, -17.5]} castShadow receiveShadow>
            <boxGeometry args={[4.4, 0.6, 4.4]} />
            <meshToonMaterial color="#8d6e63" />
          </mesh>
        </RigidBody>
      )}

      {/* Yeşil anahtar (ledge üstünde) */}
      {open && hasKey && (
        <FloatingKey position={[0, 6.7, -17.5]} color={KEY_COLOR_HEX.green} />
      )}
    </group>
  )
}

// Kafes + kaçırılan akraba
function Cage({
  position,
  keys,
  solved,
}: {
  position: [number, number, number]
  keys: string[]
  solved: boolean
}) {
  const barRef = useRef<Group>(null)
  useFrame(() => {
    if (!barRef.current) return
    // çözülünce ön parmaklıklar yana açılır
    const target = solved ? -2.4 : 0
    barRef.current.position.x += (target - barRef.current.position.x) * 0.1
  })
  const BARS = 6
  return (
    <group position={position}>
      {/* taban */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[5, 0.1, 5]} />
        <meshToonMaterial color="#1f2937" />
      </mesh>

      {/* üst çerçeve */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[5.2, 0.3, 5.2]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* arka + yan parmaklıklar (sabit) */}
      {[-1, 1].map((side) =>
        Array.from({ length: BARS }).map((_, i) => {
          const z = -2.2 + (i / (BARS - 1)) * 4.4
          return (
            <mesh key={`side${side}-${i}`} position={[side * 2.4, 2, z]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 4, 6]} />
              <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} />
            </mesh>
          )
        })
      )}
      {Array.from({ length: BARS }).map((_, i) => {
        const x = -2.2 + (i / (BARS - 1)) * 4.4
        return (
          <mesh key={`back-${i}`} position={[x, 2, -2.4]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 4, 6]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} />
          </mesh>
        )
      })}

      {/* ön parmaklıklar — çözülünce açılır */}
      <group ref={barRef}>
        {Array.from({ length: BARS }).map((_, i) => {
          const x = -2.2 + (i / (BARS - 1)) * 4.4
          return (
            <mesh key={`front-${i}`} position={[x, 2, 2.4]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 4, 6]} />
              <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} />
            </mesh>
          )
        })}
      </group>

      {/* 4 renkli kilit göstergesi (ön üstte) */}
      {(['red', 'blue', 'green', 'yellow'] as const).map((c, i) => {
        const has = keys.includes(c)
        return (
          <mesh key={c} position={[-1.5 + i, 3.4, 2.5]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial
              color={has ? KEY_COLOR_HEX[c] : '#3f3f46'}
              emissive={has ? KEY_COLOR_HEX[c] : '#000000'}
              emissiveIntensity={has ? 1.2 : 0}
              toneMapped={false}
            />
          </mesh>
        )
      })}

      <Captive freed={solved} />
    </group>
  )
}

// Kaçırılan akraba figürü
function Captive({ freed }: { freed: boolean }) {
  const ref = useRef<Group>(null)
  const armRef = useRef<Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (ref.current) {
      if (freed) {
        // sevinç zıplaması, kafesten dışarı
        ref.current.position.z = Math.min(4.5, ref.current.position.z + 0.04)
        ref.current.position.y = Math.abs(Math.sin(t * 6)) * 0.4
      } else {
        ref.current.position.y = Math.sin(t * 2) * 0.05
      }
    }
    if (armRef.current) {
      // el sallama (yardım çağrısı / sevinç)
      armRef.current.rotation.z = Math.sin(t * (freed ? 10 : 4)) * 0.7 - 0.4
    }
  })
  return (
    <group ref={ref} position={[0, 0, 0]}>
      {/* gövde */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <capsuleGeometry args={[0.4, 0.9, 6, 12]} />
        <meshToonMaterial color="#e8a247" />
      </mesh>
      {/* kafa */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.42, 16, 16]} />
        <meshToonMaterial color="#f4c98a" />
      </mesh>
      {/* gözler */}
      <mesh position={[-0.15, 2.15, 0.36]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.15, 2.15, 0.36]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* sallayan kol */}
      <group ref={armRef} position={[0.42, 1.6, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.7, 4, 8]} />
          <meshToonMaterial color="#e8a247" />
        </mesh>
      </group>
      {/* diğer kol */}
      <mesh position={[-0.42, 1.3, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.7, 4, 8]} />
        <meshToonMaterial color="#e8a247" />
      </mesh>
      <Html position={[0, 2.9, 0]} center distanceFactor={13} zIndexRange={[9, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-black text-white shadow">
          {freed ? '🎉 Teşekkürler!' : '😨 İmdat!'}
        </div>
      </Html>
    </group>
  )
}

// ───────────────────────────────────────────────────────────────
//  Portal — yakınlık ile ışınlama (+ opsiyonel poster)
// ───────────────────────────────────────────────────────────────
function Portal({
  position,
  destination,
  label,
  sublabel,
  frameColor,
  innerColor,
  poster = false,
}: {
  position: [number, number, number]
  destination: [number, number, number]
  label: string
  sublabel?: string
  frameColor: string
  innerColor: string
  poster?: boolean
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

      {/* Poster / "yeni oyun" tabelası */}
      {poster && (
        <group position={[0, 0, -0.2]}>
          <Html position={[0, 4.4, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
            <div className="pointer-events-none w-44 overflow-hidden rounded-xl border-4 border-amber-300 bg-gradient-to-b from-purple-900 to-indigo-950 text-center shadow-2xl">
              <div className="bg-amber-300 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-900">
                ✨ Yeni Oyun ✨
              </div>
              <div className="px-2 py-2">
                <div className="text-4xl">🔒🧩</div>
                <div className="mt-1 text-3xl">🧍😈🔑</div>
                <div className="mt-1 text-sm font-black text-amber-200">
                  KAÇIRILAN AKRABA
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-white/80">
                  Anahtarları bul, kurtar!
                </div>
              </div>
            </div>
          </Html>
        </group>
      )}

      <Html position={[0, 2.8, 0]} center distanceFactor={16} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-sm font-black text-white shadow-xl">
          {label}
          {sublabel && (
            <span className="ml-2 font-semibold text-amber-300">{sublabel}</span>
          )}
        </div>
      </Html>
    </group>
  )
}
