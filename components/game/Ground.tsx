import { RigidBody } from '@react-three/rapier'

export default function Ground() {
  return (
    <RigidBody type="fixed" friction={1} restitution={0.1}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshToonMaterial color="#8ecb7b" />
      </mesh>
    </RigidBody>
  )
}
