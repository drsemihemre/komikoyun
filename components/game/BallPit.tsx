'use client'

import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  size?: number
  depth?: number
  ballCount?: number
}

const BALL_COLORS = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#c780fa',
  '#ff9c62',
  '#46c2cb',
  '#f06292',
]

export default function BallPit({
  position,
  size = 8,
  depth = 1.6,
  ballCount = 28,
}: Props) {
  const half = size / 2
  const wallT = 0.4
  const wallH = depth + 0.8

  // Stabil random ball positions (hydration uyumlu)
  const balls = useMemo(() => {
    const list = []
    // Simple pseudo-random with seeded offsets
    let seed = 137
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    for (let i = 0; i < ballCount; i++) {
      list.push({
        id: i,
        x: (rand() - 0.5) * (size - 1),
        y: 0.4 + rand() * depth,
        z: (rand() - 0.5) * (size - 1),
        color: BALL_COLORS[i % BALL_COLORS.length],
        radius: 0.3 + rand() * 0.1,
      })
    }
    return list
  }, [size, depth, ballCount])

  return (
    <group position={position}>
      {/* Pit floor + walls (static) */}
      <RigidBody type="fixed" colliders={false}>
        {/* Floor */}
        <CuboidCollider args={[half, 0.15, half]} position={[0, -depth, 0]} />
        <mesh position={[0, -depth, 0]} receiveShadow>
          <boxGeometry args={[size, 0.3, size]} />
          <meshToonMaterial color="#ffe5b4" />
        </mesh>
        {/* Walls */}
        <CuboidCollider
          args={[half + wallT, wallH / 2, wallT / 2]}
          position={[0, -depth + wallH / 2, half + wallT / 2]}
        />
        <CuboidCollider
          args={[half + wallT, wallH / 2, wallT / 2]}
          position={[0, -depth + wallH / 2, -half - wallT / 2]}
        />
        <CuboidCollider
          args={[wallT / 2, wallH / 2, half]}
          position={[half + wallT / 2, -depth + wallH / 2, 0]}
        />
        <CuboidCollider
          args={[wallT / 2, wallH / 2, half]}
          position={[-half - wallT / 2, -depth + wallH / 2, 0]}
        />
        {/* Wall visuals */}
        {[
          [0, -depth + wallH / 2, half + wallT / 2, size + wallT * 2, wallH, wallT],
          [0, -depth + wallH / 2, -half - wallT / 2, size + wallT * 2, wallH, wallT],
          [half + wallT / 2, -depth + wallH / 2, 0, wallT, wallH, size],
          [-half - wallT / 2, -depth + wallH / 2, 0, wallT, wallH, size],
        ].map((w, i) => (
          <mesh
            key={`w${i}`}
            position={[w[0], w[1], w[2]]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w[3], w[4], w[5]]} />
            <meshToonMaterial color="#fca311" />
          </mesh>
        ))}
      </RigidBody>

      {/* Balls (dynamic) */}
      {balls.map((b) => (
        <RigidBody
          key={b.id}
          position={[b.x, b.y, b.z]}
          colliders="ball"
          restitution={0.6}
          friction={0.3}
          linearDamping={0.4}
          angularDamping={0.4}
          mass={0.2}
        >
          <mesh castShadow>
            <sphereGeometry args={[b.radius, 14, 14]} />
            <meshToonMaterial color={b.color} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
