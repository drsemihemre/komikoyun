'use client'

// Kış/erkek saç görselleri + aksesuarlar (eyelash vb.)
// headPivot içine koyulur; daha yumuşak ve sevimli karakter hissi

type Props = {
  gender: 'boy' | 'girl'
  color: string
}

export default function HairMesh({ gender, color }: Props) {
  if (gender === 'girl') {
    return (
      <group position={[0, 0.15, 0]}>
        {/* Ana saç kapağı — yarım küre, daha yumuşak kaplama */}
        <mesh position={[0, 0.3, -0.05]} castShadow>
          <sphereGeometry
            args={[0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Ön perçem — geniş, alnın üstünde yayılmış */}
        <mesh
          position={[0, 0.25, 0.58]}
          rotation={[0.25, 0, 0]}
          castShadow
        >
          <sphereGeometry args={[0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Yan perçem — sağ ve sol */}
        <mesh
          position={[0.5, 0.15, 0.3]}
          rotation={[0.2, 0.3, 0.5]}
          castShadow
        >
          <sphereGeometry
            args={[0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color={color} />
        </mesh>
        <mesh
          position={[-0.5, 0.15, 0.3]}
          rotation={[0.2, -0.3, -0.5]}
          castShadow
        >
          <sphereGeometry
            args={[0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshToonMaterial color={color} />
        </mesh>

        {/* Sol at kuyruğu — dalgalı, konik */}
        <group position={[0.6, 0.1, -0.1]} rotation={[0, 0, -0.2]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.1, 0.6, 14]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Yumuşak uç */}
          <mesh position={[0, -0.48, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Pembe bandaj — daha süslü */}
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.2, 0.05, 8, 16]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
          {/* Bandaj fiyonk */}
          <mesh position={[0, 0.1, 0.22]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.03]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
        </group>

        {/* Sağ at kuyruğu */}
        <group position={[-0.6, 0.1, -0.1]} rotation={[0, 0, 0.2]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.1, 0.6, 14]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, -0.48, 0]} castShadow>
            <sphereGeometry args={[0.12, 12, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.2, 0.05, 8, 16]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
          <mesh position={[0, 0.1, -0.22]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.14, 0.14, 0.03]} />
            <meshBasicMaterial color="#ff6b9d" />
          </mesh>
        </group>

        {/* Kirpikler — sevimli detay */}
        <mesh position={[0.25, 0.32, 0.62]} rotation={[0.1, 0, 0.2]}>
          <boxGeometry args={[0.15, 0.03, 0.01]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[-0.25, 0.32, 0.62]} rotation={[0.1, 0, -0.2]}>
          <boxGeometry args={[0.15, 0.03, 0.01]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      </group>
    )
  }

  // Boy — daha sevimli kısa saç + kıvrık perçem
  return (
    <group position={[0, 0.15, 0]}>
      {/* Ana saç kapağı — düz daha kapsamlı */}
      <mesh position={[0, 0.3, -0.03]} castShadow>
        <sphereGeometry
          args={[0.76, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.3]}
        />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Yan kaykılmış perçem (alın üstü, sağa doğru) */}
      <mesh
        position={[0.15, 0.55, 0.55]}
        rotation={[0.3, 0, -0.5]}
        castShadow
      >
        <sphereGeometry
          args={[0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.5]}
        />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Diğer taraf hafif perçem */}
      <mesh
        position={[-0.3, 0.5, 0.45]}
        rotation={[0.25, 0, 0.4]}
        castShadow
      >
        <sphereGeometry
          args={[0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Arkaya dökülen saç — boyun hizası */}
      <mesh position={[0, 0.05, -0.55]} rotation={[-0.15, 0, 0]} castShadow>
        <sphereGeometry
          args={[0.35, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.5]}
        />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  )
}
