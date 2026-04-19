'use client'

import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight, AmbientLight } from 'three'
import DayNightCycle from './DayNightCycle'
import Player from './Player'
import World from './World'
import HUD from '../ui/HUD'
import MobileJoystick from '../ui/MobileJoystick'
import PotionInventory from '../ui/PotionInventory'
import StartScreen from '../ui/StartScreen'
import PauseMenu from '../ui/PauseMenu'
import { useGameStore } from '@/lib/store'
import { getPlayerPos } from '@/lib/playerHandle'
import { startMusic } from '@/lib/sounds'

const controlKeys = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'attack', keys: ['f', 'F', 'q', 'Q'] },
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
    const start = () => startMusic()
    document.addEventListener('pointerdown', start, { once: true })
    document.addEventListener('keydown', start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => {
      document.removeEventListener('pointerdown', start)
      document.removeEventListener('keydown', start)
      document.removeEventListener('touchstart', start)
    }
  }, [])

  // ESC → pause toggle (oyun başladıysa)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted) return
      // ESC'i pointer-lock çıkışı da tetiklemesi için burada da handle'la
      if (state.cameraMode === 'first' && document.pointerLockElement) {
        // Browser'ın doğal ESC davranışı zaten lock'u kırar; pause'a da geç
      }
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
          shadows
          camera={{ position: [0, 8, 16], fov: 60 }}
          dpr={dpr}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          performance={{ min: 0.5 }}
        >
          <PerformanceMonitor flipflops={3} onFallback={() => setDpr([1, 1])} />
          <DayNightCycle
            dirLightRef={lightRef}
            ambientRef={ambientRef}
            cycleSeconds={210}
          />
          <ambientLight ref={ambientRef} intensity={0.85} />
          <directionalLight
            ref={lightRef}
            position={[20, 35, 18]}
            intensity={1.4}
            castShadow
            shadow-mapSize={mobile ? [512, 512] : [1024, 1024]}
            shadow-camera-left={-35}
            shadow-camera-right={35}
            shadow-camera-top={35}
            shadow-camera-bottom={-35}
            shadow-camera-near={0.1}
            shadow-camera-far={150}
            shadow-bias={-0.0005}
          />
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
      <StartScreen />
    </div>
  )
}
