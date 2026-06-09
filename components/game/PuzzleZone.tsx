'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import type { Group, Mesh, PointLight } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore, type PuzzleProgress } from '@/lib/store'
import { playLaunch, playPotion, playKo } from '@/lib/sounds'
import { spawnImpact } from '@/lib/particles'

// ═══════════════════════════════════════════════════════════════
//   KAÇIRILAN AKRABA — 3 KATLI BULMACA / KURTARMA MODU
//   Zincirleme bağlı bulmacalar + ipucu notları:
//     KAT 1: 🪓 levye (sandık yığınının tepesinde) → tahtalı pencere W1
//            → 🔧 İngiliz anahtarı → vidalı kapak → KAT 2 rampası;
//            📦 sandığı it → 🔴 kırmızı anahtar
//     KAT 2: dolap → 🔵 mavi;  tahtalı pencere W2 → 🟡 sarı;
//            çekmece → 🩴 terlik → 😠 huysuz komşuyu yatıştır → KAT 3 rampası
//     KAT 3: 🟢 yeşil (sandık yığınında);  🔒 kafes (4 anahtar) → akrabayı kurtar
//   Performans: animasyonlu useFrame'ler yalnız oyuncu alandayken (ZS.active) çalışır.
// ═══════════════════════════════════════════════════════════════

const PZONE: [number, number, number] = [-400, 0, -400]
const [CX, , CZ] = PZONE

// Kat yükseklikleri (zemin üstü)
const F1 = 0
const F2 = 8
const F3 = 16

// Başlangıç alanındaki giriş portalı
const ENTRANCE: [number, number, number] = [14, 1.5, 8]
const ZONE_ARRIVAL: [number, number, number] = [CX, 1.6, CZ + 10]
const RETURN_PORTAL: [number, number, number] = [CX, 1.6, CZ + 16]
const RETURN_DEST: [number, number, number] = [ENTRANCE[0], 1.5, ENTRANCE[2] - 4]

const KEY_HEX: Record<string, string> = {
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

// Performans kapısı — sub-component useFrame'leri buna bakıp erken döner
const ZS = { active: false }

type Banner = { text: string; color: string }
type Interactable = {
  id: string
  pos: [number, number, number]
  radius: number
  prompt: string
  actionable: boolean
  run?: (sb: (b: Banner | null) => void) => void
}

const has = (a: string[], x: string) => a.includes(x)
const w = (rx: number, ry: number, rz: number): [number, number, number] => [
  CX + rx,
  ry,
  CZ + rz,
]

function flash(sb: (b: Banner | null) => void, text: string, color: string, ms = 2400) {
  sb({ text, color })
  setTimeout(() => sb(null), ms)
}

function addKey(color: string, pos: [number, number, number], sb: (b: Banner | null) => void) {
  if (useGameStore.getState().puzzleAddKey(color)) {
    playPotion('grow')
    spawnImpact(pos[0], pos[1], pos[2], KEY_HEX[color], 1.5) // alım partikülü (world koordinat)
    flash(sb, `${KEY_LABEL[color]} anahtar alındı! (${useGameStore.getState().puzzle.keys.length}/4)`, KEY_HEX[color])
  }
}

// O anki duruma göre etkileşilebilir nesneler (sadece "görünür" olanlar)
function getInteractables(p: PuzzleProgress): Interactable[] {
  const list: Interactable[] = []
  const k = p.keys
  const it = p.items
  const d = p.done

  // ───── KAT 1 ─────
  if (!has(it, 'crowbar')) {
    const cbPos = w(-15.3, F1 + 3.8, -14.7)
    list.push({
      id: 'crowbar', pos: cbPos, radius: 3,
      prompt: '🪓 Levyeyi al', actionable: true,
      run: (sb) => { if (useGameStore.getState().puzzleAddItem('crowbar')) { playPotion('grow'); spawnImpact(cbPos[0], cbPos[1], cbPos[2], '#f59e0b', 1.5); flash(sb, '🪓 Levye alındı! Tahtalı pencereleri açabilirsin.', '#f59e0b', 3000) } },
    })
  }
  if (!has(d, 'w1')) {
    list.push({
      id: 'w1', pos: w(-18.5, F1 + 2.4, -6), radius: 3,
      prompt: has(it, 'crowbar') ? '🪓 Tahtalı pencereyi aç' : '🔩 Tahtalı pencere — levye lazım',
      actionable: has(it, 'crowbar'),
      run: (sb) => { useGameStore.getState().puzzleMarkDone('w1'); playKo(); spawnImpact(CX - 18, F1 + 2.4, CZ - 6, '#a16207', 2); flash(sb, '🪓 Tahtalar söküldü — arkada İngiliz anahtarı var!', '#22c55e', 3000) },
    })
  } else if (!has(it, 'wrench')) {
    const wrPos = w(-18, F1 + 1.6, -6)
    list.push({
      id: 'wrench', pos: wrPos, radius: 2.6,
      prompt: '🔧 İngiliz anahtarını al', actionable: true,
      run: (sb) => { if (useGameStore.getState().puzzleAddItem('wrench')) { playPotion('grow'); spawnImpact(wrPos[0], wrPos[1], wrPos[2], '#f59e0b', 1.5); flash(sb, '🔧 İngiliz anahtarı alındı! Vidalı kapağı sök.', '#f59e0b', 3000) } },
    })
  }
  if (!has(d, 'hatch')) {
    list.push({
      id: 'hatch', pos: w(16, F1 + 1, 0), radius: 3.2,
      prompt: has(it, 'wrench') ? '🔧 Vidalı kapağı sök' : '🔩 Vidalı kapak — İngiliz anahtarı lazım',
      actionable: has(it, 'wrench'),
      run: (sb) => { useGameStore.getState().puzzleMarkDone('hatch'); playLaunch(); spawnImpact(CX + 16, F1 + 1, CZ, '#f59e0b', 3); flash(sb, '🪜 Vidalar söküldü — 2. kata rampa açıldı!', '#22c55e', 3000) },
    })
  }
  if (!has(d, 'crate')) {
    list.push({
      id: 'crate', pos: w(-12, F1 + 1, 12), radius: 3,
      prompt: '📦 Sandığı it', actionable: true,
      run: (sb) => { useGameStore.getState().puzzleMarkDone('crate'); playPotion('shrink'); flash(sb, '🔴 Sandığın arkasında kırmızı anahtar var!', '#ef4444') },
    })
  } else if (!has(k, 'red')) {
    const redPos = w(-12, F1 + 0.9, 14.2)
    list.push({ id: 'red', pos: redPos, radius: 2.6, prompt: '🔴 Kırmızı anahtarı al', actionable: true, run: (sb) => addKey('red', redPos, sb) })
  }

  // ───── KAT 2 ─────
  if (!has(d, 'wardrobe')) {
    list.push({ id: 'wardrobe', pos: w(-16, F2 + 1, -14), radius: 3.2, prompt: '🚪 Dolabı aç', actionable: true, run: (sb) => { useGameStore.getState().puzzleMarkDone('wardrobe'); playPotion('shrink'); flash(sb, '🔵 Dolapta mavi anahtar var!', '#3b82f6') } })
  } else if (!has(k, 'blue')) {
    const bluePos = w(-16, F2 + 1.4, -13.3)
    list.push({ id: 'blue', pos: bluePos, radius: 2.6, prompt: '🔵 Mavi anahtarı al', actionable: true, run: (sb) => addKey('blue', bluePos, sb) })
  }
  if (!has(d, 'w2')) {
    list.push({
      id: 'w2', pos: w(-18.5, F2 + 2.4, -6), radius: 3,
      prompt: has(it, 'crowbar') ? '🪓 Tahtalı pencereyi aç' : '🔩 Tahtalı pencere — levye lazım',
      actionable: has(it, 'crowbar'),
      run: (sb) => { useGameStore.getState().puzzleMarkDone('w2'); playKo(); spawnImpact(CX - 18, F2 + 2.4, CZ - 6, '#a16207', 2); flash(sb, '🟡 Tahtalar söküldü — sarı anahtar göründü!', '#eab308', 3000) },
    })
  } else if (!has(k, 'yellow')) {
    const yellowPos = w(-18, F2 + 1.6, -6)
    list.push({ id: 'yellow', pos: yellowPos, radius: 2.6, prompt: '🟡 Sarı anahtarı al', actionable: true, run: (sb) => addKey('yellow', yellowPos, sb) })
  }
  if (!has(d, 'drawer')) {
    list.push({ id: 'drawer', pos: w(0, F2 + 1, 14), radius: 3, prompt: '🗄️ Çekmeceyi aç', actionable: true, run: (sb) => { useGameStore.getState().puzzleMarkDone('drawer'); playPotion('shrink'); flash(sb, '🩴 Çekmecede komşunun terliği var!', '#06b6d4') } })
  } else if (!has(it, 'slipper')) {
    const slPos = w(0, F2 + 1.5, 15.5)
    list.push({ id: 'slipper', pos: slPos, radius: 2.6, prompt: '🩴 Terliği al', actionable: true, run: (sb) => { if (useGameStore.getState().puzzleAddItem('slipper')) { playPotion('grow'); spawnImpact(slPos[0], slPos[1], slPos[2], '#06b6d4', 1.5); flash(sb, '🩴 Terlik alındı! Huysuz komşuya ver.', '#06b6d4', 3000) } } })
  }
  if (!has(d, 'neighbor')) {
    list.push({
      id: 'neighbor', pos: w(-14, F2 + 1.2, 4), radius: 3.6,
      prompt: has(it, 'slipper') ? '🩴 Terliği komşuya ver' : '😠 Komşu engelliyor — terliğini bul!',
      actionable: has(it, 'slipper'),
      run: (sb) => { useGameStore.getState().puzzleMarkDone('neighbor'); playPotion('grow'); flash(sb, '😅 Komşu sakinleşti — 3. kata rampa açıldı!', '#22c55e', 3500) },
    })
  }

  // ───── KAT 3 ─────
  if (!has(k, 'green')) {
    const greenPos = w(14.3, F3 + 2.7, -12.3)
    list.push({ id: 'green', pos: greenPos, radius: 3, prompt: '🟢 Yeşil anahtarı al', actionable: true, run: (sb) => addKey('green', greenPos, sb) })
  }
  if (!p.solved) {
    const ready = k.length >= 4
    list.push({
      id: 'cage', pos: w(4, F3 + 1.2, -4), radius: 4,
      prompt: ready ? '🔓 Akrabayı KURTAR!' : `🔒 ${4 - k.length} anahtar daha lazım`,
      actionable: ready,
      run: (sb) => {
        if (useGameStore.getState().puzzleSolve()) {
          playKo(); playLaunch()
          for (let i = 0; i < 8; i++) spawnImpact(CX + 4 + (Math.random() - 0.5) * 6, F3 + 1 + Math.random() * 3, CZ - 4 + (Math.random() - 0.5) * 4, ['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i % 4], 3)
          flash(sb, '🎉 Akraban kurtuldu! +750.000 💰', '#22c55e', 6000)
          useGameStore.getState().brainrotEarn(750000)
          useGameStore.getState().addScore(1500)
        }
      },
    })
  }

  return list
}

export default function PuzzleZone() {
  return (
    <>
      <Portal
        position={ENTRANCE}
        destination={ZONE_ARRIVAL}
        label="🔒 KAÇIRILAN AKRABA"
        sublabel="3 katlı bulmaca!"
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

function Lair() {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [nearest, setNearest] = useState<{ pos: [number, number, number]; prompt: string } | null>(null)
  const nearestIdRef = useRef<string | null>(null)
  const nearestPromptRef = useRef<string | null>(null)
  const frameRef = useRef(0)

  const p = useGameStore((s) => s.puzzle)
  const d = p.done
  const it = p.items
  const k = p.keys

  // Yakınlık taraması (throttle) → prompt + ZS.active
  useFrame(() => {
    const player = getPlayerHandle()?.getPos()
    const state = useGameStore.getState()
    const inZone = player ? Math.hypot(player.x - CX, player.z - CZ) < 34 : false
    ZS.active = inZone
    state.setPuzzleActive(inZone)
    if (!inZone || !player) {
      if (nearestIdRef.current !== null) { nearestIdRef.current = null; nearestPromptRef.current = null; setNearest(null); state.setPuzzlePrompt(null) }
      return
    }
    frameRef.current = (frameRef.current + 1) % 4
    if (frameRef.current !== 0) return
    const list = getInteractables(state.puzzle)
    let best: Interactable | null = null
    let bestD = Infinity
    for (const item of list) {
      const dd = Math.hypot(player.x - item.pos[0], (player.y - item.pos[1]) * 0.6, player.z - item.pos[2])
      if (dd < item.radius && dd < bestD) { bestD = dd; best = item }
    }
    const newId = best?.id ?? null
    const newPrompt = best?.prompt ?? null
    if (newId !== nearestIdRef.current || newPrompt !== nearestPromptRef.current) {
      nearestIdRef.current = newId
      nearestPromptRef.current = newPrompt
      setNearest(best ? { pos: best.pos, prompt: best.prompt } : null)
      state.setPuzzlePrompt(newPrompt)
    }
  })

  // E tuşu (mobil buton da bunu dispatch eder)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted || state.paused) return
      const player = getPlayerHandle()?.getPos()
      if (!player) return
      if (Math.hypot(player.x - CX, player.z - CZ) >= 34) return
      const list = getInteractables(state.puzzle)
      let best: Interactable | null = null
      let bestD = Infinity
      for (const item of list) {
        if (!item.actionable || !item.run) continue
        const dd = Math.hypot(player.x - item.pos[0], (player.y - item.pos[1]) * 0.6, player.z - item.pos[2])
        if (dd < item.radius && dd < bestD) { bestD = dd; best = item }
      }
      best?.run?.(setBanner)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <group position={PZONE}>
      <Shell />

      {/* Atmosfer ışıkları (her katta 1, titrek) */}
      <LairLights />

      <Sign pos={[0, F1 + 5, 17]} text="😈 Kaçıranın 3 Katlı İni — yukarı çık, akrabanı kurtar!" />

      {/* ───── KAT 1 ───── */}
      <CrateStack base={[-16, F1, -14]} count={3} topItem={!has(it, 'crowbar') ? { kind: 'crowbar', color: '#ef4444' } : null} />
      <BoardedWindow pos={[-19.7, F1 + 2.4, -6]} open={has(d, 'w1')} revealKey={has(d, 'w1') && !has(it, 'wrench') ? { kind: 'wrench', color: '#cbd5e1', at: [1.7, -0.8, 0] } : null} />
      <BoltedHatch open={has(d, 'hatch')} x={16} z={0} y={F1} />
      <Ramp x={16} z0={0} y0={F1} show={has(d, 'hatch')} />
      <PushCrate pos={[-12, F1, 12]} pushed={has(d, 'crate')} revealKey={has(d, 'crate') && !has(k, 'red') ? 'red' : null} />
      <Sign pos={[-8, F1 + 4, 11]} text="Pencere tahtalı 🔩 — levyeyle aç. Levye yüksekte 🪓" small />

      {/* ───── KAT 2 ───── */}
      <Wardrobe pos={[-16, F2, -14]} open={has(d, 'wardrobe')} revealKey={has(d, 'wardrobe') && !has(k, 'blue') ? 'blue' : null} />
      <BoardedWindow pos={[-19.7, F2 + 2.4, -6]} open={has(d, 'w2')} revealKey={has(d, 'w2') && !has(k, 'yellow') ? { kind: 'key', color: KEY_HEX.yellow, at: [1.7, -0.8, 0] } : null} />
      <Dresser pos={[0, F2, 14]} open={has(d, 'drawer')} topItem={has(d, 'drawer') && !has(it, 'slipper') ? { kind: 'slipper', color: '#06b6d4' } : null} />
      <Neighbor pos={[-14, F2, 4]} happy={has(d, 'neighbor')} />
      <Ramp x={-16} z0={0} y0={F2} show={has(d, 'neighbor')} />
      <Sign pos={[-8, F2 + 4, 7]} text="😠 Komşu yolu kapatıyor — terliğini 🩴 bul ve ver!" small />

      {/* ───── KAT 3 ───── */}
      <CrateStack base={[14, F3, -12]} count={2} topItem={!has(k, 'green') ? { kind: 'key', color: KEY_HEX.green } : null} />
      <Cage pos={[4, F3, -4]} keys={k} solved={p.solved} />
      <Sign pos={[0, F3 + 4, 8]} text="🟢 Yeşil yukarıda! 4 renk anahtar kafesi açar." small />

      {/* En yakın etkileşim prompt'u */}
      {nearest && (
        <Html position={[nearest.pos[0] - CX, nearest.pos[1] + 1.5, nearest.pos[2] - CZ]} center distanceFactor={11} zIndexRange={[10, 0]}>
          <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-lg bg-yellow-400/95 px-3 py-1 text-sm font-black text-black shadow-xl">
            <span className="rounded border border-black bg-white px-1.5">E</span>
            <span>{nearest.prompt}</span>
          </div>
        </Html>
      )}

      {banner && <Banner3D banner={banner} />}
    </group>
  )
}

// Banner'ı oyuncunun bulunduğu kata yakın göster
function Banner3D({ banner }: { banner: Banner }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ZS.active || !ref.current) return
    const pp = getPlayerHandle()?.getPos()
    if (pp) ref.current.position.set(pp.x - CX, pp.y + 4, pp.z - CZ)
  })
  return (
    <group ref={ref} position={[0, F1 + 6, 8]}>
      <Html center distanceFactor={16} zIndexRange={[20, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-2xl px-6 py-3 text-lg font-black text-white shadow-2xl" style={{ backgroundColor: banner.color }}>
          {banner.text}
        </div>
      </Html>
    </group>
  )
}

// Titrek in ışıkları — mum/eski ampul hissi (yalnız oyuncu alandayken anime)
function LairLights() {
  const refs = [useRef<PointLight>(null), useRef<PointLight>(null), useRef<PointLight>(null)]
  useFrame((s) => {
    if (!ZS.active) return
    const t = s.clock.elapsedTime
    refs.forEach((r, i) => {
      if (r.current) r.current.intensity = (i === 1 ? 14 : 16) * (0.88 + 0.1 * Math.sin(t * 9 + i * 2.1) + 0.06 * Math.sin(t * 23 + i * 5))
    })
  })
  const DIST = [32, 30, 30]
  return (
    <>
      {[F1, F2, F3].map((f, i) => (
        <pointLight key={i} ref={refs[i]} position={[0, f + 5, 0]} intensity={i === 1 ? 14 : 16} distance={DIST[i]} color={i === 1 ? '#c084fc' : '#ff8c42'} />
      ))}
    </>
  )
}

// ───────────────────────────────────────────────────────────────
//  YAPISAL KABUK: 3 kat döşeme (rampa boşluklu) + duvarlar
// ───────────────────────────────────────────────────────────────
function Shell() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* KAT 1 zemini (tam) */}
      <Slab cx={0} cz={0} y={F1} sx={40} sz={40} color="#3a2f3f" />
      {/* KAT 2 — rampa boşluğu x[12,20] z[-2,14] (rampa tepesi z=14'e hizalı) */}
      <Slab cx={-4} cz={0} y={F2} sx={32} sz={40} color="#2f2838" />
      <Slab cx={16} cz={-11} y={F2} sx={8} sz={18} color="#2f2838" />
      <Slab cx={16} cz={17} y={F2} sx={8} sz={6} color="#2f2838" />
      {/* KAT 3 — rampa boşluğu x[-20,-12] z[-2,14] */}
      <Slab cx={4} cz={0} y={F3} sx={32} sz={40} color="#2a2333" />
      <Slab cx={-16} cz={-11} y={F3} sx={8} sz={18} color="#2a2333" />
      <Slab cx={-16} cz={17} y={F3} sx={8} sz={6} color="#2a2333" />

      {/* Çevre duvarları (yükseklik 24) */}
      {([
        [0, -20, 40, 0.6],
        [0, 20, 40, 0.6],
        [-20, 0, 0.6, 40],
        [20, 0, 0.6, 40],
      ] as const).map(([x, z, sx, sz], i) => (
        <group key={i}>
          <CuboidCollider args={[sx / 2, 12, sz / 2]} position={[x, 12, z]} />
          <mesh position={[x, 12, z]} castShadow receiveShadow>
            <boxGeometry args={[sx, 24, sz]} />
            <meshToonMaterial color="#241c2c" />
          </mesh>
        </group>
      ))}

      {/* Çatı — gökyüzünü kapatır, güneş gölgesiyle iç mekan gündüz de loş kalır */}
      <CuboidCollider args={[20, 0.3, 20]} position={[0, 24.3, 0]} />
      <mesh position={[0, 24.3, 0]} castShadow>
        <boxGeometry args={[40, 0.6, 40]} />
        <meshToonMaterial color="#16101e" />
      </mesh>
    </RigidBody>
  )
}

function Slab({ cx, cz, y, sx, sz, color }: { cx: number; cz: number; y: number; sx: number; sz: number; color: string }) {
  return (
    <group>
      <CuboidCollider args={[sx / 2, 0.3, sz / 2]} position={[cx, y - 0.3, cz]} />
      <mesh position={[cx, y - 0.3, cz]} receiveShadow>
        <boxGeometry args={[sx, 0.6, sz]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}

// Rampa (z0→z0+14 boyunca y0→y0+8 yükselen eğik düzlem) — boşluğu tam doldurur (genişlik 8),
// tepesi z=14'te kat döşemesine (boxC) hizalı; üst sahanlık YOK (örtüşme/sıkışma olmasın).
function Ramp({ x, z0, y0, show }: { x: number; z0: number; y0: number; show: boolean }) {
  if (!show) return null
  const H = 8
  const L = 14
  const angle = Math.atan2(H, L)
  const halfLen = Math.hypot(H, L) / 2
  const cz = z0 + L / 2
  const cy = y0 + H / 2
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* boşluk genişliği 8 → yarı-x 4 (yanlardan düşme yok) */}
        <CuboidCollider args={[4, 0.2, halfLen]} position={[x, cy, cz]} rotation={[-angle, 0, 0]} />
      </RigidBody>
      {/* görsel eğik düzlem + basamak çizgileri */}
      <mesh position={[x, cy, cz]} rotation={[-angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 0.3, halfLen * 2]} />
        <meshToonMaterial color="#6d4c41" />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const t = (i + 0.5) / 14
        return (
          <mesh key={i} position={[x, y0 + 0.18 + t * H, z0 + t * L]} castShadow>
            <boxGeometry args={[8, 0.06, 0.3]} />
            <meshToonMaterial color="#5d4037" />
          </mesh>
        )
      })}
      {/* yan korkuluklar (görsel) */}
      {[-3.9, 3.9].map((ox, i) => (
        <mesh key={i} position={[x + ox, cy + 0.4, cz]} rotation={[-angle, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.8, halfLen * 2]} />
          <meshToonMaterial color="#4e342e" />
        </mesh>
      ))}
    </group>
  )
}

// ───────────────────────────────────────────────────────────────
//  PICKUP'LAR
// ───────────────────────────────────────────────────────────────
type PickupKind = 'key' | 'wrench' | 'crowbar' | 'slipper'

function Pickup({ position, kind, color }: { position: [number, number, number]; kind: PickupKind; color: string }) {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (!ZS.active || !ref.current) return
    ref.current.rotation.y = s.clock.elapsedTime * 2
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * 2.5) * 0.15
  })
  return (
    <group ref={ref} position={position}>
      {kind === 'key' && (
        <>
          <mesh castShadow><torusGeometry args={[0.18, 0.06, 6, 14]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} /></mesh>
          <mesh position={[0, -0.32, 0]}><boxGeometry args={[0.09, 0.4, 0.09]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} /></mesh>
          <mesh position={[0.1, -0.5, 0]}><boxGeometry args={[0.18, 0.08, 0.09]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} toneMapped={false} /></mesh>
        </>
      )}
      {kind === 'wrench' && (
        <>
          <mesh castShadow rotation={[0, 0, Math.PI / 5]}><boxGeometry args={[0.16, 1, 0.12]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>
          <mesh position={[0.18, 0.42, 0]} rotation={[0, 0, Math.PI / 5]}><torusGeometry args={[0.16, 0.06, 6, 12, Math.PI * 1.4]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>
        </>
      )}
      {kind === 'crowbar' && (
        <>
          <mesh castShadow rotation={[0, 0, 0.2]}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0.12, 0.55, 0]} rotation={[0, 0, -0.9]}><boxGeometry args={[0.12, 0.35, 0.12]} /><meshStandardMaterial color="#b91c1c" metalness={0.5} roughness={0.4} /></mesh>
        </>
      )}
      {kind === 'slipper' && (
        <>
          <mesh castShadow rotation={[-0.2, 0, 0]}><boxGeometry args={[0.32, 0.1, 0.7]} /><meshToonMaterial color={color} /></mesh>
          <mesh position={[0, 0.12, 0.1]} rotation={[1.2, 0, 0]}><torusGeometry args={[0.14, 0.05, 6, 12, Math.PI]} /><meshToonMaterial color="#0e7490" /></mesh>
        </>
      )}
      <Html position={[0, 0.7, 0]} center distanceFactor={13} zIndexRange={[9, 0]}>
        <div className="pointer-events-none rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-black shadow">
          {kind === 'key' ? '🔑' : kind === 'wrench' ? '🔧' : kind === 'crowbar' ? '🪓' : '🩴'}
        </div>
      </Html>
    </group>
  )
}

// Sandık yığını — tepesinde bir pickup; tırmanılabilir
function CrateStack({ base, count, topItem }: { base: [number, number, number]; count: number; topItem: { kind: PickupKind; color: string } | null }) {
  const [bx, by, bz] = base
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: count }).map((_, i) => {
          const sx = 1.6 - i * 0.12
          const px = bx + i * 0.33
          const pz = bz - i * 0.33
          const py = by + 0.55 + i * 1.1
          return (
            <group key={i}>
              <CuboidCollider args={[sx / 2, 0.55, sx / 2]} position={[px, py, pz]} />
              <mesh position={[px, py, pz]} castShadow receiveShadow>
                <boxGeometry args={[sx, 1.1, sx]} />
                <meshToonMaterial color={i % 2 ? '#8d6e63' : '#a1887f'} />
              </mesh>
            </group>
          )
        })}
      </RigidBody>
      {topItem && (
        <Pickup position={[bx + (count - 1) * 0.33, by + count * 1.1 + 0.5, bz - (count - 1) * 0.33]} kind={topItem.kind} color={topItem.color} />
      )}
    </group>
  )
}

// Tahtalı pencere — açıkken tahtalar gider, arkada pickup
function BoardedWindow({ pos, open, revealKey }: { pos: [number, number, number]; open: boolean; revealKey: { kind: PickupKind; color: string; at: [number, number, number] } | null }) {
  const [x, y, z] = pos
  return (
    <group position={[x, y, z]}>
      <mesh position={[0.3, 0, 0]}><boxGeometry args={[0.2, 2.6, 2.6]} /><meshToonMaterial color="#1a1422" /></mesh>
      {!open && [0.7, 0, -0.7].map((oy, i) => (
        <mesh key={i} position={[0.45, oy, 0]} rotation={[0, 0, i === 1 ? 0.15 : -0.1]} castShadow>
          <boxGeometry args={[0.12, 0.45, 2.8]} />
          <meshToonMaterial color="#92400e" />
        </mesh>
      ))}
      {revealKey && <Pickup position={revealKey.at} kind={revealKey.kind} color={revealKey.color} />}
    </group>
  )
}

// Vidalı kapak (kapalıyken görünür) — rampanın girişinde
function BoltedHatch({ open, x, z, y }: { open: boolean; x: number; z: number; y: number }) {
  if (open) return null
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[1.8, 1.1, 0.25]} position={[x, y + 1.1, z - 1.6]} />
      <mesh position={[x, y + 1.1, z - 1.6]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 2.2, 0.4]} />
        <meshToonMaterial color="#52525b" />
      </mesh>
      {[[-1.3, 1.8], [1.3, 1.8], [-1.3, 0.4], [1.3, 0.4]].map(([bx, by], i) => (
        <mesh key={i} position={[x + bx, y + by, z - 1.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 6]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </RigidBody>
  )
}

// İtilebilir sandık → arkasında anahtar
function PushCrate({ pos, pushed, revealKey }: { pos: [number, number, number]; pushed: boolean; revealKey: string | null }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ZS.active || !ref.current) return
    const target = pushed ? 2.4 : 0
    ref.current.position.z += (target - ref.current.position.z) * 0.12
  })
  const [x, y, z] = pos
  return (
    <group position={[x, y, z]}>
      {pushed && revealKey && <Pickup position={[0, 0.9, 2.2]} kind="key" color={KEY_HEX[revealKey]} />}
      <group ref={ref}>
        <mesh position={[0, 1, 0]} castShadow receiveShadow><boxGeometry args={[2, 2, 2]} /><meshToonMaterial color="#8d6e63" /></mesh>
        <mesh position={[0, 1, 1.01]}><boxGeometry args={[1.6, 1.6, 0.05]} /><meshToonMaterial color="#6d4c41" /></mesh>
      </group>
    </group>
  )
}

// Dolap — kapaklar açılır, içinde anahtar
function Wardrobe({ pos, open, revealKey }: { pos: [number, number, number]; open: boolean; revealKey: string | null }) {
  const lref = useRef<Group>(null)
  const rref = useRef<Group>(null)
  useFrame(() => {
    if (!ZS.active) return
    const t = open ? 1 : 0
    if (lref.current) lref.current.rotation.y += (t * 1.2 - lref.current.rotation.y) * 0.12
    if (rref.current) rref.current.rotation.y += (-t * 1.2 - rref.current.rotation.y) * 0.12
  })
  const [x, y, z] = pos
  return (
    <group position={[x, y, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.3, 1.9, 0.8]} position={[0, 1.9, -0.3]} />
        <mesh position={[0, 1.9, -0.3]} castShadow receiveShadow><boxGeometry args={[2.6, 3.8, 1.4]} /><meshToonMaterial color="#4e342e" /></mesh>
      </RigidBody>
      {revealKey && <Pickup position={[0, 1.4, 0.7]} kind="key" color={KEY_HEX[revealKey]} />}
      <group ref={lref} position={[-1.25, 1.9, 0.4]}>
        <mesh position={[0.6, 0, 0]} castShadow><boxGeometry args={[1.2, 3.6, 0.12]} /><meshToonMaterial color="#6d4c41" /></mesh>
      </group>
      <group ref={rref} position={[1.25, 1.9, 0.4]}>
        <mesh position={[-0.6, 0, 0]} castShadow><boxGeometry args={[1.2, 3.6, 0.12]} /><meshToonMaterial color="#6d4c41" /></mesh>
      </group>
    </group>
  )
}

// Çekmeceli masa — çekmece kayar, üstünde eşya
function Dresser({ pos, open, topItem }: { pos: [number, number, number]; open: boolean; topItem: { kind: PickupKind; color: string } | null }) {
  const dref = useRef<Group>(null)
  useFrame(() => {
    if (!ZS.active || !dref.current) return
    const t = open ? 1 : 0
    dref.current.position.z += (t - dref.current.position.z) * 0.15
  })
  const [x, y, z] = pos
  return (
    <group position={[x, y, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.3, 1, 0.9]} position={[0, 1, 0]} />
        <mesh position={[0, 1, 0]} castShadow receiveShadow><boxGeometry args={[2.6, 2, 1.8]} /><meshToonMaterial color="#6d4c41" /></mesh>
      </RigidBody>
      <group ref={dref} position={[0, 1, 0]}>
        <mesh position={[0, 0, 0.95]} castShadow><boxGeometry args={[2.2, 0.7, 0.5]} /><meshToonMaterial color="#8d6e63" /></mesh>
        <mesh position={[0, 0, 1.22]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#3e2723" /></mesh>
      </group>
      {topItem && <Pickup position={[0, 1.5, 1.5]} kind={topItem.kind} color={topItem.color} />}
    </group>
  )
}

// 😠 Huysuz komşu — kapatırken sinirli; yatışınca yana çekilir + güler
function Neighbor({ pos, happy }: { pos: [number, number, number]; happy: boolean }) {
  const ref = useRef<Group>(null)
  const armRef = useRef<Group>(null)
  useFrame((s) => {
    if (!ZS.active || !ref.current) return
    const t = s.clock.elapsedTime
    const targetX = happy ? 5 : 0
    ref.current.position.x += (targetX - ref.current.position.x) * 0.05
    ref.current.position.y = happy ? Math.abs(Math.sin(t * 4)) * 0.12 : Math.sin(t * 10) * 0.03
    if (armRef.current) armRef.current.rotation.z = happy ? Math.sin(t * 8) * 0.5 - 0.3 : -0.2 + Math.sin(t * 12) * 0.05
  })
  const [x, y, z] = pos
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh position={[0, 1.3, 0]} castShadow><capsuleGeometry args={[0.55, 1, 6, 12]} /><meshToonMaterial color={happy ? '#16a34a' : '#7f1d1d'} /></mesh>
      <mesh position={[0, 2.3, 0]} castShadow><sphereGeometry args={[0.45, 16, 16]} /><meshToonMaterial color="#e0a87e" /></mesh>
      <mesh position={[0, 2.55, 0]}><sphereGeometry args={[0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4]} /><meshToonMaterial color="#d1cfcf" /></mesh>
      <mesh position={[-0.18, 2.4, 0.4]} rotation={[0, 0, happy ? 0 : -0.5]}><boxGeometry args={[0.2, 0.05, 0.05]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0.18, 2.4, 0.4]} rotation={[0, 0, happy ? 0 : 0.5]}><boxGeometry args={[0.2, 0.05, 0.05]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[-0.16, 2.3, 0.42]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0.16, 2.3, 0.42]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0, 2.12, 0.42]}><boxGeometry args={[0.3, 0.06, 0.05]} /><meshStandardMaterial color="#9a9a9a" /></mesh>
      <mesh position={[0, 1.98, 0.42]}><boxGeometry args={[0.22, 0.05, 0.04]} /><meshStandardMaterial color="#5a2a2a" /></mesh>
      <group ref={armRef} position={[0.55, 1.7, 0]}>
        <mesh position={[0, -0.4, 0]} castShadow><capsuleGeometry args={[0.15, 0.8, 4, 8]} /><meshToonMaterial color={happy ? '#16a34a' : '#7f1d1d'} /></mesh>
      </group>
      <mesh position={[-0.55, 1.4, 0]} castShadow><capsuleGeometry args={[0.15, 0.8, 4, 8]} /><meshToonMaterial color={happy ? '#16a34a' : '#7f1d1d'} /></mesh>
      <Html position={[0, 3, 0]} center distanceFactor={13} zIndexRange={[9, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-black text-white shadow">
          {happy ? '😅 Tamam, geç!' : '😠 Geçemezsin!'}
        </div>
      </Html>
    </group>
  )
}

// Kafes + kaçırılan akraba
function Cage({ pos, keys, solved }: { pos: [number, number, number]; keys: string[]; solved: boolean }) {
  const barRef = useRef<Group>(null)
  useFrame(() => {
    if (!ZS.active || !barRef.current) return
    const target = solved ? -2.4 : 0
    barRef.current.position.x += (target - barRef.current.position.x) * 0.1
  })
  const BARS = 6
  const [x, y, z] = pos
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[5, 0.1, 5]} /><meshToonMaterial color="#1f2937" /></mesh>
      <mesh position={[0, 4, 0]}><boxGeometry args={[5.2, 0.3, 5.2]} /><meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.5} /></mesh>
      {[-1, 1].map((side) => Array.from({ length: BARS }).map((_, i) => {
        const bz = -2.2 + (i / (BARS - 1)) * 4.4
        return <mesh key={`s${side}-${i}`} position={[side * 2.4, 2, bz]} castShadow><cylinderGeometry args={[0.07, 0.07, 4, 6]} /><meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} /></mesh>
      }))}
      {Array.from({ length: BARS }).map((_, i) => {
        const bx = -2.2 + (i / (BARS - 1)) * 4.4
        return <mesh key={`b${i}`} position={[bx, 2, -2.4]} castShadow><cylinderGeometry args={[0.07, 0.07, 4, 6]} /><meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} /></mesh>
      })}
      <group ref={barRef}>
        {Array.from({ length: BARS }).map((_, i) => {
          const bx = -2.2 + (i / (BARS - 1)) * 4.4
          return <mesh key={`f${i}`} position={[bx, 2, 2.4]} castShadow><cylinderGeometry args={[0.07, 0.07, 4, 6]} /><meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.4} /></mesh>
        })}
      </group>
      {(['red', 'blue', 'green', 'yellow'] as const).map((c, i) => {
        const hasK = keys.includes(c)
        return <mesh key={c} position={[-1.5 + i, 3.4, 2.5]}><sphereGeometry args={[0.22, 12, 12]} /><meshStandardMaterial color={hasK ? KEY_HEX[c] : '#3f3f46'} emissive={hasK ? KEY_HEX[c] : '#000000'} emissiveIntensity={hasK ? 1.2 : 0} toneMapped={false} /></mesh>
      })}
      <Captive freed={solved} />
    </group>
  )
}

function Captive({ freed }: { freed: boolean }) {
  const ref = useRef<Group>(null)
  const armRef = useRef<Group>(null)
  useFrame((s) => {
    if (!ZS.active) return
    const t = s.clock.elapsedTime
    if (ref.current) {
      if (freed) { ref.current.position.z = Math.min(4.5, ref.current.position.z + 0.04); ref.current.position.y = Math.abs(Math.sin(t * 6)) * 0.4 }
      else ref.current.position.y = Math.sin(t * 2) * 0.05
    }
    if (armRef.current) armRef.current.rotation.z = Math.sin(t * (freed ? 10 : 4)) * 0.7 - 0.4
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 1.2, 0]} castShadow><capsuleGeometry args={[0.4, 0.9, 6, 12]} /><meshToonMaterial color="#e8a247" /></mesh>
      <mesh position={[0, 2.1, 0]} castShadow><sphereGeometry args={[0.42, 16, 16]} /><meshToonMaterial color="#f4c98a" /></mesh>
      <mesh position={[-0.15, 2.15, 0.36]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <mesh position={[0.15, 2.15, 0.36]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      <group ref={armRef} position={[0.42, 1.6, 0]}>
        <mesh position={[0, 0.4, 0]} castShadow><capsuleGeometry args={[0.13, 0.7, 4, 8]} /><meshToonMaterial color="#e8a247" /></mesh>
      </group>
      <mesh position={[-0.42, 1.3, 0]} castShadow><capsuleGeometry args={[0.13, 0.7, 4, 8]} /><meshToonMaterial color="#e8a247" /></mesh>
      <Html position={[0, 2.9, 0]} center distanceFactor={13} zIndexRange={[9, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-black text-white shadow">
          {freed ? '🎉 Teşekkürler!' : '😨 İmdat!'}
        </div>
      </Html>
    </group>
  )
}

function Sign({ pos, text, small }: { pos: [number, number, number]; text: string; small?: boolean }) {
  return (
    <Html position={pos} center distanceFactor={small ? 16 : 20} zIndexRange={[10, 0]}>
      <div className={`pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 font-black text-white shadow-xl ${small ? 'text-xs' : 'text-base'}`}>
        {text}
      </div>
    </Html>
  )
}

// ───────────────────────────────────────────────────────────────
//  Portal — yakınlık ile ışınlama (+ opsiyonel poster)
// ───────────────────────────────────────────────────────────────
function Portal({
  position, destination, label, sublabel, frameColor, innerColor, poster = false,
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
      <mesh ref={ringRef}><torusGeometry args={[2, 0.3, 12, 32]} /><meshStandardMaterial color={frameColor} emissive={frameColor} emissiveIntensity={1.2} toneMapped={false} /></mesh>
      <mesh><circleGeometry args={[1.8, 32]} /><meshBasicMaterial color={innerColor} transparent opacity={0.65} /></mesh>
      {poster && (
        <Html position={[0, 4.4, 0]} center distanceFactor={15} zIndexRange={[12, 0]}>
          <div className="pointer-events-none w-44 overflow-hidden rounded-xl border-4 border-amber-300 bg-gradient-to-b from-purple-900 to-indigo-950 text-center shadow-2xl">
            <div className="bg-amber-300 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-900">✨ Yeni Oyun ✨</div>
            <div className="px-2 py-2">
              <div className="text-4xl">🏚️🔑</div>
              <div className="mt-1 text-3xl">🧍😈🪓</div>
              <div className="mt-1 text-sm font-black text-amber-200">KAÇIRILAN AKRABA</div>
              <div className="mt-0.5 text-[10px] font-semibold text-white/80">3 kat, bulmacalar, kurtar!</div>
            </div>
          </div>
        </Html>
      )}
      <Html position={[0, 2.8, 0]} center distanceFactor={16} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-sm font-black text-white shadow-xl">
          {label}
          {sublabel && <span className="ml-2 font-semibold text-amber-300">{sublabel}</span>}
        </div>
      </Html>
    </group>
  )
}
