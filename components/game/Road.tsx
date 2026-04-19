// Ana yol — kuzey-güney z=-55'te uzanıyor
// Eski tüneller ve yer altı geçidi kaldırıldı (Mario tüpleri onların yerini aldı)

const Z_ROAD = -55
const ROAD_WIDTH = 8
const ROAD_LENGTH = 140

export default function Road() {
  return (
    <>
      {/* Ana asfalt */}
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

      {/* Yol kenarı şeritleri */}
      {[-ROAD_WIDTH / 2 - 0.25, ROAD_WIDTH / 2 + 0.25].map((zOff, i) => (
        <mesh
          key={`edge${i}`}
          position={[0, 0.018, Z_ROAD + zOff]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[ROAD_LENGTH, 0.3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </>
  )
}
