import Ground from './Ground'
import Boundary from './Boundary'
import Building from './Building'
import SpiralStairs from './SpiralStairs'
import SafeZone from './SafeZone'
import Arena from './Arena'

export default function World() {
  return (
    <>
      <Ground />
      <Boundary />
      <SafeZone />
      <Arena />
      <Building position={[18, 0, -6]} height={24} />
      <SpiralStairs position={[-16, 0, -4]} height={16} />
    </>
  )
}
