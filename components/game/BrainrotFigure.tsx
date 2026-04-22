'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { BrainrotDef } from '@/lib/brainrots'

type Props = {
  def: BrainrotDef
  idle?: boolean // konveyorda yürüme animasyonu
}

// Orijinal stilize "brainrot" karakteri — büyük kafa + komik detaylar
// İtalyan-brainrot hissiyatına uygun, ama orijinal tasarım
export default function BrainrotFigure({ def, idle = true }: Props) {
  const groupRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    if (idle) {
      groupRef.current.position.y = Math.sin(t * 3) * 0.08
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * 6) * 0.5
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * 6) * 0.5
    }
  })

  const bodyHeight =
    def.shape === 'tall' ? 1.6 : def.shape === 'wide' ? 0.8 : def.shape === 'spiky' ? 1.4 : 1.2
  const bodyRadius =
    def.shape === 'wide' ? 1.2 : def.shape === 'tall' ? 0.6 : 0.85

  return (
    <group ref={groupRef}>
      {/* Gövde — shape'e göre */}
      {def.shape === 'round' && (
        <mesh position={[0, bodyHeight / 2 + 0.4, 0]} castShadow>
          <sphereGeometry args={[bodyRadius, 20, 18]} />
          <meshToonMaterial color={def.color} />
        </mesh>
      )}
      {def.shape === 'tall' && (
        <mesh position={[0, bodyHeight / 2 + 0.4, 0]} castShadow>
          <capsuleGeometry args={[bodyRadius, bodyHeight * 0.6, 8, 14]} />
          <meshToonMaterial color={def.color} />
        </mesh>
      )}
      {def.shape === 'wide' && (
        <mesh position={[0, bodyHeight / 2 + 0.4, 0]} castShadow>
          <boxGeometry args={[bodyRadius * 2, bodyHeight, bodyRadius * 1.6]} />
          <meshToonMaterial color={def.color} />
        </mesh>
      )}
      {def.shape === 'spiky' && (
        <>
          <mesh position={[0, bodyHeight / 2 + 0.4, 0]} castShadow>
            <sphereGeometry args={[bodyRadius, 16, 14]} />
            <meshToonMaterial color={def.color} />
          </mesh>
          {/* Dikenler */}
          {[0, 1, 2, 3, 4].map((i) => {
            const ang = (i / 5) * Math.PI * 2
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
                <coneGeometry args={[0.18, 0.7, 8]} />
                <meshToonMaterial color={def.accent} />
              </mesh>
            )
          })}
        </>
      )}

      {/* Büyük kafa — komik */}
      <mesh
        position={[0, bodyHeight + 0.8, 0]}
        castShadow
      >
        <sphereGeometry args={[bodyRadius * 0.9, 20, 18]} />
        <meshToonMaterial color={def.color} />
      </mesh>

      {/* Kocaman gözler */}
      <mesh
        position={[bodyRadius * 0.35, bodyHeight + 0.95, bodyRadius * 0.7]}
      >
        <sphereGeometry args={[0.28, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh
        position={[-bodyRadius * 0.35, bodyHeight + 0.95, bodyRadius * 0.7]}
      >
        <sphereGeometry args={[0.28, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh
        position={[bodyRadius * 0.4, bodyHeight + 0.95, bodyRadius * 0.9]}
      >
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh
        position={[-bodyRadius * 0.3, bodyHeight + 0.95, bodyRadius * 0.9]}
      >
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      {/* Ağız — büyük gülen */}
      <mesh
        position={[0, bodyHeight + 0.55, bodyRadius * 0.85]}
        rotation={[Math.PI, 0, 0]}
      >
        <torusGeometry args={[0.25, 0.05, 6, 16, Math.PI]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* Accent element — kasket / kılıç / roket (shape'e göre) */}
      {def.shape === 'tall' && (
        /* Captuccino Ninjano — kılıç */
        <mesh
          position={[bodyRadius * 1.3, bodyHeight * 0.5 + 0.5, 0]}
          rotation={[0, 0, -0.3]}
          castShadow
        >
          <boxGeometry args={[0.12, 1.8, 0.06]} />
          <meshStandardMaterial
            color={def.accent}
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      )}

      {/* Bacaklar (bacakları olan tipler) */}
      {def.shape !== 'wide' && (
        <>
          <group
            ref={leftLegRef}
            position={[bodyRadius * 0.4, 0.4, 0]}
          >
            <mesh position={[0, -0.2, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.18, 0.4, 10]} />
              <meshToonMaterial color={def.accent} />
            </mesh>
          </group>
          <group
            ref={rightLegRef}
            position={[-bodyRadius * 0.4, 0.4, 0]}
          >
            <mesh position={[0, -0.2, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.18, 0.4, 10]} />
              <meshToonMaterial color={def.accent} />
            </mesh>
          </group>
        </>
      )}

      {/* Pizza — üstüne malzeme */}
      {def.id === 'pizzanello' && (
        <>
          <mesh position={[0, bodyHeight + 1.5, 0]}>
            <cylinderGeometry args={[bodyRadius * 0.5, bodyRadius * 0.6, 0.2, 10]} />
            <meshToonMaterial color="#fef3c7" />
          </mesh>
          {/* Pepperoni */}
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2
            return (
              <mesh
                key={`p${i}`}
                position={[
                  Math.cos(a) * 0.25,
                  bodyHeight + 1.62,
                  Math.sin(a) * 0.25,
                ]}
              >
                <cylinderGeometry args={[0.1, 0.1, 0.03, 8]} />
                <meshToonMaterial color="#c0392b" />
              </mesh>
            )
          })}
        </>
      )}

      {/* Muz — kavisli muz kabuğu */}
      {def.id === 'bananinho' && (
        <mesh
          position={[0, bodyHeight + 1.7, 0]}
          rotation={[0, 0, 0.3]}
          castShadow
        >
          <torusGeometry args={[0.4, 0.15, 8, 14, Math.PI * 1.2]} />
          <meshToonMaterial color="#ffe066" />
        </mesh>
      )}

      {/* Pilot kasket — bombardini */}
      {def.id === 'bombardini' && (
        <>
          <mesh position={[0, bodyHeight + 1.5, 0]} castShadow>
            <sphereGeometry
              args={[bodyRadius * 0.95, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshToonMaterial color={def.accent} />
          </mesh>
          {/* Kanat gibi */}
          <mesh position={[bodyRadius * 1.3, bodyHeight + 0.2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.15, 0.3]} />
            <meshToonMaterial color="#64748b" />
          </mesh>
          <mesh position={[-bodyRadius * 1.3, bodyHeight + 0.2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.15, 0.3]} />
            <meshToonMaterial color="#64748b" />
          </mesh>
        </>
      )}

      {/* Tambur */}
      {def.id === 'tungtung' && (
        <>
          <mesh position={[0, bodyHeight + 0.5, 0]} castShadow>
            <cylinderGeometry
              args={[bodyRadius * 1.1, bodyRadius * 1.1, 0.5, 16]}
            />
            <meshToonMaterial color={def.accent} />
          </mesh>
          {/* Tokmaklar */}
          <mesh position={[1, bodyHeight + 0.5, 0.5]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          <mesh position={[-1, bodyHeight + 0.5, 0.5]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
        </>
      )}
    </group>
  )
}
