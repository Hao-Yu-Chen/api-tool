// scripts/generate-icons.mjs
// Converts build/icon.png (or build/icon.svg) to multi-size PNGs and ICO for Windows
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const buildDir = join(__dirname, '..', 'build')
const releaseDir = join(__dirname, '..', 'release', '.icon-ico')

// Prefer user-provided PNG, fall back to SVG
const pngPath = join(buildDir, 'icon.png')
const svgPath = join(buildDir, 'icon.svg')

let sourceBuffer
let sourceType

if (existsSync(pngPath)) {
  const buf = readFileSync(pngPath)
  // Check PNG magic bytes: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    sourceBuffer = buf
    sourceType = 'png'
    console.log(`Using build/icon.png as source (${buf.length} bytes)`)
  } else {
    console.log('build/icon.png is not a valid PNG, trying SVG...')
  }
}

if (!sourceBuffer && existsSync(svgPath)) {
  sourceBuffer = readFileSync(svgPath)
  sourceType = 'svg'
  console.log(`Using build/icon.svg as source (${sourceBuffer.length} bytes)`)
}

if (!sourceBuffer) {
  console.error('ERROR: No icon source found! Place icon.png or icon.svg in the build/ directory.')
  process.exit(1)
}

// Get source dimensions
const metadata = await sharp(sourceBuffer).metadata()
console.log(`Source dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format || sourceType}`)

// Generate PNGs at multiple sizes
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]

for (const size of sizes) {
  const resized = await sharp(sourceBuffer).resize(size, size).png().toBuffer()
  const outPath = join(buildDir, `icon-${size}.png`)
  writeFileSync(outPath, resized)
  console.log(`✓ icon-${size}.png (${resized.length} bytes)`)
}

// Main icon.png — keep the user's original if it was a PNG, otherwise generate 1024
if (sourceType === 'svg') {
  const mainPng = await sharp(sourceBuffer).resize(1024, 1024).png().toBuffer()
  writeFileSync(pngPath, mainPng)
  console.log(`✓ icon.png → generated from SVG (${mainPng.length} bytes)`)
} else {
  // Resize user's PNG to 1024 if it isn't already
  if (metadata.width !== 1024 || metadata.height !== 1024) {
    const mainPng = await sharp(sourceBuffer).resize(1024, 1024).png().toBuffer()
    writeFileSync(pngPath, mainPng)
    console.log(`✓ icon.png → resized to 1024x1024 (${mainPng.length} bytes)`)
  } else {
    console.log(`✓ icon.png → kept original (already 1024x1024)`)
  }
}

// Create ICO for Windows (contains 16, 32, 48, 256)
const icoSizes = [16, 32, 48, 256]
const icoBuffers = await Promise.all(
  icoSizes.map(size => sharp(sourceBuffer).resize(size, size).png().toBuffer())
)

// Build ICO file
const ICO_HEADER_SIZE = 6
const ICO_DIR_ENTRY_SIZE = 16
const numIcons = icoSizes.length
const dataOffset = ICO_HEADER_SIZE + ICO_DIR_ENTRY_SIZE * numIcons

const header = Buffer.alloc(ICO_HEADER_SIZE)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(numIcons, 4)

let entries = Buffer.alloc(ICO_DIR_ENTRY_SIZE * numIcons)
let imageData = Buffer.alloc(0)
let currentOffset = dataOffset

for (let i = 0; i < numIcons; i++) {
  const size = icoSizes[i]
  const pngData = icoBuffers[i]
  const entryOffset = i * ICO_DIR_ENTRY_SIZE

  entries.writeUInt8(size === 256 ? 0 : size, entryOffset)
  entries.writeUInt8(size === 256 ? 0 : size, entryOffset + 1)
  entries.writeUInt8(0, entryOffset + 2)
  entries.writeUInt8(0, entryOffset + 3)
  entries.writeUInt16LE(1, entryOffset + 4)
  entries.writeUInt16LE(32, entryOffset + 6)
  entries.writeUInt32LE(pngData.length, entryOffset + 8)
  entries.writeUInt32LE(currentOffset, entryOffset + 12)

  imageData = Buffer.concat([imageData, pngData])
  currentOffset += pngData.length
}

const icoBuffer = Buffer.concat([header, entries, imageData])
mkdirSync(releaseDir, { recursive: true })
writeFileSync(join(releaseDir, 'icon.ico'), icoBuffer)
console.log(`✓ release/.icon-ico/icon.ico (${icoBuffer.length} bytes, ${numIcons} sizes)`)

// Also copy 256px as favicon source for PWA
const faviconPath = join(__dirname, '..', 'public', 'favicon.ico')
writeFileSync(faviconPath, icoBuffer)
console.log(`✓ public/favicon.ico (for browser tab)`)

console.log('\nDone! All icon formats generated.')
