'use client'

import { useRef } from 'react'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

const BASE_POS: [number, number, number] = [42, 0, 18]
const HIGH_Y = 22
const CYCLE = 25 // total sn: 5 up + 10 high + 5 down + 5 ground
const ASCEND_T = 0.2 // 0.0 - 0.2 of cycle (5s)
const HIGH_T = 0.6 // 0.2 - 0.6 (10s)
const DESCEND_T = 0.8 // 0.6 - 0.8 (5s)
// 0.8 - 1.0 = ground (5s)

export default function Balloon() {
  const body = useRef<RapierRigidBody>(null)
  const balloonVisual = useRef<Group>(null)

  useFrame((state) => {
    if (!body.current) return
    const t = state.clock.elapsedTime
    const phase = (t % CYCLE) / CYCLE

    let y = 0
    if (phase < ASCEND_T) {
      y = HIGH_Y * easeOutCubic(phase / ASCEND_T)
    } else if (phase < HIGH_T) {
      y = HIGH_Y
    } else if (phase < DESCEND_T) {
      y = HIGH_Y * (1 - easeInCubic((phase - HIGH_T) / (DESCEND_T - HIGH_T)))
    } else {
      y = 0
    }

    body.current.setNextKinematicTranslation({
      x: BASE_POS[0],
      y: BASE_POS[1] + y,
      z: BASE_POS[2],
    })

    // Balloon gentle sway
    if (balloonVisual.current) {
      balloonVisual.current.rotation.z = Math.sin(t * 0.8) * 0.05
      balloonVisual.current.rotation.x = Math.cos(t * 0.6) * 0.04
    }
  })

  return (
    <>
      {/* Landing pad marker on ground */}
      <mesh
        position={[BASE_POS[0], 0.02, BASE_POS[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[3, 32]} />
        <meshToonMaterial color="#dda15e" />
      </mesh>
      <mesh
        position={[BASE_POS[0], 0.04, BASE_POS[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2.7, 3, 32]} />
        <meshBasicMaterial color="#bc6c25" />
      </mesh>

      <RigidBody
        ref={body}
        type="kinematicPosition"
        position={BASE_POS}
        colliders={false}
      >
        {/* Basket physics - where player stands */}
        <CuboidCollider
          args={[1.3, 0.2, 1.3]}
          position={[0, 0.3, 0]}
          friction={2}
        />
        {/* Basket side walls (prevent rolling off) */}
        <CuboidCollider args={[1.3, 0.6, 0.15]} position={[0, 0.9, 1.3]} />
        <CuboidCollider args={[1.3, 0.6, 0.15]} position={[0, 0.9, -1.3]} />
        <CuboidCollider args={[0.15, 0.6, 1.3]} position={[1.3, 0.9, 0]} />
        <CuboidCollider args={[0.15, 0.6, 1.3]} position={[-1.3, 0.9, 0]} />

        <group ref={balloonVisual}>
          {/* Basket visual (wicker) */}
          <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.6, 1.2, 2.6]} />
            <meshToonMaterial color="#8b5a2b" />
          </mesh>
          {/* Inner basket floor */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2.6, 0.15, 2.6]} />
            <meshToonMaterial color="#6f4518" />
          </mesh>
          {/* 4 ropes connecting basket to balloon */}
          {[
            [1.1, 1.1],
            [-1.1, 1.1],
            [1.1, -1.1],
            [-1.1, -1.1],
          ].map(([x, z], i) => (
            <mesh
              key={`r${i}`}
              position={[x, 3.5, z]}
              castShadow
            >
              <cylinderGeometry args={[0.04, 0.04, 3.5, 6]} />
              <meshToonMaterial color="#3a2e1a" />
            </mesh>
          ))}
          {/* Balloon top — big colorful sphere */}
          <mesh position={[0, 7.8, 0]} castShadow>
            <sphereGeometry args={[3.3, 28, 28]} />
            <meshToonMaterial color="#ef476f" />
          </mesh>
          {/* Vertical colored stripes */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2
            const colors = ['#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#f4a261', '#a8dadc']
            return (
              <mesh
                key={`stripe${i}`}
                position={[
                  Math.cos(angle) * 3.31,
                  7.8,
                  Math.sin(angle) * 3.31,
                ]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[0.05, 6, 0.6]} />
                <meshToonMaterial color={colors[i]} />
              </mesh>
            )
          })}
          {/* Burner / small cylinder */}
          <mesh position={[0, 4.5, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.5, 10]} />
            <meshToonMaterial color="#ffaa00" />
          </mesh>
        </group>
      </RigidBody>
    </>
  )
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function easeInCubic(t: number) {
  return t * t * t
}
