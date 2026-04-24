'use client'

import { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'
import { MAP_HALF } from '@/lib/store'
import {
  getGrassColorMap,
  getGrassNormalMap,
  getGrassRoughnessMap,
} from '@/lib/proceduralTextures'

const SIZE = MAP_HALF * 2

export default function Ground() {
  const maps = useMemo(() => {
    if (typeof document === 'undefined') return null
    return {
      color: getGrassColorMap(),
      normal: getGrassNormalMap(),
      roughness: getGrassRoughnessMap(),
    }
  }, [])

  return (
    <RigidBody type="fixed" friction={1} restitution={0.1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE, 1, 1]} />
        {maps ? (
          <meshStandardMaterial
            map={maps.color}
            normalMap={maps.normal}
            roughnessMap={maps.roughness}
            roughness={0.92}
            metalness={0}
            normalScale={[1.2, 1.2]}
          />
        ) : (
          <meshStandardMaterial color="#7cb74d" roughness={0.95} />
        )}
      </mesh>
    </RigidBody>
  )
}
