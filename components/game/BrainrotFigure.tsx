'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { BrainrotDef } from '@/lib/brainrots'
import { RARITY_GLOW } from '@/lib/brainrots'

type Props = {
  def: BrainrotDef
  idle?: boolean // konveyorda yürüme / duruşta hafif sallanma
  scale?: number
}

// ─────────────────────────────────────────────────────────────
// Orijinal stilize "brainrot" karakteri — her shape'e göre farklı silüet
// 9 shape + 30+ aksesuar varyasyonu ile görünüş çeşitliliği
// ─────────────────────────────────────────────────────────────
export default function BrainrotFigure({ def, idle = true, scale = 1 }: Props) {
  const groupRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)
  const wingsRef = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const auraRef = useRef<Mesh>(null)

  const glow = RARITY_GLOW[def.rarity]

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    if (idle) {
      // Floating shape'ler havada daha belirgin süzülür
      const amp = def.shape === 'floating' ? 0.25 : 0.08
      groupRef.current.position.y = Math.sin(t * 3) * amp

      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 6) * 0.5
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 6) * 0.5
      if (wingsRef.current) wingsRef.current.rotation.z = Math.sin(t * 8) * 0.4
      if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 4) * 0.3
    }
    if (auraRef.current) {
      const s = 1 + Math.sin(t * 2) * 0.08
      auraRef.current.scale.set(s, s, s)
    }
  })

  // Shape'e göre temel ölçüler
  const { bodyHeight, bodyRadius } = useMemo(() => {
    switch (def.shape) {
      case 'tall':
        return { bodyHeight: 1.6, bodyRadius: 0.55 }
      case 'wide':
        return { bodyHeight: 0.8, bodyRadius: 1.1 }
      case 'spiky':
        return { bodyHeight: 1.4, bodyRadius: 0.9 }
      case 'serpentine':
        return { bodyHeight: 0.6, bodyRadius: 0.45 }
      case 'winged':
        return { bodyHeight: 1.3, bodyRadius: 0.85 }
      case 'quadruped':
        return { bodyHeight: 0.9, bodyRadius: 0.8 }
      case 'floating':
        return { bodyHeight: 1.2, bodyRadius: 0.9 }
      case 'tiny':
        return { bodyHeight: 0.6, bodyRadius: 0.45 }
      case 'round':
      default:
        return { bodyHeight: 1.2, bodyRadius: 0.85 }
    }
  }, [def.shape])

  return (
    <group ref={groupRef} scale={scale}>
      {/* Rarity aurası (secret+god için parlıyor) */}
      {glow > 0 && (
        <mesh ref={auraRef} position={[0, bodyHeight * 0.5 + 0.4, 0]}>
          <sphereGeometry args={[bodyRadius * 1.6, 16, 14]} />
          <meshBasicMaterial
            color={def.accent}
            transparent
            opacity={Math.min(0.25, glow * 0.08)}
          />
        </mesh>
      )}

      {/* ─── BODY (shape'e göre) ─── */}
      <Body def={def} h={bodyHeight} r={bodyRadius} />

      {/* Floating disk tabanı */}
      {def.shape === 'floating' && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[bodyRadius * 0.9, bodyRadius * 0.7, 0.15, 12]} />
          <meshStandardMaterial
            color={def.accent}
            emissive={def.accent}
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* ─── HEAD ─── */}
      <HeadWithFace def={def} bodyHeight={bodyHeight} bodyRadius={bodyRadius} />

      {/* ─── LEGS ─── */}
      {def.shape !== 'wide' &&
        def.shape !== 'floating' &&
        def.shape !== 'serpentine' &&
        def.shape !== 'tiny' && (
          <>
            <group ref={leftLegRef} position={[bodyRadius * 0.4, 0.4, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.18, 0.4, 10]} />
                <meshToonMaterial color={def.accent} />
              </mesh>
              {/* Ayakkabı */}
              <mesh position={[0, -0.42, 0.08]} castShadow>
                <boxGeometry args={[0.25, 0.1, 0.35]} />
                <meshToonMaterial color="#1f2937" />
              </mesh>
            </group>
            <group ref={rightLegRef} position={[-bodyRadius * 0.4, 0.4, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.18, 0.4, 10]} />
                <meshToonMaterial color={def.accent} />
              </mesh>
              <mesh position={[0, -0.42, 0.08]} castShadow>
                <boxGeometry args={[0.25, 0.1, 0.35]} />
                <meshToonMaterial color="#1f2937" />
              </mesh>
            </group>
          </>
        )}

      {/* ─── QUADRUPED 4 BACAK ─── */}
      {def.shape === 'quadruped' && (
        <>
          {/* Ön bacaklar */}
          <mesh position={[bodyRadius * 0.6, 0.3, bodyRadius * 0.6]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.6, 10]} />
            <meshToonMaterial color={def.accent} />
          </mesh>
          <mesh position={[-bodyRadius * 0.6, 0.3, bodyRadius * 0.6]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.6, 10]} />
            <meshToonMaterial color={def.accent} />
          </mesh>
          {/* Arka bacaklar */}
          <mesh position={[bodyRadius * 0.6, 0.3, -bodyRadius * 0.6]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.6, 10]} />
            <meshToonMaterial color={def.accent} />
          </mesh>
          <mesh position={[-bodyRadius * 0.6, 0.3, -bodyRadius * 0.6]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 0.6, 10]} />
            <meshToonMaterial color={def.accent} />
          </mesh>
          {/* Kuyruk */}
          <group ref={tailRef} position={[0, bodyHeight * 0.6, -bodyRadius]}>
            <mesh position={[0, 0, -0.4]} rotation={[0.4, 0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.18, 0.9, 8]} />
              <meshToonMaterial color={def.color} />
            </mesh>
          </group>
        </>
      )}

      {/* ─── WINGS (kanatlar) ─── */}
      {(def.shape === 'winged' || def.accessory === 'wings-angel' || def.accessory === 'wings-dragon') && (
        <group ref={wingsRef} position={[0, bodyHeight * 0.7 + 0.4, -0.1]}>
          <mesh
            position={[bodyRadius * 1.1, 0, 0]}
            rotation={[0, -0.3, -0.3]}
            castShadow
          >
            <coneGeometry args={[0.9, 1.6, 4, 1, true]} />
            <meshToonMaterial
              color={def.accessory === 'wings-angel' ? '#ffffff' : def.accent}
              side={2}
            />
          </mesh>
          <mesh
            position={[-bodyRadius * 1.1, 0, 0]}
            rotation={[0, 0.3, 0.3]}
            castShadow
          >
            <coneGeometry args={[0.9, 1.6, 4, 1, true]} />
            <meshToonMaterial
              color={def.accessory === 'wings-angel' ? '#ffffff' : def.accent}
              side={2}
            />
          </mesh>
        </group>
      )}

      {/* ─── SERPENTINE ZIGZAG ─── */}
      {def.shape === 'serpentine' && (
        <>
          {[0, 1, 2, 3, 4].map((i) => {
            const x = (i - 2) * 0.65
            const z = Math.sin(i * 1.2) * 0.4
            const r = 0.45 - i * 0.03
            return (
              <mesh
                key={`s${i}`}
                position={[x, bodyHeight * 0.5 + 0.4 + Math.sin(i * 0.7) * 0.1, z]}
                castShadow
              >
                <sphereGeometry args={[r, 12, 10]} />
                <meshToonMaterial color={def.color} />
              </mesh>
            )
          })}
        </>
      )}

      {/* ─── SPIKES (dikenli shape için) ─── */}
      {def.shape === 'spiky' && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const ang = (i / 6) * Math.PI * 2
            return (
              <mesh
                key={`sp${i}`}
                position={[
                  Math.cos(ang) * bodyRadius,
                  bodyHeight / 2 + 0.4 + bodyRadius * 0.7,
                  Math.sin(ang) * bodyRadius,
                ]}
                rotation={[0, 0, -0.3 + i * 0.1]}
                castShadow
              >
                <coneGeometry args={[0.18, 0.7, 6]} />
                <meshToonMaterial color={def.accent} />
              </mesh>
            )
          })}
        </>
      )}

      {/* ─── ACCESSORY (karaktere özgü detay) ─── */}
      <Accessory def={def} h={bodyHeight} r={bodyRadius} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════
// Body — shape'e göre gövde
// ═══════════════════════════════════════════════════════════
function Body({ def, h, r }: { def: BrainrotDef; h: number; r: number }) {
  const y = h / 2 + 0.4

  if (def.shape === 'round' || def.shape === 'spiky' || def.shape === 'floating') {
    return (
      <mesh position={[0, y, 0]} castShadow>
        <sphereGeometry args={[r, 22, 18]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  if (def.shape === 'tall') {
    return (
      <mesh position={[0, y, 0]} castShadow>
        <capsuleGeometry args={[r, h * 0.6, 8, 16]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  if (def.shape === 'wide') {
    return (
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[r * 2, h, r * 1.6]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  if (def.shape === 'winged') {
    return (
      <mesh position={[0, y, 0]} castShadow>
        <capsuleGeometry args={[r, h * 0.5, 8, 14]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  if (def.shape === 'quadruped') {
    return (
      <mesh position={[0, h * 0.7 + 0.2, 0]} castShadow>
        <boxGeometry args={[r * 1.4, h * 0.8, r * 2]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  if (def.shape === 'tiny') {
    return (
      <mesh position={[0, h / 2 + 0.3, 0]} castShadow>
        <sphereGeometry args={[r, 14, 12]} />
        <meshToonMaterial color={def.color} />
      </mesh>
    )
  }
  // serpentine → body baş kısmında
  return (
    <mesh position={[1.3, y, 0]} castShadow>
      <sphereGeometry args={[r * 0.9, 14, 12]} />
      <meshToonMaterial color={def.color} />
    </mesh>
  )
}

// ═══════════════════════════════════════════════════════════
// Head — kafa + yüz (gözler + ağız)
// ═══════════════════════════════════════════════════════════
function HeadWithFace({
  def,
  bodyHeight: h,
  bodyRadius: r,
}: {
  def: BrainrotDef
  bodyHeight: number
  bodyRadius: number
}) {
  // Serpentine için kafa en öndeki sphere'e bakar
  const headY = def.shape === 'quadruped' ? h * 0.7 + 0.7 : h + 0.8
  const headX = def.shape === 'quadruped' ? 0 : def.shape === 'serpentine' ? 1.3 : 0
  const headZ = def.shape === 'quadruped' ? r * 0.8 : 0
  const headRadius =
    def.shape === 'tiny'
      ? r * 0.7
      : def.shape === 'quadruped'
        ? r * 0.6
        : def.shape === 'serpentine'
          ? r * 0.7
          : r * 0.9

  return (
    <group position={[headX, headY, headZ]}>
      {/* Kafa küresi */}
      <mesh castShadow>
        <sphereGeometry args={[headRadius, 20, 18]} />
        <meshToonMaterial color={def.color} />
      </mesh>

      {/* Beyaz gözler */}
      <mesh position={[headRadius * 0.4, headRadius * 0.15, headRadius * 0.7]}>
        <sphereGeometry args={[headRadius * 0.32, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-headRadius * 0.4, headRadius * 0.15, headRadius * 0.7]}>
        <sphereGeometry args={[headRadius * 0.32, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Siyah gözbebekleri — biraz yana kayık (komik etki) */}
      <mesh position={[headRadius * 0.48, headRadius * 0.18, headRadius * 0.88]}>
        <sphereGeometry args={[headRadius * 0.16, 12, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[-headRadius * 0.3, headRadius * 0.18, headRadius * 0.88]}>
        <sphereGeometry args={[headRadius * 0.16, 12, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Kaşlar */}
      <mesh
        position={[headRadius * 0.4, headRadius * 0.55, headRadius * 0.85]}
        rotation={[0, 0, -0.35]}
      >
        <boxGeometry args={[headRadius * 0.35, 0.05, 0.05]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh
        position={[-headRadius * 0.4, headRadius * 0.55, headRadius * 0.85]}
        rotation={[0, 0, 0.35]}
      >
        <boxGeometry args={[headRadius * 0.35, 0.05, 0.05]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Büyük gülen ağız */}
      <mesh
        position={[0, -headRadius * 0.35, headRadius * 0.85]}
        rotation={[Math.PI, 0, 0]}
      >
        <torusGeometry args={[headRadius * 0.28, 0.05, 6, 16, Math.PI]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Dişler */}
      <mesh position={[headRadius * 0.05, -headRadius * 0.32, headRadius * 0.86]}>
        <boxGeometry args={[0.08, 0.1, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════
// Accessory — karaktere özgü detay
// ═══════════════════════════════════════════════════════════
function Accessory({
  def,
  h,
  r,
}: {
  def: BrainrotDef
  h: number
  r: number
}) {
  const a = def.accessory

  // Üst taraftaki konumlar (kafa üstü)
  const topY = h + 1.6
  const headTopY = h + 1.7

  if (a === 'pizza') {
    return (
      <>
        <mesh position={[0, headTopY, 0]}>
          <cylinderGeometry args={[r * 0.6, r * 0.7, 0.2, 14]} />
          <meshToonMaterial color="#fef3c7" />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i / 5) * Math.PI * 2
          return (
            <mesh
              key={`p${i}`}
              position={[Math.cos(ang) * 0.3, headTopY + 0.12, Math.sin(ang) * 0.3]}
            >
              <cylinderGeometry args={[0.1, 0.1, 0.03, 8]} />
              <meshToonMaterial color="#c0392b" />
            </mesh>
          )
        })}
      </>
    )
  }

  if (a === 'banana') {
    return (
      <mesh position={[0, headTopY, 0]} rotation={[0, 0, 0.35]} castShadow>
        <torusGeometry args={[0.4, 0.15, 8, 14, Math.PI * 1.2]} />
        <meshToonMaterial color="#ffe066" />
      </mesh>
    )
  }

  if (a === 'sword') {
    return (
      <mesh
        position={[r * 1.4, h * 0.5 + 0.5, 0]}
        rotation={[0, 0, -0.3]}
        castShadow
      >
        <boxGeometry args={[0.12, 2, 0.06]} />
        <meshStandardMaterial color={def.accent} metalness={0.9} roughness={0.1} />
      </mesh>
    )
  }

  if (a === 'drum') {
    return (
      <>
        <mesh position={[0, h * 0.5 + 0.6, 0]} castShadow>
          <cylinderGeometry args={[r * 1.1, r * 1.1, 0.5, 20]} />
          <meshToonMaterial color={def.accent} />
        </mesh>
        <mesh position={[r * 1.2, h * 0.5 + 0.6, 0.5]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[-r * 1.2, h * 0.5 + 0.6, 0.5]} rotation={[0, 0, -0.4]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
      </>
    )
  }

  if (a === 'pilot-helmet') {
    return (
      <>
        <mesh position={[0, h + 1.55, 0]} castShadow>
          <sphereGeometry args={[r * 0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color={def.accent} />
        </mesh>
        {/* Gözlük */}
        <mesh position={[0, h + 1.4, r * 0.5]}>
          <torusGeometry args={[r * 0.3, 0.05, 8, 16]} />
          <meshStandardMaterial color="#000" />
        </mesh>
      </>
    )
  }

  if (a === 'cake-layers') {
    return (
      <>
        <mesh position={[0, headTopY + 0.1, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 0.25, 16]} />
          <meshToonMaterial color="#fde68a" />
        </mesh>
        <mesh position={[0, headTopY + 0.4, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 0.2, 16]} />
          <meshToonMaterial color="#f97316" />
        </mesh>
        <mesh position={[0, headTopY + 0.65, 0]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
      </>
    )
  }

  if (a === 'rocket') {
    return (
      <>
        <mesh position={[0, h + 1.8, -r]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.3, 0.8, 10]} />
          <meshStandardMaterial color="#ef4444" metalness={0.4} />
        </mesh>
        <mesh position={[0, h + 1.4, -r - 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.8, 10]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.5} />
        </mesh>
        {/* Alev */}
        <mesh position={[0, h + 1.1, -r - 1.3]}>
          <coneGeometry args={[0.22, 0.6, 8]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </>
    )
  }

  if (a === 'coffee-cup') {
    return (
      <mesh position={[r * 1.4, h * 0.5 + 0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.4, 12]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
    )
  }

  if (a === 'crown') {
    return (
      <>
        <mesh position={[0, topY, 0]}>
          <cylinderGeometry args={[r * 0.5, r * 0.6, 0.25, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.95}
            roughness={0.05}
            emissive="#fbbf24"
            emissiveIntensity={0.3}
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i / 5) * Math.PI * 2
          return (
            <mesh
              key={`cr${i}`}
              position={[Math.cos(ang) * r * 0.55, topY + 0.3, Math.sin(ang) * r * 0.55]}
            >
              <coneGeometry args={[0.1, 0.3, 4]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.95} />
            </mesh>
          )
        })}
        <mesh position={[0, topY + 0.4, 0]}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color="#dc2626" metalness={0.8} />
        </mesh>
      </>
    )
  }

  if (a === 'halo') {
    return (
      <mesh position={[0, topY + 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.06, 10, 20]} />
        <meshStandardMaterial
          color="#fef9c3"
          emissive="#fde047"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    )
  }

  if (a === 'fire-crown') {
    return (
      <>
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i / 5) * Math.PI * 2
          return (
            <mesh
              key={`fc${i}`}
              position={[
                Math.cos(ang) * r * 0.5,
                topY + 0.2,
                Math.sin(ang) * r * 0.5,
              ]}
            >
              <coneGeometry args={[0.15, 0.5, 6]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#dc2626"
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </>
    )
  }

  if (a === 'ice-crystal') {
    return (
      <>
        {[0, 1, 2].map((i) => {
          const ang = (i / 3) * Math.PI * 2
          return (
            <mesh
              key={`ic${i}`}
              position={[Math.cos(ang) * 0.5, topY, Math.sin(ang) * 0.5]}
              rotation={[0.3, ang, 0.2]}
            >
              <octahedronGeometry args={[0.28, 0]} />
              <meshStandardMaterial
                color="#ddf4ff"
                emissive="#3b82f6"
                emissiveIntensity={0.6}
                transparent
                opacity={0.85}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          )
        })}
      </>
    )
  }

  if (a === 'star-aura') {
    return (
      <mesh position={[0, topY, 0]}>
        <sphereGeometry args={[r * 1.2, 16, 14]} />
        <meshBasicMaterial color={def.accent} transparent opacity={0.3} />
      </mesh>
    )
  }

  if (a === 'shield') {
    return (
      <mesh position={[r * 1.3, h * 0.5 + 0.4, 0]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.15, 1.2, 0.8]} />
        <meshStandardMaterial color={def.accent} metalness={0.8} roughness={0.2} />
      </mesh>
    )
  }

  if (a === 'trunk') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <mesh
            key={`tr${i}`}
            position={[0, h + 0.5 - i * 0.25, r * 0.9 + i * 0.15]}
            rotation={[0.4 + i * 0.2, 0, 0]}
          >
            <cylinderGeometry args={[0.15 - i * 0.02, 0.15 - i * 0.02, 0.35, 10]} />
            <meshToonMaterial color={def.color} />
          </mesh>
        ))}
      </>
    )
  }

  if (a === 'horn') {
    return (
      <mesh
        position={[0, h + 1.4, r * 0.2]}
        rotation={[-0.4, 0, 0]}
        castShadow
      >
        <coneGeometry args={[0.15, 0.9, 8]} />
        <meshToonMaterial color={def.accent} />
      </mesh>
    )
  }

  if (a === 'long-neck') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <mesh
            key={`ln${i}`}
            position={[0, h + 0.4 + i * 0.4, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.3, 0.35, 0.45, 10]} />
            <meshToonMaterial color={def.color} />
          </mesh>
        ))}
      </>
    )
  }

  if (a === 'tentacles') {
    return (
      <>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ang = (i / 6) * Math.PI * 2
          return (
            <group key={`tc${i}`} position={[Math.cos(ang) * r * 0.9, 0.3, Math.sin(ang) * r * 0.9]}>
              <mesh position={[0, -0.15, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.14, 0.6, 8]} />
                <meshToonMaterial color={def.color} />
              </mesh>
            </group>
          )
        })}
      </>
    )
  }

  if (a === 'snake-head') {
    return (
      <>
        <mesh position={[2, h * 0.5 + 0.4, 0]} castShadow>
          <coneGeometry args={[0.4, 0.8, 12]} rotation-z={[Math.PI / 2]} />
          <meshToonMaterial color={def.color} />
        </mesh>
        {/* Çatal dil */}
        <mesh position={[2.6, h * 0.5 + 0.35, 0]}>
          <boxGeometry args={[0.25, 0.04, 0.04]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
      </>
    )
  }

  if (a === 'stripes') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <mesh
            key={`st${i}`}
            position={[0, h * 0.5 + 0.3 + i * 0.25, r * 1.05]}
            rotation={[0, 0, 0]}
          >
            <boxGeometry args={[r * 1.5, 0.1, 0.05]} />
            <meshBasicMaterial color="#18181b" />
          </mesh>
        ))}
      </>
    )
  }

  if (a === 'wings-angel') {
    // wings already drawn by shape='winged' logic — here add feather detail
    return null
  }

  if (a === 'wings-dragon') {
    return null
  }

  if (a === 'galaxy-ring') {
    return (
      <mesh position={[0, h * 0.5 + 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.08, 10, 32]} />
        <meshStandardMaterial
          color={def.accent}
          emissive={def.accent}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    )
  }

  if (a === 'neon-glow') {
    return (
      <>
        <pointLight position={[0, h * 0.5 + 0.6, 0]} intensity={3} color={def.accent} distance={6} />
      </>
    )
  }

  if (a === 'glass-aperol') {
    return (
      <group position={[r * 1.2, h * 0.5 + 0.5, 0]}>
        {/* Bardak */}
        <mesh>
          <cylinderGeometry args={[0.18, 0.1, 0.5, 12]} />
          <meshStandardMaterial
            color="#f97316"
            transparent
            opacity={0.7}
            metalness={0.1}
            roughness={0.05}
          />
        </mesh>
      </group>
    )
  }

  if (a === 'dulce-dots') {
    return (
      <>
        {[0, 1, 2, 3].map((i) => {
          const ang = (i / 4) * Math.PI * 2
          return (
            <mesh
              key={`dd${i}`}
              position={[Math.cos(ang) * r * 0.6, h * 0.5 + 0.6, Math.sin(ang) * r * 0.6]}
            >
              <sphereGeometry args={[0.12, 10, 10]} />
              <meshToonMaterial color="#fef3c7" />
            </mesh>
          )
        })}
      </>
    )
  }

  if (a === 'pasta-coils') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <mesh
            key={`pc${i}`}
            position={[0, h * 0.5 + 0.5 + i * 0.1, r - 0.2]}
            rotation={[Math.PI / 2, 0, i * 0.3]}
          >
            <torusGeometry args={[0.25 - i * 0.03, 0.05, 8, 16]} />
            <meshToonMaterial color={def.accent} />
          </mesh>
        ))}
      </>
    )
  }

  if (a === 'berry-dots') {
    return (
      <>
        {[0, 1, 2].map((i) => {
          const ang = (i / 3) * Math.PI * 2
          return (
            <mesh
              key={`bd${i}`}
              position={[Math.cos(ang) * r * 0.5, h * 0.6, Math.sin(ang) * r * 0.5 + 0.1]}
            >
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color="#fef9c3" />
            </mesh>
          )
        })}
      </>
    )
  }

  if (a === 'pepperoni-top') {
    return null // handled by pizza
  }

  if (a === 'cherry-pair') {
    return (
      <>
        {[-0.15, 0.15].map((x, i) => (
          <mesh key={`ch${i}`} position={[x, headTopY + 0.15, 0]}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshToonMaterial color="#b91c1c" />
          </mesh>
        ))}
        {/* Sap */}
        <mesh position={[0, headTopY + 0.45, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
          <meshToonMaterial color="#065f46" />
        </mesh>
      </>
    )
  }

  if (a === 'eyepatch') {
    return (
      <>
        <mesh position={[r * 0.4, h + 0.95, r * 0.85]}>
          <boxGeometry args={[0.3, 0.3, 0.02]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </>
    )
  }

  if (a === 'mustache') {
    return (
      <mesh position={[0, h + 0.7, r * 0.9]}>
        <boxGeometry args={[0.5, 0.08, 0.05]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
    )
  }

  if (a === 'suit-tie') {
    return (
      <>
        {/* Kravat */}
        <mesh position={[0, h * 0.6 + 0.2, r * 0.9]}>
          <coneGeometry args={[0.15, 0.8, 4]} />
          <meshStandardMaterial color="#dc2626" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Yaka */}
        <mesh position={[0, h * 0.85, r * 0.8]}>
          <boxGeometry args={[r * 1.5, 0.2, 0.1]} />
          <meshToonMaterial color="#1e293b" />
        </mesh>
        {/* Şapka (fedora) */}
        <mesh position={[0, h + 1.55, 0]} castShadow>
          <cylinderGeometry args={[r * 0.7, r * 0.7, 0.4, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.1} roughness={0.6} />
        </mesh>
        <mesh position={[0, h + 1.35, 0]} castShadow>
          <cylinderGeometry args={[r * 1.1, r * 1.1, 0.08, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.1} roughness={0.6} />
        </mesh>
      </>
    )
  }

  return null
}
