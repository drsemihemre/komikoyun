// Prosedürel ses efektleri — Web Audio API ile sıfır asset
// Her ses bir oscillator + envelope ile anında üretilir

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      ctx = new AC()
      masterGain = ctx.createGain()
      masterGain.gain.value = 0.55
      masterGain.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (masterGain) masterGain.gain.value = m ? 0 : 0.55
}

export function isMuted() {
  return muted
}

function envelope(
  c: AudioContext,
  dest: AudioNode,
  atk: number,
  dec: number,
  peak: number
): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(peak, c.currentTime + atk)
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.001),
    c.currentTime + atk + dec
  )
  g.connect(dest)
  return g
}

function connectMaster(c: AudioContext, src: AudioNode) {
  src.connect(masterGain ?? c.destination)
}

export function playJump() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'triangle'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.18, 0.25)
  osc.connect(g)
  osc.frequency.setValueAtTime(220, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(680, c.currentTime + 0.12)
  osc.start()
  osc.stop(c.currentTime + 0.2)
}

export function playLand(impactVel: number) {
  const c = getCtx()
  if (!c || muted) return
  const strength = Math.min(1, impactVel / 20)
  // Noise burst filtered low
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.15), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 180 + strength * 300
  const g = envelope(
    c,
    masterGain ?? c.destination,
    0.005,
    0.15,
    0.3 + strength * 0.3
  )
  src.connect(filter)
  filter.connect(g)
  src.start()
}

export function playHit() {
  const c = getCtx()
  if (!c || muted) return
  // Slap: short noise + pitched tone
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1200)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 800
  filter.Q.value = 2
  const g = envelope(c, masterGain ?? c.destination, 0.002, 0.08, 0.45)
  src.connect(filter)
  filter.connect(g)
  src.start()

  // Pitched pop
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(420, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.1)
  const og = envelope(c, masterGain ?? c.destination, 0.001, 0.1, 0.2)
  osc.connect(og)
  osc.start()
  osc.stop(c.currentTime + 0.12)
  void connectMaster
}

export function playPotion(type: 'grow' | 'shrink' | 'speed' | 'slow') {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'sine'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.25, 0.2)
  osc.connect(g)
  const freqMap = {
    grow: [400, 800],
    shrink: [800, 400],
    speed: [500, 1200],
    slow: [600, 200],
  } as const
  const [a, b] = freqMap[type]
  osc.frequency.setValueAtTime(a, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(b, c.currentTime + 0.22)
  osc.start()
  osc.stop(c.currentTime + 0.28)

  // Sparkle overlay
  const osc2 = c.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.value = b * 2
  const g2 = envelope(c, masterGain ?? c.destination, 0.01, 0.15, 0.1)
  osc2.connect(g2)
  osc2.start(c.currentTime + 0.08)
  osc2.stop(c.currentTime + 0.25)
}

export function playLaunch() {
  const c = getCtx()
  if (!c || muted) return
  // Whoosh: filtered noise rising pitch
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.8
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 2
  filter.frequency.setValueAtTime(300, c.currentTime)
  filter.frequency.exponentialRampToValueAtTime(
    2500,
    c.currentTime + 0.5
  )
  const g = envelope(c, masterGain ?? c.destination, 0.01, 0.55, 0.5)
  src.connect(filter)
  filter.connect(g)
  src.start()
}

export function playKo() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'square'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.35, 0.25)
  osc.connect(g)
  osc.frequency.setValueAtTime(600, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.3)
  osc.start()
  osc.stop(c.currentTime + 0.35)
}

export function playDamage() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  const g = envelope(c, masterGain ?? c.destination, 0.002, 0.15, 0.3)
  osc.connect(g)
  osc.frequency.setValueAtTime(180, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.15)
  osc.start()
  osc.stop(c.currentTime + 0.18)
}
