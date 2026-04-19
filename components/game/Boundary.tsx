import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { MAP_HALF } from '@/lib/store'

const HEIGHT = 40

export default function Boundary() {
  return (
    <RigidBody type="fixed">
      <CuboidCollider
        args={[1, HEIGHT, MAP_HALF]}
        position={[MAP_HALF, HEIGHT, 0]}
      />
      <CuboidCollider
        args={[1, HEIGHT, MAP_HALF]}
        position={[-MAP_HALF, HEIGHT, 0]}
      />
      <CuboidCollider
        args={[MAP_HALF, HEIGHT, 1]}
        position={[0, HEIGHT, MAP_HALF]}
      />
      <CuboidCollider
        args={[MAP_HALF, HEIGHT, 1]}
        position={[0, HEIGHT, -MAP_HALF]}
      />
    </RigidBody>
  )
}
