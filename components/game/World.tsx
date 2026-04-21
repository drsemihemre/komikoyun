'use client'

import Ground from './Ground'
import Boundary from './Boundary'
import SpiralStairs from './SpiralStairs'
import SafeZone from './SafeZone'
import Arena from './Arena'
import HupaLupa from './HupaLupa'
import Road from './Road'
import Catapult from './Catapult'
import Balloon from './Balloon'
import BalloonPalace from './BalloonPalace'
import Clouds from './Clouds'
import Decorations from './Decorations'
import HitParticles from './HitParticles'
import SkyBalloons from './SkyBalloons'
import Village from './Village'
import Beach from './Beach'
import Lake from './Lake'
import SurprisePotions from './SurprisePotions'
import Mosque from './Mosque'
import GoKartTrack from './GoKartTrack'
import MarioPipes from './MarioPipes'
import Residents from './Residents'
import SkyTraffic from './SkyTraffic'
import DriveableKart from './DriveableKart'
import RemotePlayers from './RemotePlayers'
import Shop from './Shop'
import Challenges from './Challenges'
import PlacedBlocks from './PlacedBlocks'
import SurprisePortal from './SurprisePortal'
import { useGameStore } from '@/lib/store'

export default function World() {
  const resetNonce = useGameStore((s) => s.resetNonce)
  return (
    <>
      <Ground />
      <Boundary />
      <Clouds />
      <SkyBalloons />
      <Decorations />
      <SafeZone />
      <Arena key={resetNonce} />
      <HupaLupa />
      <Road />
      <Catapult />
      <Balloon />
      <BalloonPalace />
      <Village />
      <Beach />
      <Lake />
      <Mosque />
      <GoKartTrack />
      <SurprisePotions />
      <MarioPipes />
      <Residents />
      <SkyTraffic />
      <DriveableKart />
      <Shop kind="buy" position={[-9, 0, 6]} />
      <Shop kind="upgrade" position={[9, 0, 6]} />
      <Challenges />
      <PlacedBlocks />
      <SurprisePortal />
      <SpiralStairs position={[-16, 0, -4]} height={16} />
      <HitParticles />
      <RemotePlayers />
    </>
  )
}
