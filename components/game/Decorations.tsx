'use client'

import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { useGameStore } from '@/lib/store'

const SPREAD = 150 // half-field (zoom out from 95)
const NEAR_CENTER_AVOID = 10

const FLOWER_COLORS = [
  '#ffd166',
  '#ef476f',
  '#c77dff',
  '#06d6a0',
  '#f4a261',
  '#fb5607',
  '#ffbe0b',
  '#ff006e',
]

// ═══════════════════════════════════════════════════════════════
//   DEKORASYON — Unreal-benzeri foliage instancing
//   Her tip kendi draw call'ında tek seferde render edilir
//   Desktop: 500 ağaç + 200 taş + 1000 çiçek + 2000 çimen
//   Mobile:  150 ağaç + 80 taş + 400 çiçek + 800 çimen
// ═══════════════════════════════════════════════════════════════

export default function Decorations() {
  const level = useGameStore((s) => s.graphicsLevel)
  const isMobile = useGameStore((s) => s.isMobile)

  // Density — mobile ve low mode'da yarıdan aza inen seviye
  const density = useMemo(() => {
    if (level === 'low' || isMobile) {
      return { trees: 150, rocks: 80, flowers: 400, grass: 600 }
    }
    if (level === 'medium') {
      return { trees: 300, rocks: 140, flowers: 700, grass: 1200 }
    }
    return { trees: 500, rocks: 200, flowers: 1200, grass: 2000 }
  }, [level, isMobile])

  const { flowers, rocks, trees, grass } = useMemo(() => {
    let seed = 314
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const randomPos = (): [number, number] => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = (rand() - 0.5) * SPREAD * 2
        const z = (rand() - 0.5) * SPREAD * 2
        if (Math.hypot(x, z) < NEAR_CENTER_AVOID) continue
        if (Math.hypot(x, z - 26) < 14) continue // arena
        if (z > -60 && z < -50) continue // road
        return [x, z]
      }
      return [SPREAD * (rand() - 0.5) * 2, SPREAD * (rand() - 0.5) * 2]
    }

    const flowers = Array.from({ length: density.flowers }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
        size: 0.18 + rand() * 0.18,
      }
    })

    const rocks = Array.from({ length: density.rocks }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        size: 0.4 + rand() * 0.9,
        rotY: rand() * Math.PI * 2,
      }
    })

    const trees = Array.from({ length: density.trees }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        size: 0.9 + rand() * 0.8,
        rotY: rand() * Math.PI * 2,
      }
    })

    const grass = Array.from({ length: density.grass }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        size: 0.12 + rand() * 0.18,
        rotY: rand() * Math.PI * 2,
      }
    })

    return { flowers, rocks, trees, grass }
  }, [density])

  // Material color variants for foliage
  const foliageColors = ['#2d6a4f', '#388e3c', '#1b5e20', '#4caf50', '#33691e']

  return (
    <>
      {/* ─────────── ÇİMEN KÜMELERİ (2000 adet, tek draw call) ─────────── */}
      <Instances limit={density.grass + 10} range={density.grass + 10} castShadow={false}>
        <coneGeometry args={[0.12, 0.35, 4]} />
        <meshStandardMaterial color="#4caf50" roughness={0.8} />
        {grass.map((g) => (
          <Instance
            key={`g${g.id}`}
            position={[g.x, g.size * 0.15, g.z]}
            rotation={[0, g.rotY, 0]}
            scale={g.size * 2}
          />
        ))}
      </Instances>

      {/* ─────────── ÇİÇEKLER — gövde (stem) ─────────── */}
      <Instances limit={density.flowers + 10} range={density.flowers + 10} castShadow={false}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 5]} />
        <meshStandardMaterial color="#4d7c0f" roughness={0.7} />
        {flowers.map((f) => (
          <Instance
            key={`fs${f.id}`}
            position={[f.x, 0.25 * f.size, f.z]}
            scale={[f.size, f.size, f.size]}
          />
        ))}
      </Instances>
      {/* ─────────── ÇİÇEKLER — petal blob (her renk için ayrı instance seti) ─────────── */}
      {FLOWER_COLORS.map((color) => {
        const group = flowers.filter((f) => f.color === color)
        if (group.length === 0) return null
        return (
          <Instances
            key={`fp-${color}`}
            limit={group.length + 5}
            range={group.length + 5}
            castShadow
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
            {group.map((f) => (
              <Instance
                key={`fp${f.id}`}
                position={[f.x, 0.55 * f.size, f.z]}
                scale={f.size}
              />
            ))}
          </Instances>
        )
      })}

      {/* ─────────── TAŞLAR (200 adet, tek draw call) ─────────── */}
      <Instances limit={density.rocks + 10} range={density.rocks + 10} castShadow receiveShadow>
        <dodecahedronGeometry args={[1]} />
        <meshStandardMaterial color="#6c757d" roughness={0.85} />
        {rocks.map((r) => (
          <Instance
            key={`r${r.id}`}
            position={[r.x, r.size * 0.25, r.z]}
            rotation={[0, r.rotY, 0]}
            scale={r.size}
          />
        ))}
      </Instances>

      {/* ─────────── AĞAÇLAR — gövde (trunk) ─────────── */}
      <Instances limit={density.trees + 10} range={density.trees + 10} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 2, 8]} />
        <meshStandardMaterial color="#6f4518" roughness={0.9} />
        {trees.map((t) => (
          <Instance
            key={`tt${t.id}`}
            position={[t.x, 1 * t.size, t.z]}
            rotation={[0, t.rotY, 0]}
            scale={[t.size, t.size, t.size]}
          />
        ))}
      </Instances>
      {/* ─────────── AĞAÇLAR — 3 kademeli yaprak (cone LOD stack) ─────────── */}
      {foliageColors.slice(0, 3).map((color, colorIdx) => {
        // 3 farklı renkte ağaç yaprağı — çeşitlilik için
        const group = trees.filter((_, i) => i % 3 === colorIdx)
        if (group.length === 0) return null
        return (
          <group key={`tf-${color}`}>
            <Instances limit={group.length + 5} range={group.length + 5} castShadow>
              <coneGeometry args={[1.2, 1.5, 8]} />
              <meshStandardMaterial color={color} roughness={0.85} />
              {group.map((t) => (
                <Instance
                  key={`tf1-${t.id}`}
                  position={[t.x, 2.2 * t.size, t.z]}
                  scale={t.size}
                />
              ))}
            </Instances>
            <Instances limit={group.length + 5} range={group.length + 5} castShadow>
              <coneGeometry args={[0.9, 1.2, 8]} />
              <meshStandardMaterial color={color} roughness={0.85} />
              {group.map((t) => (
                <Instance
                  key={`tf2-${t.id}`}
                  position={[t.x, 3.1 * t.size, t.z]}
                  scale={t.size * 0.9}
                />
              ))}
            </Instances>
            <Instances limit={group.length + 5} range={group.length + 5} castShadow>
              <coneGeometry args={[0.6, 0.9, 8]} />
              <meshStandardMaterial color={color} roughness={0.85} />
              {group.map((t) => (
                <Instance
                  key={`tf3-${t.id}`}
                  position={[t.x, 3.8 * t.size, t.z]}
                  scale={t.size * 0.75}
                />
              ))}
            </Instances>
          </group>
        )
      })}
    </>
  )
}
