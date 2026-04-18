'use client'

import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls, Sky } from '@react-three/drei'
import { useEffect } from 'react'
import Player from './Player'
import World from './World'
import HUD from '../ui/HUD'
import MobileJoystick from '../ui/MobileJoystick'
import { useGameStore } from '@/lib/store'

const controlKeys = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
]

export default function Game() {
  const setIsMobile = useGameStore((s) => s.setIsMobile)

  useEffect(() => {
    const mobile =
      typeof window !== 'undefined' &&
      (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.matchMedia('(pointer: coarse)').matches)
    setIsMobile(mobile)
  }, [setIsMobile])

  return (
    <div className="w-screen h-screen relative overflow-hidden select-none">
      <KeyboardControls map={controlKeys}>
        <Canvas
          shadows
          camera={{ position: [0, 8, 16], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <Sky sunPosition={[100, 30, 100]} turbidity={2} rayleigh={0.5} />
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[20, 30, 15]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
            shadow-camera-near={0.1}
            shadow-camera-far={120}
          />
          <Physics gravity={[0, -22, 0]}>
            <World />
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>
      <HUD />
      <MobileJoystick />
    </div>
  )
}
