'use client'

import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'

const BEACH_CENTER: [number, number, number] = [-15, 0, 85]
const SAND_R = 32

export default function Beach() {
  const props = useMemo(() => {
    let seed = 555
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const palms = Array.from({ length: 7 }).map(() => {
      const ang = rand() * Math.PI * 2
      const r = 6 + rand() * (SAND_R - 10)
      return {
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
        scale: 0.9 + rand() * 0.5,
        tilt: (rand() - 0.5) * 0.3,
      }
    })
    const shells = Array.from({ length: 12 }).map(() => {
      const ang = rand() * Math.PI * 2
      const r = 3 + rand() * (SAND_R - 4)
      return {
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
        color: rand() > 0.5 ? '#ffb3c1' : '#ffd6ff',
        size: 0.25 + rand() * 0.2,
      }
    })
    const beachBalls = Array.from({ length: 5 }).map(() => {
      const ang = rand() * Math.PI * 2
      const r = 4 + rand() * (SAND_R - 8)
      return {
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
      }
    })
    return { palms, shells, beachBalls }
  }, [])

  const [cx, , cz] = BEACH_CENTER

  return (
    <group position={[cx, 0, cz]}>
      {/* Sand floor */}
      <mesh
        position={[0, 0.018, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[SAND_R, 48]} />
        <meshToonMaterial color="#f6e2b3" />
      </mesh>
      {/* Light sand patches */}
      <mesh position={[3, 0.027, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8, 24]} />
        <meshBasicMaterial color="#fff4d1" />
      </mesh>
      <mesh position={[-8, 0.027, 6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 24]} />
        <meshBasicMaterial color="#fff4d1" />
      </mesh>

      {/* Palm trees */}
      {props.palms.map((p, i) => (
        <PalmTree key={`p${i}`} x={p.x} z={p.z} scale={p.scale} tilt={p.tilt} />
      ))}

      {/* Shells */}
      {props.shells.map((s, i) => (
        <mesh
          key={`s${i}`}
          position={[s.x, 0.05, s.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[s.size, 12]} />
          <meshBasicMaterial color={s.color} />
        </mesh>
      ))}

      {/* Beach balls (physical, playable!) */}
      {props.beachBalls.map((b, i) => (
        <RigidBody
          key={`bb${i}`}
          position={[b.x, 0.8, b.z]}
          colliders="ball"
          mass={0.3}
          linearDamping={0.5}
          angularDamping={0.3}
          restitution={0.8}
        >
          <mesh castShadow>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshToonMaterial color="#ffffff" />
          </mesh>
          {/* Colored stripes */}
          {['#ef476f', '#ffd166', '#06d6a0', '#118ab2'].map((c, j) => {
            const a = (j / 4) * Math.PI * 2
            return (
              <mesh
                key={j}
                position={[Math.cos(a) * 0.601, 0, Math.sin(a) * 0.601]}
                rotation={[0, -a, 0]}
              >
                <boxGeometry args={[0.03, 1.05, 0.25]} />
                <meshToonMaterial color={c} />
              </mesh>
            )
          })}
        </RigidBody>
      ))}

      {/* Umbrella */}
      <group position={[8, 0, -3]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[1.5, 1, 10]} />
          <meshToonMaterial color="#ef476f" />
        </mesh>
      </group>
    </group>
  )
}

function PalmTree({
  x,
  z,
  scale,
  tilt,
}: {
  x: number
  z: number
  scale: number
  tilt: number
}) {
  const trunkSegments = 4
  return (
    <group position={[x, 0, z]} rotation={[tilt, 0, 0]} scale={scale}>
      {/* Trunk — curved via stacked segments */}
      {Array.from({ length: trunkSegments }).map((_, i) => {
        const t = i / (trunkSegments - 1)
        const bend = Math.sin(t * Math.PI) * 0.3
        return (
          <mesh
            key={i}
            position={[bend, 0.8 + i * 1.3, 0]}
            rotation={[0, 0, t * 0.25]}
            castShadow
          >
            <cylinderGeometry args={[0.25 - i * 0.03, 0.3 - i * 0.03, 1.35, 8]} />
            <meshToonMaterial color="#6d4030" />
          </mesh>
        )
      })}
      {/* Leaves — 6 flat cones */}
      {Array.from({ length: 6 }).map((_, j) => {
        const ang = (j / 6) * Math.PI * 2
        const bendX = Math.cos(ang)
        const bendZ = Math.sin(ang)
        return (
          <mesh
            key={`l${j}`}
            position={[0.9 + bendX * 1.2, 5.5, bendZ * 1.2]}
            rotation={[0, -ang, -0.6]}
            castShadow
          >
            <coneGeometry args={[0.6, 2.5, 6]} />
            <meshToonMaterial color="#2e7d32" />
          </mesh>
        )
      })}
      {/* Coconuts */}
      <mesh position={[0.9, 5, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshToonMaterial color="#3e2723" />
      </mesh>
      <mesh position={[1.2, 4.8, 0.2]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshToonMaterial color="#3e2723" />
      </mesh>
    </group>
  )
}
