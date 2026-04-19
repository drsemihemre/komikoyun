'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { getImpactSlots, IMPACT_DURATION } from '@/lib/particles'

const POOL_SIZE = 12

export default function HitParticles() {
  const ringRefs = useRef<(Mesh | null)[]>(Array(POOL_SIZE).fill(null))
  const puffRefs = useRef<(Mesh | null)[]>(Array(POOL_SIZE).fill(null))

  useFrame((state) => {
    const slots = getImpactSlots()
    const now = state.clock.elapsedTime
    for (let i = 0; i < POOL_SIZE; i++) {
      const s = slots[i]
      const ring = ringRefs.current[i]
      const puff = puffRefs.current[i]
      if (!ring || !puff) continue
      if (!s.active) {
        ring.scale.setScalar(0)
        puff.scale.setScalar(0)
        continue
      }
      const age = now - s.t0
      if (age >= IMPACT_DURATION) {
        s.active = false
        ring.scale.setScalar(0)
        puff.scale.setScalar(0)
        continue
      }
      const t = age / IMPACT_DURATION
      ring.position.set(s.x, s.y + 0.1, s.z)
      puff.position.set(s.x, s.y + 0.3, s.z)

      // Ring: expands outward on XZ
      const rScale = (0.2 + t * 4) * s.size
      ring.scale.set(rScale, 1, rScale)
      const rMat = ring.material as MeshBasicMaterial
      rMat.color.set(s.color)
      rMat.opacity = (1 - t) * 0.8

      // Puff: expands uniformly, fades
      const pScale = (0.3 + t * 0.8) * s.size
      puff.scale.setScalar(pScale)
      const pMat = puff.material as MeshBasicMaterial
      pMat.color.set(s.color)
      pMat.opacity = (1 - t) * 0.9
    }
  })

  return (
    <group>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <group key={i}>
          {/* Shockwave ring (flat on ground) */}
          <mesh
            ref={(el) => {
              ringRefs.current[i] = el
            }}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.7, 1, 24]} />
            <meshBasicMaterial
              color="#ffd60a"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
          {/* Puff orb */}
          <mesh
            ref={(el) => {
              puffRefs.current[i] = el
            }}
          >
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial
              color="#ffd60a"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
