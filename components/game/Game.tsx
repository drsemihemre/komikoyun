'use client'

import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
  type DirectionalLight,
  type AmbientLight,
} from 'three'
import DayNightCycle from './DayNightCycle'
import Player from './Player'
import World from './World'
import HUD from '../ui/HUD'
import MobileJoystick from '../ui/MobileJoystick'
import PotionInventory from '../ui/PotionInventory'
import StartScreen from '../ui/StartScreen'
import PauseMenu from '../ui/PauseMenu'
import ShopModal from '../ui/ShopModal'
import GraphicsFx from './GraphicsFx'
import BuildHud from '../ui/BuildHud'
import MobileLookZone from '../ui/MobileLookZone'
import { useGameStore } from '@/lib/store'
import { getPlayerPos } from '@/lib/playerHandle'
import { startMusic, startAmbient } from '@/lib/sounds'

const controlKeys = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'attack', keys: ['f', 'F', 'q', 'Q'] },
  { name: 'weaponFire', keys: ['r', 'R'] },
]

function ShadowFollower({
  lightRef,
}: {
  lightRef: React.RefObject<DirectionalLight | null>
}) {
  useFrame(() => {
    const pos = getPlayerPos()
    const light = lightRef.current
    if (!pos || !light) return
    light.position.set(pos.x + 20, pos.y + 35, pos.z + 18)
    light.target.position.set(pos.x, pos.y, pos.z)
    light.target.updateMatrixWorld()
  })
  return null
}

export default function Game() {
  const setIsMobile = useGameStore((s) => s.setIsMobile)
  const gameStarted = useGameStore((s) => s.gameStarted)
  const paused = useGameStore((s) => s.paused)
  const togglePause = useGameStore((s) => s.togglePause)
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5])
  const [mobile, setMobileLocal] = useState(false)
  const lightRef = useRef<DirectionalLight>(null)
  const ambientRef = useRef<AmbientLight>(null)

  useEffect(() => {
    const m =
      typeof window !== 'undefined' &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.matchMedia('(pointer: coarse)').matches)
    setIsMobile(m)
    setMobileLocal(m)
    setDpr(m ? [1, 1.2] : [1, 1.6])
  }, [setIsMobile])

  useEffect(() => {
    const start = () => {
      startMusic()
      startAmbient()
    }
    document.addEventListener('pointerdown', start, { once: true })
    document.addEventListener('keydown', start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => {
      document.removeEventListener('pointerdown', start)
      document.removeEventListener('keydown', start)
      document.removeEventListener('touchstart', start)
    }
  }, [])

  // ESC → pause toggle (oyun başladıysa) — ama shop açıksa onu kapatmak ShopModal'ın görevi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted) return
      if (state.shopOpen) return // shop açıkken ESC onu kapatır
      togglePause()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [togglePause])

  const physicsPaused = paused || !gameStarted

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden">
      <KeyboardControls map={controlKeys}>
        <Canvas
          shadows={{ type: PCFSoftShadowMap, enabled: true }}
          camera={{ position: [0, 8, 16], fov: 60 }}
          dpr={dpr}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
            outputColorSpace: SRGBColorSpace,
            stencil: false,
          }}
          performance={{ min: 0.5 }}
        >
          <PerformanceMonitor flipflops={3} onFallback={() => setDpr([1, 1])} />
          <DayNightCycle
            dirLightRef={lightRef}
            ambientRef={ambientRef}
          />
          <ambientLight ref={ambientRef} intensity={0.85} />
          <directionalLight
            ref={lightRef}
            position={[20, 35, 18]}
            intensity={1.4}
            castShadow
            shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
            shadow-camera-near={0.1}
            shadow-camera-far={200}
            shadow-bias={-0.00025}
            shadow-normalBias={0.04}
            shadow-radius={4}
          />
          {/* İkincil dolgu ışığı — karşı yönden hafif rim lighting (Unreal "fill light") */}
          <directionalLight
            position={[-25, 20, -15]}
            intensity={0.35}
            color="#b8d4ff"
          />
          {/* Gökyüzü hemisphere ışığı — ambient derinliği arttırır */}
          <hemisphereLight args={['#ffefd5', '#4a5568', 0.4]} />
          <GraphicsFx />
          <Physics gravity={[0, -22, 0]} interpolate paused={physicsPaused}>
            <ShadowFollower lightRef={lightRef} />
            <World />
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <HUD />
      <PotionInventory />
      <MobileJoystick />
      <PauseMenu />
      <ShopModal />
      <BuildHud />
      <MobileLookZone />
      <StartScreen />
    </div>
  )
}
