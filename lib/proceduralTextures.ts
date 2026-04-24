// Procedural canvas-tabanlı doku üretimi — asset indirmeye gerek yok
// PBR-benzeri görünüm için color + normal + roughness haritaları

import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  LinearMipmapLinearFilter,
  type Texture,
} from 'three'

function hash(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

function noise2D(x: number, y: number): number {
  const x0 = Math.floor(x),
    y0 = Math.floor(y)
  const fx = smooth(x - x0),
    fy = smooth(y - y0)
  const h00 = hash(x0, y0)
  const h10 = hash(x0 + 1, y0)
  const h01 = hash(x0, y0 + 1)
  const h11 = hash(x0 + 1, y0 + 1)
  return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fy)
}

function fbm(x: number, y: number, octaves = 4): number {
  let v = 0,
    amp = 1,
    freq = 1,
    norm = 0
  for (let i = 0; i < octaves; i++) {
    v += noise2D(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return v / norm
}

function finalizeTexture(canvas: HTMLCanvasElement, repeat: number, colorSpace = true): Texture {
  const tex = new CanvasTexture(canvas)
  if (colorSpace) tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.minFilter = LinearMipmapLinearFilter
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function createCanvas(size: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  img: ImageData
} {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  return { canvas, ctx, img }
}

// ─────────────────────────────────────────────────────────────
// GRASS — çimen rengi + variasyon (sarı, koyu yeşil lekeleri)
// ─────────────────────────────────────────────────────────────
let cachedGrassColor: Texture | null = null
let cachedGrassNormal: Texture | null = null
let cachedGrassRoughness: Texture | null = null

export function getGrassColorMap(): Texture {
  if (cachedGrassColor) return cachedGrassColor
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 512
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 14, y / 14, 5)
      const clumps = fbm(x / 40, y / 40, 3)
      const blade = fbm(x / 2.5, y / 2.5, 2)
      // Yeşil varyasyon
      let r = 80 + n * 40
      let g = 160 + n * 50
      let b = 55 + n * 25
      // Sarımsı parçalar (clumps > 0.65)
      if (clumps > 0.65) {
        r = 155 + (clumps - 0.65) * 300
        g = 160 + (clumps - 0.65) * 200
        b = 60 + blade * 30
      }
      // Koyu toprak lekeleri (clumps < 0.22)
      if (clumps < 0.22) {
        r = 90 + n * 40
        g = 70 + n * 30
        b = 45 + n * 20
      }
      // Blade detail
      r += blade * 15 - 7
      g += blade * 15 - 7
      b += blade * 10 - 5
      const idx = (y * size + x) * 4
      data[idx] = Math.max(0, Math.min(255, r))
      data[idx + 1] = Math.max(0, Math.min(255, g))
      data[idx + 2] = Math.max(0, Math.min(255, b))
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedGrassColor = finalizeTexture(canvas, 60)
  return cachedGrassColor
}

export function getGrassNormalMap(): Texture {
  if (cachedGrassNormal) return cachedGrassNormal
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 512
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  const eps = 1.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Height: kısa dalga + uzun dalga
      const hx0 = fbm((x - eps) / 5, y / 5, 3)
      const hx1 = fbm((x + eps) / 5, y / 5, 3)
      const hy0 = fbm(x / 5, (y - eps) / 5, 3)
      const hy1 = fbm(x / 5, (y + eps) / 5, 3)
      const dx = (hx1 - hx0) * 20
      const dy = (hy1 - hy0) * 20
      const len = Math.sqrt(dx * dx + dy * dy + 1)
      const nx = -dx / len,
        ny = -dy / len,
        nz = 1 / len
      const idx = (y * size + x) * 4
      data[idx] = (nx * 0.5 + 0.5) * 255
      data[idx + 1] = (ny * 0.5 + 0.5) * 255
      data[idx + 2] = (nz * 0.5 + 0.5) * 255
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedGrassNormal = finalizeTexture(canvas, 60, false)
  return cachedGrassNormal
}

export function getGrassRoughnessMap(): Texture {
  if (cachedGrassRoughness) return cachedGrassRoughness
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 256
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 8, y / 8, 3)
      const v = 180 + n * 60
      const idx = (y * size + x) * 4
      data[idx] = data[idx + 1] = data[idx + 2] = v
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedGrassRoughness = finalizeTexture(canvas, 60, false)
  return cachedGrassRoughness
}

// ─────────────────────────────────────────────────────────────
// DIRT / SAND — toprak ve kum dokuları
// ─────────────────────────────────────────────────────────────
let cachedDirt: Texture | null = null

export function getDirtMap(): Texture {
  if (cachedDirt) return cachedDirt
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 256
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 12, y / 12, 4)
      const grain = fbm(x / 2, y / 2, 2)
      const r = 120 + n * 60 + grain * 30
      const g = 90 + n * 40 + grain * 20
      const b = 55 + n * 30 + grain * 15
      const idx = (y * size + x) * 4
      data[idx] = Math.min(255, r)
      data[idx + 1] = Math.min(255, g)
      data[idx + 2] = Math.min(255, b)
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedDirt = finalizeTexture(canvas, 30)
  return cachedDirt
}

// ─────────────────────────────────────────────────────────────
// STONE — kaya dokusu
// ─────────────────────────────────────────────────────────────
let cachedStone: Texture | null = null

export function getStoneMap(): Texture {
  if (cachedStone) return cachedStone
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 256
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 10, y / 10, 4)
      const crack = fbm(x / 2, y / 2, 2) > 0.82 ? 0.3 : 1
      const v = (110 + n * 70) * crack
      const idx = (y * size + x) * 4
      data[idx] = v * 1.0
      data[idx + 1] = v * 1.02
      data[idx + 2] = v * 1.08
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedStone = finalizeTexture(canvas, 6)
  return cachedStone
}

// ─────────────────────────────────────────────────────────────
// WOOD — tahta dokusu
// ─────────────────────────────────────────────────────────────
let cachedWood: Texture | null = null

export function getWoodMap(): Texture {
  if (cachedWood) return cachedWood
  if (typeof document === 'undefined') return null as unknown as Texture
  const size = 256
  const { canvas, ctx, img } = createCanvas(size)
  const data = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(y * 0.15 + fbm(x / 20, y / 80, 2) * 5) * 0.5 + 0.5
      const ring = fbm(x / 40, y / 10, 3)
      const r = 110 + grain * 60 + ring * 20
      const g = 70 + grain * 40 + ring * 15
      const b = 40 + grain * 20 + ring * 10
      const idx = (y * size + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cachedWood = finalizeTexture(canvas, 8)
  return cachedWood
}
