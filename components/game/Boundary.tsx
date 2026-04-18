import { RigidBody, CuboidCollider } from '@react-three/rapier'

const HALF = 55
const HEIGHT = 30

export default function Boundary() {
  return (
    <RigidBody type="fixed">
      {/* Invisible walls at map edges */}
      <CuboidCollider args={[1, HEIGHT, HALF]} position={[HALF, HEIGHT, 0]} />
      <CuboidCollider args={[1, HEIGHT, HALF]} position={[-HALF, HEIGHT, 0]} />
      <CuboidCollider args={[HALF, HEIGHT, 1]} position={[0, HEIGHT, HALF]} />
      <CuboidCollider args={[HALF, HEIGHT, 1]} position={[0, HEIGHT, -HALF]} />
    </RigidBody>
  )
}
