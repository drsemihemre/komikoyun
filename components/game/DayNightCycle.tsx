'use client'

import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import type { DirectionalLight, AmbientLight } from 'three'

type Props = {
  dirLightRef: React.RefObject<DirectionalLight | null>
  ambientRef: React.RefObject<AmbientLight | null>
}

// Gerçek yerel saati güne göre sun konumuna eşle
// 6:00 = doğu ufku, 12:00 = zenit, 18:00 = batı ufku, 00:00 = anti-zenit
function sunPositionFromLocalTime(): [number, number, number] {
  const now = new Date()
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
  // Map hour 0-24 to angle around horizon circle
  // 6am → angle 0 (east), 12pm → angle π/2 (up), 6pm → π, 12am → 3π/2 (down)
  const angle = ((h - 6) / 24) * Math.PI * 2
  const sunX = Math.cos(angle) * 80
  const sunY = Math.sin(angle) * 80
  const sunZ = 30 + Math.sin(angle * 0.5) * 15 // slight Z variation
  return [sunX, sunY, sunZ]
}

export default function DayNightCycle({ dirLightRef, ambientRef }: Props) {
  const [sunPos, setSunPos] = useState<[number, number, number]>(() =>
    sunPositionFromLocalTime()
  )

  useEffect(() => {
    const id = setInterval(() => {
      setSunPos(sunPositionFromLocalTime())
    }, 5000) // Güneş her 5 saniyede bir güncellenir (smooth)
    return () => clearInterval(id)
  }, [])

  useFrame(() => {
    const dir = dirLightRef.current
    const amb = ambientRef.current
    if (!dir || !amb) return
    const sunY = sunPos[1]
    const altitude = sunY / 80
    const daylight = Math.max(0, altitude)
    const isNight = altitude < -0.1

    if (isNight) {
      dir.color.setRGB(0.55, 0.65, 0.9)
      dir.intensity = 0.25
      amb.color.setRGB(0.35, 0.4, 0.6)
      amb.intensity = 0.3
    } else if (altitude < 0.2) {
      dir.color.setRGB(1, 0.75, 0.5)
      dir.intensity = daylight * 1.3 + 0.3
      amb.color.setRGB(1, 0.82, 0.7)
      amb.intensity = 0.35 + daylight * 0.5
    } else {
      dir.color.setRGB(1, 0.98, 0.93)
      dir.intensity = daylight * 1.3 + 0.1
      amb.color.setRGB(1, 1, 1)
      amb.intensity = 0.3 + daylight * 0.6
    }
  })

  const sunAlt = sunPos[1] / 80
  const isNight = sunAlt < -0.1

  return (
    <>
      <Sky
        sunPosition={sunPos}
        turbidity={isNight ? 10 : 2}
        rayleigh={isNight ? 0.1 : 0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      {isNight && (
        <Stars
          radius={140}
          depth={60}
          count={1500}
          factor={5}
          saturation={0}
          fade
          speed={0.3}
        />
      )}
    </>
  )
}
