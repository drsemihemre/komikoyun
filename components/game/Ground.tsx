import { RigidBody } from '@react-three/rapier'
import { MAP_HALF } from '@/lib/store'

const SIZE = MAP_HALF * 2

export default function Ground() {
  return (
    <RigidBody type="fixed" friction={1} restitution={0.1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshToonMaterial color="#8ecb7b" />
      </mesh>
    </RigidBody>
  )
}
