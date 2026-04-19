'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import type { DirectionalLight, AmbientLight } from 'three'

type Props = {
  cycleSeconds?: number
  dirLightRef: React.RefObject<DirectionalLight | null>
  ambientRef: React.RefObject<AmbientLight | null>
}

export default function DayNightCycle({
  cycleSeconds = 180,
  dirLightRef,
  ambientRef,
}: Props) {
  // Sun position güncellemesi çok sık rerender etmesin — her 400ms
  const [sunPos, setSunPos] = useState<[number, number, number]>([80, 55, 60])
  const startT = useRef<number | null>(null)

  useEffect(() => {
    startT.current = performance.now() / 1000 - cycleSeconds * 0.15 // başlangıçta biraz öğleye doğru
    const id = setInterval(() => {
      const now = performance.now() / 1000
      const t = (now - (startT.current ?? 0)) / cycleSeconds
      // 0 = doğu, 0.25 = zenit, 0.5 = batı, 0.75 = gece
      const angle = (t % 1) * Math.PI * 2
      const sunY = Math.sin(angle) * 80
      const sunX = Math.cos(angle) * 80
      setSunPos([sunX, sunY, sunY * 0.3 + 30])
    }, 400)
    return () => clearInterval(id)
  }, [cycleSeconds])

  // Işıklandırma + yön animasyonu (frame-wise)
  useFrame(() => {
    const dir = dirLightRef.current
    const amb = ambientRef.current
    if (!dir || !amb) return
    // Sun height ratio: 1 zenith, -1 subsun
    const sunY = sunPos[1]
    const altitude = sunY / 80 // -1 to 1
    const daylight = Math.max(0, altitude) // 0 at horizon/night, 1 at noon
    const isNight = altitude < -0.1

    // Directional light intensity + color
    const dirIntensity = daylight * 1.3 + 0.05
    dir.intensity = dirIntensity

    if (isNight) {
      // Cool moonlight
      dir.color.setRGB(0.55, 0.65, 0.9)
      dir.intensity = 0.25
    } else if (altitude < 0.2) {
      // Golden hour — warm
      dir.color.setRGB(1, 0.75, 0.5)
    } else {
      // Midday — white
      dir.color.setRGB(1, 0.98, 0.93)
    }

    // Ambient
    amb.intensity = 0.25 + daylight * 0.7
    if (isNight) {
      amb.color.setRGB(0.35, 0.4, 0.6)
      amb.intensity = 0.25
    } else if (altitude < 0.2) {
      amb.color.setRGB(1, 0.82, 0.7)
    } else {
      amb.color.setRGB(1, 1, 1)
    }
  })

  const sunAlt = sunPos[1] / 80
  const isNight = sunAlt < -0.1

  return (
    <>
      <Sky
        sunPosition={sunPos}
        turbidity={isNight ? 8 : 2}
        rayleigh={isNight ? 0.1 : 0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      {isNight && (
        <Stars
          radius={120}
          depth={50}
          count={1500}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
      )}
    </>
  )
}
