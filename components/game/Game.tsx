'use client'

import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, PerformanceMonitor, Sky } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight } from 'three'
import Player from './Player'
import World from './World'
import HUD from '../ui/HUD'
import MobileJoystick from '../ui/MobileJoystick'
import PotionInventory from '../ui/PotionInventory'
import { useGameStore } from '@/lib/store'
import { getPlayerPos } from '@/lib/playerHandle'

const controlKeys = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'attack', keys: ['f', 'F', 'q', 'Q'] },
  // 'camera' V tuşu Player.tsx içindeki doğrudan keydown listener'ıyla işleniyor
  // (pointer lock user-activation gerektirdiği için)
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
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5])
  const lightRef = useRef<DirectionalLight>(null)

  useEffect(() => {
    const mobile =
      typeof window !== 'undefined' &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.matchMedia('(pointer: coarse)').matches)
    setIsMobile(mobile)
    setDpr(mobile ? [1, 1.25] : [1, 1.6])
  }, [setIsMobile])

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
          <PerformanceMonitor
            flipflops={3}
            onFallback={() => setDpr([1, 1])}
          />
          <Sky sunPosition={[100, 30, 100]} turbidity={2} rayleigh={0.5} />
          <ambientLight intensity={0.85} />
          <directionalLight
            ref={lightRef}
            position={[20, 35, 18]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-35}
            shadow-camera-right={35}
            shadow-camera-top={35}
            shadow-camera-bottom={-35}
            shadow-camera-near={0.1}
            shadow-camera-far={150}
            shadow-bias={-0.0005}
          />
          <Physics gravity={[0, -22, 0]} interpolate>
            <ShadowFollower lightRef={lightRef} />
            <World />
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <HUD />
      <PotionInventory />
      <MobileJoystick />
    </div>
  )
}
