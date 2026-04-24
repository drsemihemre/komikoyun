'use client'

import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  SMAA,
  SSAO,
  DepthOfField,
  ToneMapping,
  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Environment } from '@react-three/drei'
import { Vector2 } from 'three'
import { useMemo, useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { getGameHour } from './DayNightCycle'

// ═══════════════════════════════════════════════════════════════
//   UNREAL-BENZER GRAFIK PIPELINE
// ─────────────────────────────────────────────────────────────
//   low: HDRI IBL + SMAA (hafif)
//   medium: + SSAO + Bloom + Vignette
//   high:  + DOF + Chromatic Aberration + film grain + ACES
// ═══════════════════════════════════════════════════════════════

export default function GraphicsFx() {
  const level = useGameStore((s) => s.graphicsLevel)
  const [hour, setHour] = useState(() => getGameHour())

  useEffect(() => {
    const id = setInterval(() => setHour(getGameHour()), 3000)
    return () => clearInterval(id)
  }, [])

  // Saate göre HDRI preset
  const preset: 'night' | 'sunset' | 'park' | 'dawn' =
    hour < 5
      ? 'night'
      : hour < 7
        ? 'dawn'
        : hour >= 21
          ? 'night'
          : hour >= 19
            ? 'sunset'
            : 'park'

  // CA offset — hafif renk kenarları
  const caOffset = useMemo(() => new Vector2(0.0004, 0.0004), [])

  if (level === 'low') {
    return (
      <>
        <Environment preset={preset} background={false} environmentIntensity={0.6} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <SMAA />
        </EffectComposer>
      </>
    )
  }

  if (level === 'medium') {
    return (
      <>
        <Environment preset={preset} background={false} environmentIntensity={0.8} />
        <EffectComposer multisampling={0} enableNormalPass>
          <SMAA />
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={16}
            radius={0.08}
            intensity={18}
            luminanceInfluence={0.5}
            worldDistanceThreshold={50}
            worldDistanceFalloff={10}
            worldProximityThreshold={10}
            worldProximityFalloff={2}
          />
          <Bloom
            intensity={0.65}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.5} />
        </EffectComposer>
      </>
    )
  }

  // HIGH — full Unreal-benzer pipeline
  return (
    <>
      <Environment preset={preset} background={false} environmentIntensity={1.0} />
      <EffectComposer multisampling={0} enableNormalPass>
        {/* Anti-aliasing — Unreal'in TAA'sına benzer smooth kenar */}
        <SMAA />

        {/* Ambient Occlusion — köşe ve çukurlarda gerçekçi gölgeleme */}
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={24}
          radius={0.1}
          intensity={28}
          luminanceInfluence={0.6}
          worldDistanceThreshold={60}
          worldDistanceFalloff={12}
          worldProximityThreshold={12}
          worldProximityFalloff={3}
        />

        {/* Depth of Field — sinematik derinlik */}
        <DepthOfField
          focusDistance={0.015}
          focalLength={0.05}
          bokehScale={2.2}
          height={480}
        />

        {/* Bloom — Unreal'in "lens flare + glow" hissi */}
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.78}
        />

        {/* Chromatic Aberration — hafif lens hatası, sinematik his */}
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={caOffset}
          radialModulation={false}
          modulationOffset={0}
        />

        {/* Parlaklık/kontrast ince ayarı — canlı renkler */}
        <BrightnessContrast brightness={0.02} contrast={0.1} />
        <HueSaturation hue={0} saturation={0.12} />

        {/* Film grain — hafif doku, Unreal default */}
        <Noise
          premultiply
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.25}
        />

        {/* ACES Filmic Tone Mapping — Unreal default tone curve */}
        <ToneMapping
          mode={ToneMappingMode.ACES_FILMIC}
          averageLuminance={1.0}
          adaptationRate={1.0}
          maxLuminance={16.0}
        />

        {/* Vignette — kenar karartma, sinematik odak */}
        <Vignette eskil={false} offset={0.25} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
