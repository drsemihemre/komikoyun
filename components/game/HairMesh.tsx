'use client'

// Saç ve cinsiyet görsellerini tek bir bileşen altında toplar
// Oyuncu başı üzerine yerleştirilir (headPivot içinde)

type Props = {
  gender: 'boy' | 'girl'
  color: string
}

export default function HairMesh({ gender, color }: Props) {
  if (gender === 'girl') {
    return (
      <group position={[0, 0.15, 0]}>
        {/* Üst saç — kafanın üzerini örten yarım küre */}
        <mesh position={[0, 0.42, -0.05]} castShadow>
          <sphereGeometry
            args={[0.72, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Ön perçem — alnın üstüne sarkan */}
        <mesh position={[0, 0.25, 0.55]} castShadow>
          <sphereGeometry args={[0.3, 12, 10]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Sol at kuyruğu (pigtail) */}
        <group position={[0.55, 0.15, -0.1]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.5, 8, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Uç ponpon */}
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Bandaj */}
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[0.2, 0.03, 6, 12]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
        </group>
        {/* Sağ at kuyruğu */}
        <group position={[-0.55, 0.15, -0.1]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.18, 0.5, 8, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[0.2, 0.03, 6, 12]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
        </group>
      </group>
    )
  }

  // Boy — kısa saç kapağı
  return (
    <group position={[0, 0.15, 0]}>
      <mesh position={[0, 0.38, -0.05]} castShadow>
        <sphereGeometry
          args={[0.73, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]}
        />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Yan kaykılmış perçem (önde) */}
      <mesh position={[0.1, 0.55, 0.45]} rotation={[0.3, 0, -0.4]} castShadow>
        <boxGeometry args={[0.35, 0.15, 0.3]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}
