'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Mesh } from 'three'

const MOSQUE_CENTER: [number, number, number] = [-45, 0, -35]

export default function Mosque() {
  const lightRefs = useRef<(Mesh | null)[]>([])

  useFrame((state) => {
    // Night detection: ambient light low = night (approximation)
    // Actually we'll just use a sine cycle based on local time
    const now = new Date()
    const hour = now.getHours() + now.getMinutes() / 60
    const isNight = hour < 6 || hour > 19
    const intensity = isNight ? 1 : 0.15

    // Gentle flicker
    const t = state.clock.elapsedTime
    lightRefs.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as {
        emissiveIntensity?: number
        opacity?: number
      }
      if (mat && 'emissiveIntensity' in mat) {
        const pulse = 1 + Math.sin(t * 2 + i) * 0.15
        mat.emissiveIntensity = intensity * pulse * 2.5
      }
    })
  })

  const [cx, , cz] = MOSQUE_CENTER

  // 4 minaret positions relative to mosque center
  const minaretOffsets: [number, number][] = [
    [-7, -7],
    [7, -7],
    [-7, 7],
    [7, 7],
  ]

  return (
    <group position={[cx, 0, cz]}>
      <RigidBody type="fixed" colliders={false}>
        {/* Courtyard */}
        <mesh
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[14, 40]} />
          <meshToonMaterial color="#e8d7a8" />
        </mesh>
        {/* Outer courtyard ring */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[13.5, 14, 40]} />
          <meshBasicMaterial color="#a68759" />
        </mesh>

        {/* Main prayer hall (cube) */}
        <CuboidCollider args={[5, 3, 5]} position={[0, 3, 0]} />
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 6, 10]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>

        {/* Central dome */}
        <mesh position={[0, 6.5, 0]} castShadow>
          <sphereGeometry
            args={[5, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color="#d7e4f0" />
        </mesh>
        {/* Dome ring */}
        <mesh position={[0, 6.1, 0]} castShadow>
          <torusGeometry args={[5, 0.25, 8, 24]} />
          <meshToonMaterial color="#9fb9cd" />
        </mesh>
        {/* Dome finial */}
        <mesh position={[0, 11.8, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1, 6]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>
        <mesh position={[0, 12.5, 0]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>
        <mesh position={[0, 13.1, 0]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.25, 0.6, 8]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>

        {/* Four small domes on corners of main hall */}
        {[
          [-4.5, -4.5],
          [4.5, -4.5],
          [-4.5, 4.5],
          [4.5, 4.5],
        ].map((p, i) => (
          <mesh key={`sd${i}`} position={[p[0], 6.1, p[1]]} castShadow>
            <sphereGeometry
              args={[1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshToonMaterial color="#d7e4f0" />
          </mesh>
        ))}

        {/* Entrance (south face) */}
        <mesh position={[0, 2.5, 5.05]}>
          <boxGeometry args={[2.4, 4, 0.15]} />
          <meshToonMaterial color="#6f4518" />
        </mesh>
        <mesh position={[0, 4.7, 5.07]}>
          <sphereGeometry
            args={[1.2, 16, 10, 0, Math.PI, 0, Math.PI / 2]}
          />
          <meshToonMaterial color="#8d6e63" />
        </mesh>

        {/* Four minarets */}
        {minaretOffsets.map((off, i) => (
          <Minaret
            key={`m${i}`}
            x={off[0]}
            z={off[1]}
            lightRef={(el: Mesh | null) => {
              lightRefs.current[i] = el
            }}
          />
        ))}
      </RigidBody>

      {/* Welcome pole */}
      <mesh position={[0, 1.5, 13]} castShadow>
        <boxGeometry args={[4, 1.2, 0.2]} />
        <meshToonMaterial color="#1a5e8f" />
      </mesh>
      <mesh position={[0, 1.5, 13.15]}>
        <boxGeometry args={[3.7, 0.9, 0.05]} />
        <meshBasicMaterial color="#ffd60a" />
      </mesh>
    </group>
  )
}

function Minaret({
  x,
  z,
  lightRef,
}: {
  x: number
  z: number
  lightRef: (m: Mesh | null) => void
}) {
  return (
    <group position={[x, 0, z]}>
      {/* Base square */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.3, 1.4, 1.3]} />
        <meshToonMaterial color="#e8d7a8" />
      </mesh>
      {/* Shaft */}
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 12, 12]} />
        <meshToonMaterial color="#f5ebdc" />
      </mesh>
      {/* Şerefe — balcony + emissive ring (night light) */}
      <mesh position={[0, 11, 0]} castShadow>
        <torusGeometry args={[0.7, 0.15, 8, 16]} />
        <meshToonMaterial color="#c9a888" />
      </mesh>
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.35, 16]} />
        <meshToonMaterial color="#c9a888" />
      </mesh>
      {/* Night light — emissive ring above şerefe */}
      <mesh ref={lightRef} position={[0, 11.2, 0]}>
        <torusGeometry args={[0.6, 0.06, 8, 18]} />
        <meshStandardMaterial
          color="#ffd60a"
          emissive="#ffd60a"
          emissiveIntensity={0}
          toneMapped={false}
        />
      </mesh>
      {/* Upper shaft (top of minaret) */}
      <mesh position={[0, 12.5, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 2, 10]} />
        <meshToonMaterial color="#f5ebdc" />
      </mesh>
      {/* Minaret cone cap */}
      <mesh position={[0, 14.2, 0]} castShadow>
        <coneGeometry args={[0.5, 1.8, 10]} />
        <meshToonMaterial color="#9fb9cd" />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 15.3, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshToonMaterial color="#ffd60a" />
      </mesh>
      <mesh position={[0, 15.6, 0]}>
        <coneGeometry args={[0.08, 0.3, 6]} />
        <meshToonMaterial color="#ffd60a" />
      </mesh>
    </group>
  )
}
