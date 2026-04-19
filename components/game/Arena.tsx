import Creature from './Creature'
import { ARENA } from '@/lib/store'

const CREATURES = [
  { id: 'c1', color: '#f06292', offset: [5, 0] as [number, number] },
  { id: 'c2', color: '#64b5f6', offset: [-5, 0] as [number, number] },
  { id: 'c3', color: '#81c784', offset: [0, 5] as [number, number] },
  { id: 'c4', color: '#ffb74d', offset: [0, -5] as [number, number] },
  { id: 'c5', color: '#ba68c8', offset: [3.5, -3.5] as [number, number] },
]

export default function Arena() {
  const [cx, , cz] = ARENA.center

  return (
    <>
      {/* Floor */}
      <mesh
        position={[cx, 0.015, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[ARENA.radius, 48]} />
        <meshToonMaterial color="#f3d2f3" />
      </mesh>
      {/* Outer ring */}
      <mesh
        position={[cx, 0.025, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[ARENA.radius - 0.5, ARENA.radius, 48]} />
        <meshBasicMaterial color="#7b2cbf" />
      </mesh>
      {/* Center star decoration */}
      <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.2, 6]} />
        <meshBasicMaterial color="#7b2cbf" />
      </mesh>

      {CREATURES.map((c) => (
        <Creature
          key={c.id}
          id={c.id}
          spawn={[cx + c.offset[0], 1.2, cz + c.offset[1]]}
          arenaCenter={[cx, 0, cz]}
          arenaRadius={ARENA.radius}
          color={c.color}
        />
      ))}
    </>
  )
}
