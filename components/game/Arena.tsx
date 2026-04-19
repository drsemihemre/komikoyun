import Creature, { type CreatureVariant } from './Creature'
import { ARENA } from '@/lib/store'

type Spawn = {
  id: string
  offset: [number, number]
  variant: CreatureVariant
}

const CREATURES: Spawn[] = [
  {
    id: 'c1',
    offset: [5, 0],
    variant: { shape: 'round', color: '#f06292', hp: 1, speed: 2.5, size: 1 },
  },
  {
    id: 'c2',
    offset: [-5, 0],
    variant: {
      shape: 'horned',
      color: '#64b5f6',
      accentColor: '#0d47a1',
      hp: 2,
      speed: 2.3,
      size: 1.05,
    },
  },
  {
    id: 'c3',
    offset: [0, 5],
    variant: {
      shape: 'jumper',
      color: '#81c784',
      accentColor: '#1b5e20',
      hp: 1,
      speed: 3.2,
      size: 0.85,
    },
  },
  {
    id: 'c4',
    offset: [0, -5],
    variant: {
      shape: 'tank',
      color: '#ffb74d',
      accentColor: '#5d4037',
      hp: 3,
      speed: 1.6,
      size: 1.45,
    },
  },
  {
    id: 'c5',
    offset: [3.5, -3.5],
    variant: {
      shape: 'horned',
      color: '#ba68c8',
      accentColor: '#4a148c',
      hp: 2,
      speed: 2.4,
      size: 1,
    },
  },
  {
    id: 'c6',
    offset: [-3.5, 3.5],
    variant: {
      shape: 'jumper',
      color: '#ff8a65',
      accentColor: '#bf360c',
      hp: 1,
      speed: 3,
      size: 0.9,
    },
  },
  {
    id: 'c7',
    offset: [7, 4],
    variant: { shape: 'round', color: '#4dd0e1', hp: 1, speed: 2.6, size: 1 },
  },
]

export default function Arena() {
  const [cx, , cz] = ARENA.center

  return (
    <>
      <mesh
        position={[cx, 0.015, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[ARENA.radius, 48]} />
        <meshToonMaterial color="#f3d2f3" />
      </mesh>
      <mesh position={[cx, 0.025, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA.radius - 0.5, ARENA.radius, 48]} />
        <meshBasicMaterial color="#7b2cbf" />
      </mesh>
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
          variant={c.variant}
        />
      ))}
    </>
  )
}
