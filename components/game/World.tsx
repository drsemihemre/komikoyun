import Ground from './Ground'
import Boundary from './Boundary'
import Building from './Building'
import SpiralStairs from './SpiralStairs'

export default function World() {
  return (
    <>
      <Ground />
      <Boundary />
      <Building position={[18, 0, -6]} height={24} />
      <SpiralStairs position={[-16, 0, -4]} height={16} />
    </>
  )
}
