<!-- src/animations/components/ParticleBackground.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject } from 'vue'
import type { ParticleConfig } from '@/animations/engine'
import type { useThemeStore } from '@/stores/theme'

const props = defineProps<{
  config: ParticleConfig
}>()

// Inject theme store for reduceMotion detection
const themeStore = inject<ReturnType<typeof useThemeStore>>('themeStore')!

const canvasRef = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animFrameId = 0
let particles: Particle[] = []
let burstParticles: BurstParticle[] = []
let trailParticles: TrailParticle[] = []
let mouseX = -1000
let mouseY = -1000
let prevMouseX = -1000
let prevMouseY = -1000
let scanLineY = 0
let flowTime = 0
let hueOffset = 0

// Flow field for constellation mode
let flowField: number[][] = []
const FLOW_COLS = 30
const FLOW_ROWS = 20

// ====== Particle Types ======

interface Particle {
  x: number; y: number; vx: number; vy: number
  radius: number; opacity: number
  history: { x: number; y: number }[]
  // matrix specific
  char?: string; speed?: number; columnX?: number
  trailChars?: string[]
}

interface BurstParticle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; radius: number
  color: string
}

interface TrailParticle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; radius: number
  color: string; opacity: number
}

// ====== Canvas Lifecycle ======

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  // Rebuild flow field on resize
  buildFlowField()
}

// ====== Flow Field (Constellation) ======

function buildFlowField() {
  const w = window.innerWidth
  const h = window.innerHeight
  const cellW = w / FLOW_COLS
  const cellH = h / FLOW_ROWS
  flowField = []
  for (let row = 0; row < FLOW_ROWS; row++) {
    flowField[row] = []
    for (let col = 0; col < FLOW_COLS; col++) {
      const x = col * cellW
      const y = row * cellH
      // Multi-frequency angle field for organic curves
      flowField[row][col] =
        Math.cos(x * 0.008 + flowTime * 0.0001) * 1.2 +
        Math.sin(y * 0.006 + flowTime * 0.00008) * 1.2 +
        Math.cos((x + y) * 0.005) * 0.8
    }
  }
}

function getFlowAngle(x: number, y: number): number {
  const w = window.innerWidth
  const h = window.innerHeight
  const cellW = w / FLOW_COLS
  const cellH = h / FLOW_ROWS
  const col = Math.min(FLOW_COLS - 1, Math.max(0, Math.floor(x / cellW)))
  const row = Math.min(FLOW_ROWS - 1, Math.max(0, Math.floor(y / cellH)))
  return flowField[row]?.[col] ?? 0
}

// ====== Stardust Particle System (微光) ======
// Pure particles with glow — no connecting lines, no trails.
// Focus on organic floating dots with twinkle and depth.

interface StardustParticle {
  x: number; y: number; vx: number; vy: number
  radius: number; baseOpacity: number
  twinklePhase: number; twinkleSpeed: number  // for pulsing glow
  depth: number  // 0=far(小,慢) → 1=near(大,快), drives parallax feel
  history: { x: number; y: number }[]  // trail positions for motion blur without overlay
}

let stardustParticles: StardustParticle[] = []

function createStardust(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  stardustParticles = []
  for (let i = 0; i < count; i++) {
    const depth = Math.random()  // 0–1
    stardustParticles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 0.6 + depth * 2.2,          // near particles bigger
      baseOpacity: 0.15 + depth * 0.45,   // near particles brighter
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.008 + Math.random() * 0.025,
      depth,
      history: []
    })
  }
}

function updateStardust() {
  const w = window.innerWidth
  const h = window.innerHeight

  for (const p of stardustParticles) {
    // Flow field steering — depth affects how strongly flow guides
    const angle = getFlowAngle(p.x, p.y)
    const steerStrength = 0.02 + p.depth * 0.04
    p.vx += Math.cos(angle) * steerStrength
    p.vy += Math.sin(angle) * steerStrength

    // Gentle drift
    const maxSpeed = 0.4 + p.depth * 1.2
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed
      p.vy = (p.vy / speed) * maxSpeed
    }

    // Mouse repulsion — near particles react more
    const dx = p.x - mouseX
    const dy = p.y - mouseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const repelRadius = 80 + p.depth * 80
    if (dist < repelRadius && dist > 1) {
      const force = (1 - dist / repelRadius) * 0.08 * (1 + p.depth)
      p.vx += (dx / dist) * force
      p.vy += (dy / dist) * force
    }

    // Record history BEFORE moving (for trail)
    p.history.push({ x: p.x, y: p.y })
    if (p.history.length > 12) p.history.shift()

    p.x += p.vx
    p.y += p.vy

    // Wrap edges — clear history on jump
    if (p.x < -30) { p.x = w + 30; p.history = [] }
    if (p.x > w + 30) { p.x = -30; p.history = [] }
    if (p.y < -30) { p.y = h + 30; p.history = [] }
    if (p.y > h + 30) { p.y = -30; p.history = [] }

    // Friction — far particles drift lazier
    p.vx *= 0.997 - p.depth * 0.002
    p.vy *= 0.997 - p.depth * 0.002

    // Advance twinkle
    p.twinklePhase += p.twinkleSpeed
  }
}

function drawStardust(color: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight

  // Fully clear canvas each frame — trails are drawn explicitly from history
  ctx.clearRect(0, 0, w, h)

  const alphaHex = (a: number) =>
    Math.floor(Math.min(1, a) * 255).toString(16).padStart(2, '0')

  for (const p of stardustParticles) {
    // Twinkle: sine wave oscillation around base opacity
    const twinkle = 0.7 + 0.3 * Math.sin(p.twinklePhase)
    const opacity = p.baseOpacity * twinkle

    // Draw trail from history (oldest → newest, increasing opacity)
    const trailLen = p.history.length
    for (let t = 0; t < trailLen; t++) {
      const pos = p.history[t]
      const trailOpacity = opacity * (0.08 + 0.12 * (t / Math.max(1, trailLen - 1)))
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, p.radius * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = `${color}${alphaHex(trailOpacity)}`
      ctx.fill()
    }

    // Glow halo (larger, very faint)
    const haloRadius = p.radius * 3.5
    const haloGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloRadius)
    haloGradient.addColorStop(0, `${color}${alphaHex(opacity * 0.5)}`)
    haloGradient.addColorStop(0.4, `${color}${alphaHex(opacity * 0.12)}`)
    haloGradient.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(p.x, p.y, haloRadius, 0, Math.PI * 2)
    ctx.fillStyle = haloGradient
    ctx.fill()

    // Core dot
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = `${color}${alphaHex(opacity)}`
    ctx.fill()
  }
}

// ====== Sakura (Cherry Blossom) System ======
// Petals drift downward with gentle sway and rotation, simulating falling cherry blossoms.

// Soft pink palette for cherry blossoms
const SAKURA_PINK = '#ffb7c5'
const SAKURA_DEEP = '#f4849b'
const SAKURA_PALE = '#ffe0e6'

interface SakuraPetal {
  x: number; y: number
  fallSpeed: number          // base falling speed (px/frame)
  swayAmp: number            // horizontal sway amplitude
  swayFreq: number           // horizontal sway frequency
  swayPhase: number          // initial phase offset
  rotation: number           // current rotation angle (radians)
  rotationSpeed: number      // rotation speed per frame
  size: number               // petal radius
  opacity: number            // base opacity
  petalType: number          // 0-2: different petal shapes
  colorVariant: number       // 0-1: color between pale pink and deep pink
  // Subtle wind gust
  gustOffset: number
  gustSpeed: number
}

let sakuraPetals: SakuraPetal[] = []

function createSakura(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  sakuraPetals = []
  for (let i = 0; i < count; i++) {
    sakuraPetals.push({
      x: Math.random() * w * 1.2 - w * 0.1,  // slight overscan for natural entry
      y: Math.random() * h * 1.3 - h * 0.15, // scattered across full height
      fallSpeed: 0.25 + Math.random() * 0.7,
      swayAmp: 0.4 + Math.random() * 2.0,
      swayFreq: 0.006 + Math.random() * 0.014,
      swayPhase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.025,
      size: 5 + Math.random() * 12,
      opacity: 0.25 + Math.random() * 0.5,
      petalType: Math.floor(Math.random() * 3),
      colorVariant: Math.random(),
      gustOffset: Math.random() * Math.PI * 2,
      gustSpeed: 0.003 + Math.random() * 0.006
    })
  }
}

function updateSakura() {
  const w = window.innerWidth
  const h = window.innerHeight

  for (const p of sakuraPetals) {
    // Falling: constant downward speed
    p.y += p.fallSpeed

    // Horizontal sway: sine wave movement
    // Phase advances based on time/position for natural look
    p.swayPhase += 0.01
    p.x += Math.sin(p.swayPhase * p.swayFreq * 100 + p.gustOffset) * p.swayAmp * 0.03

    // Wind gust: occasional stronger horizontal push
    p.gustOffset += p.gustSpeed
    p.x += Math.sin(p.gustOffset) * 0.2

    // Rotation
    p.rotation += p.rotationSpeed

    // Wrap: when petal falls below screen, reset to top
    if (p.y > h + 30) {
      p.y = -30
      p.x = Math.random() * w * 1.2 - w * 0.1
      p.swayPhase = Math.random() * Math.PI * 2
    }
    // Wrap horizontally
    if (p.x > w + 40) p.x = -40
    if (p.x < -40) p.x = w + 40
  }
}

function drawSakuraPetals(accentColor: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight

  // Clear canvas each frame
  ctx.clearRect(0, 0, w, h)

  const alphaHex = (a: number) =>
    Math.floor(Math.min(1, a) * 255).toString(16).padStart(2, '0')

  // Sort petals by y for depth ordering (further = drawn first = behind)
  // (natural order is fine since we iterate array order; no explicit sort needed for random)

  for (const p of sakuraPetals) {
    // Interpolate petal color between pale and deep pink
    const t = p.colorVariant
    const pinkR = Math.floor(255)
    const pinkG = Math.floor(183 - t * 51)   // 183 → 132
    const pinkB = Math.floor(197 - t * 42)   // 197 → 155
    const petalColor = `#${pinkR.toString(16).padStart(2, '0')}${pinkG.toString(16).padStart(2, '0')}${pinkB.toString(16).padStart(2, '0')}`

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)

    const s = p.size

    // Draw petal with subtle glow
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5)
    glowGrad.addColorStop(0, `${petalColor}${alphaHex(p.opacity * 0.3)}`)
    glowGrad.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    // Draw petal shape based on type
    ctx.beginPath()
    switch (p.petalType) {
      case 0:
        // Classic sakura petal: teardrop/heart shape via two bezier curves
        ctx.moveTo(0, -s)
        ctx.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.7, s * 0.1, 0, s * 0.8)
        ctx.bezierCurveTo(-s * 0.7, s * 0.1, -s * 0.6, -s * 0.5, 0, -s)
        break
      case 1:
        // Rounder petal: wider ellipse-like shape
        ctx.moveTo(0, -s * 0.9)
        ctx.bezierCurveTo(s * 0.8, -s * 0.4, s * 0.5, s * 0.3, 0, s * 0.7)
        ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.8, -s * 0.4, 0, -s * 0.9)
        break
      case 2:
        // Slim elegant petal with pointed tip
        ctx.moveTo(0, -s)
        ctx.bezierCurveTo(s * 0.35, -s * 0.5, s * 0.5, s * 0.2, 0, s * 0.6)
        ctx.bezierCurveTo(-s * 0.5, s * 0.2, -s * 0.35, -s * 0.5, 0, -s)
        break
    }

    // Fill petal with soft gradient
    const petalGrad = ctx.createLinearGradient(0, -s, 0, s * 0.8)
    petalGrad.addColorStop(0, `${petalColor}${alphaHex(p.opacity * 1.0)}`)
    petalGrad.addColorStop(0.5, `${petalColor}${alphaHex(p.opacity * 0.85)}`)
    petalGrad.addColorStop(1, `${petalColor}${alphaHex(p.opacity * 0.5)}`)
    ctx.fillStyle = petalGrad
    ctx.fill()

    // Subtle vein line in center
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.7)
    ctx.lineTo(0, s * 0.5)
    ctx.strokeStyle = `${accentColor}${alphaHex(p.opacity * 0.2)}`
    ctx.lineWidth = 0.5
    ctx.stroke()

    ctx.restore()
  }
}

// ====== Matrix System ======

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const DIGITS = '0123456789'
const MATRIX_CHARS = (KATAKANA + DIGITS).split('')

function createMatrix(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  const columnWidth = 18
  const cols = Math.floor(w / columnWidth)
  particles = []

  for (let i = 0; i < count; i++) {
    const col = Math.floor(Math.random() * cols)
    particles.push({
      x: col * columnWidth + columnWidth / 2,
      y: Math.random() * h * -1, // Start above viewport
      vx: 0,
      vy: 0,
      radius: 0,
      opacity: Math.random() * 0.6 + 0.4,
      history: [],
      char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
      speed: Math.random() * 2 + 0.8,
      columnX: col * columnWidth + columnWidth / 2,
      trailChars: Array.from(
        { length: Math.floor(Math.random() * 6) + 4 },
        () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
      )
    })
  }
}

function updateMatrix() {
  const w = window.innerWidth
  const h = window.innerHeight
  for (const p of particles) {
    p.y += p.speed!
    // Occasionally change character
    if (Math.random() < 0.03) {
      p.char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
    }
    // Reset when off screen
    if (p.y > h + 80) {
      p.y = Math.random() * -200
      p.speed = Math.random() * 2 + 0.8
    }
  }
  scanLineY = (scanLineY + 1.2) % h
}

function drawMatrix(color: string, accentColor: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  const alphaHex = (a: number) =>
    Math.floor(Math.min(1, a) * 255).toString(16).padStart(2, '0')

  // Perspective grid
  const vpX = w * 0.5
  const vpY = h * 0.35
  const gridColor = `${color}0a`

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 0.5

  // Horizontal lines
  const hLines = 20
  for (let i = 0; i < hLines; i++) {
    const t = i / hLines
    const y = vpY + Math.pow(t, 1.8) * (h - vpY)
    const alpha = (1 - t) * 0.12
    ctx.strokeStyle = `${color}${alphaHex(alpha)}`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Vertical lines converging to vanishing point
  const vLines = 30
  for (let i = 0; i <= vLines; i++) {
    const t = i / vLines
    const xTop = vpX + (t - 0.5) * w * 1.5
    const xBottom = vpX + (t - 0.5) * w * 1.5
    ctx.strokeStyle = `${color}10`
    ctx.beginPath()
    ctx.moveTo(xTop, vpY)
    ctx.lineTo(xBottom, h)
    ctx.stroke()
  }

  // Grid node glow
  const nodeSpacing = 60
  ctx.shadowBlur = 2
  ctx.shadowColor = accentColor
  for (let y = vpY + 40; y < h; y += nodeSpacing) {
    for (let x = 0; x < w; x += nodeSpacing) {
      const flicker = 0.5 + 0.5 * Math.sin(x * 0.3 + y * 0.3 + flowTime * 0.01)
      if (flicker > 0.7) {
        ctx.fillStyle = `${accentColor}${alphaHex(flicker * 0.3)}`
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.shadowBlur = 0

  // Falling characters
  ctx.font = '13px "Courier New", monospace'
  for (const p of particles) {
    // Head character (bright)
    ctx.shadowBlur = 3
    ctx.shadowColor = color
    ctx.fillStyle = `#ffffff${alphaHex(p.opacity)}`
    ctx.fillText(p.char!, p.columnX! - 6, p.y)

    // Trail characters (fading)
    ctx.shadowBlur = 1
    ctx.shadowColor = color
    const trail = p.trailChars!
    for (let t = 0; t < trail.length; t++) {
      const trailAlpha = p.opacity * (1 - (t + 1) / (trail.length + 1)) * 0.5
      const ty = p.y - (t + 1) * 16
      if (ty > 0) {
        ctx.fillStyle = `${color}${alphaHex(trailAlpha)}`
        ctx.fillText(trail[t], p.columnX! - 6, ty)
      }
    }
  }
  ctx.shadowBlur = 0

  // Scan line
  const scanGradient = ctx.createLinearGradient(0, scanLineY - 25, 0, scanLineY + 25)
  scanGradient.addColorStop(0, 'transparent')
  scanGradient.addColorStop(0.5, `${accentColor}12`)
  scanGradient.addColorStop(1, 'transparent')
  ctx.fillStyle = scanGradient
  ctx.fillRect(0, scanLineY - 25, w, 50)
}

// ====== Burst Particles (Click Effect) ======

function createBurst(x: number, y: number, color: string) {
  const count = 4 + Math.floor(Math.random() * 6)
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const speed = 2 + Math.random() * 4
    burstParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 25 + Math.floor(Math.random() * 20),
      radius: 1 + Math.random() * 2.5,
      color
    })
  }
}

function updateBursts() {
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    const bp = burstParticles[i]
    bp.x += bp.vx
    bp.y += bp.vy
    bp.vy += 0.03 // gravity
    bp.vx *= 0.98
    bp.vy *= 0.98
    bp.life++
    if (bp.life >= bp.maxLife) {
      burstParticles.splice(i, 1)
    }
  }
}

function drawBursts() {
  if (!ctx) return
  for (const bp of burstParticles) {
    const progress = bp.life / bp.maxLife
    const alpha = (1 - progress) * 0.8
    const alphaStr = Math.floor(alpha * 255).toString(16).padStart(2, '0')
    ctx.beginPath()
    ctx.arc(bp.x, bp.y, bp.radius * (1 - progress * 0.5), 0, Math.PI * 2)
    ctx.fillStyle = `${bp.color}${alphaStr}`
    ctx.fill()
  }
}

// ====== Mouse Trail Particles ======

function spawnTrailParticle(x: number, y: number) {
  const color = props.config.accentColor || props.config.color
  const angle = Math.random() * Math.PI * 2
  const speed = 0.3 + Math.random() * 1.2
  trailParticles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.3, // slight upward bias
    life: 0,
    maxLife: 30 + Math.floor(Math.random() * 35),
    radius: 1.2 + Math.random() * 2.0,
    color,
    opacity: 0.35 + Math.random() * 0.35
  })
  // Cap trail particles to prevent memory issues
  if (trailParticles.length > 120) {
    trailParticles.splice(0, trailParticles.length - 120)
  }
}

function updateTrailParticles() {
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const tp = trailParticles[i]
    tp.x += tp.vx
    tp.y += tp.vy
    tp.vy += 0.015 // very subtle gravity
    tp.vx *= 0.995
    tp.vy *= 0.995
    tp.life++
    if (tp.life >= tp.maxLife) {
      trailParticles.splice(i, 1)
    }
  }
}

function drawTrailParticles() {
  if (!ctx) return
  for (const tp of trailParticles) {
    const progress = tp.life / tp.maxLife
    // Ease-out fade: hold brightness then quickly fade at end
    const fadeAlpha = progress < 0.6
      ? 1
      : 1 - (progress - 0.6) / 0.4
    const alpha = tp.opacity * fadeAlpha
    const alphaStr = Math.floor(Math.min(1, alpha) * 255).toString(16).padStart(2, '0')

    ctx.beginPath()
    ctx.arc(tp.x, tp.y, tp.radius * (1 - progress * 0.6), 0, Math.PI * 2)
    ctx.fillStyle = `${tp.color}${alphaStr}`
    ctx.fill()
  }
}

// ====== Mouse Glow ======

function drawMouseGlow(color: string) {
  if (!ctx || mouseX < 0 || mouseY < 0) return
  const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120)
  gradient.addColorStop(0, `${color}03`)
  gradient.addColorStop(0.5, `${color}01`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(mouseX - 120, mouseY - 120, 240, 240)
}

// ====== Main Loop ======

function createParticles() {
  if (!props.config.enabled) return
  const count = props.config.maxParticles
  burstParticles = []
  stardustParticles = []
  sakuraPetals = []
  switch (props.config.type) {
    case 'constellation': createStardust(count); break
    case 'aurora': // migrated to sakura
    case 'sakura': createSakura(count); break
    case 'matrix': createMatrix(count); break
    case 'none': particles = []; break
  }
}

function animate(time: number) {
  if (!props.config.enabled || themeStore.reduceMotion) {
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    animFrameId = requestAnimationFrame(animate)
    return
  }

  flowTime = time
  hueOffset += 0.0005

  switch (props.config.type) {
    case 'constellation':
      buildFlowField()
      updateStardust()
      drawStardust(props.config.color)
      break
    case 'aurora': // migrated to sakura
    case 'sakura':
      updateSakura()
      drawSakuraPetals(props.config.accentColor || props.config.color)
      break
    case 'matrix':
      updateMatrix()
      drawMatrix(props.config.color, props.config.accentColor || props.config.color)
      break
  }

  // Common layers (all modes)
  if (props.config.mouseTrail) {
    updateTrailParticles()
    drawTrailParticles()
  }
  updateBursts()
  drawBursts()
  drawMouseGlow(props.config.color)

  animFrameId = requestAnimationFrame(animate)
}

// ====== Restart System (Key Fix for Switching) ======

function restartSystem() {
  // 1. Cancel current frame
  cancelAnimationFrame(animFrameId)
  // 2. Clear canvas fully
  if (ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  // 3. Reset all type-specific state
  scanLineY = 0
  flowTime = 0
  hueOffset = 0
  burstParticles = []
  trailParticles = []
  stardustParticles = []
  sakuraPetals = []
  flowField = []
  // 4. Rebuild particles
  createParticles()
  // 5. If disabled, stop here (don't start new loop)
  if (!props.config.enabled || themeStore.reduceMotion) return
  // 6. Start fresh loop
  animFrameId = requestAnimationFrame(animate)
}

// ====== Event Handlers ======

function onMouseMove(e: MouseEvent) {
  prevMouseX = mouseX
  prevMouseY = mouseY
  mouseX = e.clientX
  mouseY = e.clientY

  // Spawn trail particles along mouse path
  if (props.config.mouseTrail && props.config.enabled && !themeStore.reduceMotion) {
    if (prevMouseX > 0) {
      const dx = mouseX - prevMouseX
      const dy = mouseY - prevMouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 4) {
        const spawns = Math.min(Math.floor(dist / 8), 8)
        for (let i = 1; i <= spawns; i++) {
          const t = i / spawns
          spawnTrailParticle(
            prevMouseX + dx * t + (Math.random() - 0.5) * 6,
            prevMouseY + dy * t + (Math.random() - 0.5) * 6
          )
        }
      }
    }
  }
}

function onClick(e: MouseEvent) {
  if (!props.config.enabled || themeStore.reduceMotion) return
  createBurst(e.clientX, e.clientY, props.config.accentColor || props.config.color)
}

// ====== Lifecycle ======

onMounted(() => {
  resizeCanvas()
  initCanvas()
  buildFlowField()
  createParticles()
  animFrameId = requestAnimationFrame(animate)

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('click', onClick)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

function onVisibilityChange() {
  if (document.hidden) {
    cancelAnimationFrame(animFrameId)
  } else {
    animFrameId = requestAnimationFrame(animate)
  }
}

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('click', onClick)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// Watch entire config for any change → full restart
watch(() => ({ ...props.config }), () => restartSystem())
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
