'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Mesh } from 'three'
import { getGameHour } from './DayNightCycle'

const MOSQUE_CENTER: [number, number, number] = [-45, 0, -35]

export default function Mosque() {
  const lightRefs = useRef<(Mesh | null)[]>([])

  useFrame((state) => {
    const hour = getGameHour()
    const isNight = hour < 6 || hour > 19
    const intensity = isNight ? 1 : 0.1

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

  const minaretOffsets: [number, number][] = [
    [-7, -7],
    [7, -7],
    [-7, 7],
    [7, 7],
  ]

  return (
    <group position={[cx, 0, cz]}>
      {/* Avlu */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[14, 40]} />
        <meshToonMaterial color="#e8d7a8" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[13.5, 14, 40]} />
        <meshBasicMaterial color="#a68759" />
      </mesh>

      {/* Ana mekan zemini (içine girince halı görünür) */}
      <mesh
        position={[0, 0.035, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[9.8, 9.8]} />
        <meshToonMaterial color="#6b2c2c" />
      </mesh>
      {/* Halı deseni - merkez motif */}
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 8]} />
        <meshBasicMaterial color="#ffd60a" />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.5, 8]} />
        <meshBasicMaterial color="#8b1c1c" />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        {/* Duvarlar — 4 ayrı parça; ön duvarda kapı açıklığı */}
        {/* Arka duvar (kuzey, -z) */}
        <CuboidCollider args={[5, 3, 0.2]} position={[0, 3, -5]} />
        <mesh position={[0, 3, -5]} receiveShadow castShadow>
          <boxGeometry args={[10, 6, 0.4]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        {/* Sol duvar (batı, -x) */}
        <CuboidCollider args={[0.2, 3, 5]} position={[-5, 3, 0]} />
        <mesh position={[-5, 3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.4, 6, 10]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        {/* Sağ duvar (doğu, +x) */}
        <CuboidCollider args={[0.2, 3, 5]} position={[5, 3, 0]} />
        <mesh position={[5, 3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.4, 6, 10]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        {/* Ön duvar (güney) — iki parça, ortada kapı boşluğu */}
        <CuboidCollider args={[1.75, 3, 0.2]} position={[-3.25, 3, 5]} />
        <mesh position={[-3.25, 3, 5]} receiveShadow castShadow>
          <boxGeometry args={[3.5, 6, 0.4]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        <CuboidCollider args={[1.75, 3, 0.2]} position={[3.25, 3, 5]} />
        <mesh position={[3.25, 3, 5]} receiveShadow castShadow>
          <boxGeometry args={[3.5, 6, 0.4]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        {/* Kapı üstü kemer (kapı boşluğu üstünü kapatır) */}
        <CuboidCollider args={[1.75, 1, 0.2]} position={[0, 5, 5]} />
        <mesh position={[0, 5, 5]} receiveShadow castShadow>
          <boxGeometry args={[3.5, 2, 0.4]} />
          <meshToonMaterial color="#f5ebdc" />
        </mesh>
        {/* Kemer detay */}
        <mesh position={[0, 4.1, 5.05]}>
          <sphereGeometry args={[1.3, 16, 10, 0, Math.PI, 0, Math.PI / 2]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>

        {/* Ana dome (içten de görülür — yarım küre) */}
        <mesh position={[0, 6.1, 0]} castShadow>
          <sphereGeometry
            args={[5, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color="#d7e4f0" />
        </mesh>
        <mesh position={[0, 6.1, 0]} castShadow>
          <torusGeometry args={[5, 0.25, 8, 24]} />
          <meshToonMaterial color="#9fb9cd" />
        </mesh>
        {/* Dome ceiling inside — tek taraflı, içten görünür */}
        <mesh position={[0, 6.05, 0]}>
          <sphereGeometry
            args={[4.8, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color="#fef3d0" side={2} />
        </mesh>

        <mesh position={[0, 11.8, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1, 6]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>
        <mesh position={[0, 12.5, 0]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>
        <mesh position={[0, 13.1, 0]}>
          <coneGeometry args={[0.25, 0.6, 8]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>

        {/* Küçük köşe dome'ları */}
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

        {/* Mihrap (iç doğu duvarında niş) — dekoratif */}
        <mesh position={[-4.75, 3, 0]}>
          <boxGeometry args={[0.3, 3.5, 1.5]} />
          <meshToonMaterial color="#6b2c2c" />
        </mesh>
        <mesh position={[-4.72, 4.6, 0]}>
          <sphereGeometry args={[0.75, 16, 10, 0, Math.PI, 0, Math.PI / 2]} />
          <meshToonMaterial color="#b8860b" />
        </mesh>

        {/* Minber (mimber) */}
        <mesh position={[-3, 1.5, 2]} castShadow>
          <boxGeometry args={[0.8, 3, 0.8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[-3, 3.2, 2]} castShadow>
          <coneGeometry args={[0.45, 0.8, 8]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>


        {/* Minareler */}
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
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.3, 1.4, 1.3]} />
        <meshToonMaterial color="#e8d7a8" />
      </mesh>
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 12, 12]} />
        <meshToonMaterial color="#f5ebdc" />
      </mesh>
      <mesh position={[0, 11, 0]} castShadow>
        <torusGeometry args={[0.7, 0.15, 8, 16]} />
        <meshToonMaterial color="#c9a888" />
      </mesh>
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.35, 16]} />
        <meshToonMaterial color="#c9a888" />
      </mesh>
      <mesh ref={lightRef} position={[0, 11.2, 0]}>
        <torusGeometry args={[0.6, 0.06, 8, 18]} />
        <meshStandardMaterial
          color="#ffd60a"
          emissive="#ffd60a"
          emissiveIntensity={0}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 12.5, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 2, 10]} />
        <meshToonMaterial color="#f5ebdc" />
      </mesh>
      <mesh position={[0, 14.2, 0]} castShadow>
        <coneGeometry args={[0.5, 1.8, 10]} />
        <meshToonMaterial color="#9fb9cd" />
      </mesh>
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
