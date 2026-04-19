import { RigidBody, CuboidCollider } from '@react-three/rapier'

// Doğu-batı uzanan yol + üzerinde tüneller + küçük yer altı geçişi
const Z_ROAD = -55
const ROAD_WIDTH = 8
const ROAD_LENGTH = 140

export default function Road() {
  return (
    <>
      {/* Ana yol — gri asfalt */}
      <mesh
        position={[0, 0.015, Z_ROAD]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROAD_LENGTH, ROAD_WIDTH]} />
        <meshToonMaterial color="#444a54" />
      </mesh>
      {/* Orta çizgi — sarı kesikli */}
      {Array.from({ length: 28 }).map((_, i) => {
        const x = -ROAD_LENGTH / 2 + i * (ROAD_LENGTH / 28) + 2.5
        return (
          <mesh
            key={`m${i}`}
            position={[x, 0.025, Z_ROAD]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[2, 0.35]} />
            <meshBasicMaterial color="#ffdd00" />
          </mesh>
        )
      })}

      {/* Tünel 1 (solda) — yeşil */}
      <Tunnel position={[-35, 0, Z_ROAD]} color="#2d6a4f" />
      {/* Tünel 2 (ortada) — turuncu, daha uzun */}
      <Tunnel position={[0, 0, Z_ROAD]} color="#e76f51" length={10} />
      {/* Tünel 3 (sağda) — mor */}
      <Tunnel position={[40, 0, Z_ROAD]} color="#7b2cbf" />

      {/* Yer altı dip — kısa çukur + üstü örtülü */}
      <Underpass position={[-20, 0, Z_ROAD - 14]} />
    </>
  )
}

function Tunnel({
  position,
  color,
  length = 7,
}: {
  position: [number, number, number]
  color: string
  length?: number
}) {
  const wallT = 0.6
  const height = 6
  const inner = ROAD_WIDTH / 2

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Sol duvar */}
        <CuboidCollider
          args={[length / 2, height / 2, wallT / 2]}
          position={[0, height / 2, -inner - wallT / 2]}
        />
        <mesh
          position={[0, height / 2, -inner - wallT / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[length, height, wallT]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Sağ duvar */}
        <CuboidCollider
          args={[length / 2, height / 2, wallT / 2]}
          position={[0, height / 2, inner + wallT / 2]}
        />
        <mesh
          position={[0, height / 2, inner + wallT / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[length, height, wallT]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Tavan */}
        <CuboidCollider
          args={[length / 2, 0.3, inner + wallT]}
          position={[0, height + 0.3, 0]}
        />
        <mesh position={[0, height + 0.3, 0]} castShadow>
          <boxGeometry args={[length, 0.6, (inner + wallT) * 2]} />
          <meshToonMaterial color={color} />
        </mesh>
      </RigidBody>
    </group>
  )
}

function Underpass({ position }: { position: [number, number, number] }) {
  const length = 16
  const width = 5
  const depth = 3.5
  const wallT = 0.6

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Giriş rampası — iniş */}
        <CuboidCollider
          args={[width / 2, 0.2, 2]}
          position={[0, -depth / 2, -length / 2 - 2]}
          rotation={[Math.atan2(depth, 4), 0, 0]}
        />
        {/* Çıkış rampası — çıkış */}
        <CuboidCollider
          args={[width / 2, 0.2, 2]}
          position={[0, -depth / 2, length / 2 + 2]}
          rotation={[-Math.atan2(depth, 4), 0, 0]}
        />
        {/* Düz taban */}
        <CuboidCollider
          args={[width / 2, 0.2, length / 2]}
          position={[0, -depth, 0]}
        />
        <mesh position={[0, -depth, 0]} receiveShadow>
          <boxGeometry args={[width, 0.4, length]} />
          <meshToonMaterial color="#3d5a80" />
        </mesh>
        {/* Duvarlar */}
        <CuboidCollider
          args={[wallT / 2, depth / 2, length / 2]}
          position={[width / 2 + wallT / 2, -depth / 2, 0]}
        />
        <CuboidCollider
          args={[wallT / 2, depth / 2, length / 2]}
          position={[-width / 2 - wallT / 2, -depth / 2, 0]}
        />
        {/* Wall visuals */}
        <mesh
          position={[width / 2 + wallT / 2, -depth / 2, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[wallT, depth, length]} />
          <meshToonMaterial color="#98c1d9" />
        </mesh>
        <mesh
          position={[-width / 2 - wallT / 2, -depth / 2, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[wallT, depth, length]} />
          <meshToonMaterial color="#98c1d9" />
        </mesh>
        {/* Tavan (kapalı kısım) */}
        <CuboidCollider
          args={[width / 2 + wallT, 0.25, length / 2]}
          position={[0, -0.25, 0]}
        />
        <mesh position={[0, -0.25, 0]} castShadow>
          <boxGeometry args={[width + wallT * 2, 0.5, length]} />
          <meshToonMaterial color="#ee6c4d" />
        </mesh>
      </RigidBody>

      {/* Entrance signs */}
      <mesh position={[0, 1, -length / 2 - 4]} castShadow>
        <boxGeometry args={[3, 2, 0.2]} />
        <meshToonMaterial color="#ffd60a" />
      </mesh>
    </group>
  )
}
