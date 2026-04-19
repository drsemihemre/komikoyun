import Trampoline from './Trampoline'
import BallPit from './BallPit'

// Hupa Lupa oyun alanı — trambolin + top havuzu + renkli zemin
const CENTER: [number, number, number] = [-42, 0, 22]

export default function HupaLupa() {
  const [cx, , cz] = CENTER

  return (
    <>
      {/* Zone floor marker */}
      <mesh
        position={[cx, 0.016, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[16, 48]} />
        <meshToonMaterial color="#ffe1b6" />
      </mesh>
      {/* Outer ring decoration */}
      <mesh
        position={[cx, 0.03, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[15.5, 16, 48]} />
        <meshBasicMaterial color="#f4a261" />
      </mesh>

      {/* Trampoline — left side */}
      <Trampoline position={[cx - 5, 0, cz - 4]} size={6} />

      {/* Ball pit — right side */}
      <BallPit
        position={[cx + 5, 0, cz + 3]}
        size={8}
        depth={1.4}
        ballCount={28}
      />

      {/* Welcome sign — colorful pillar */}
      <mesh position={[cx, 2, cz - 14]} castShadow>
        <boxGeometry args={[4, 4, 0.3]} />
        <meshToonMaterial color="#ff006e" />
      </mesh>
      <mesh position={[cx, 4.2, cz - 14]} castShadow>
        <boxGeometry args={[5, 0.4, 0.5]} />
        <meshToonMaterial color="#fb5607" />
      </mesh>
    </>
  )
}
