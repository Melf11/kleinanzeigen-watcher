// Generates simple solid-brand PWA icons (no external deps) using a hand-rolled
// PNG encoder. Draws a teal background with a lighter rounded square accent.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
}

function makePng(size, bg, fg) {
  const [br, bgc, bb] = hex(bg)
  const [fr, fgc, fb] = hex(fg)
  const inset = Math.round(size * 0.26)
  const radius = Math.round(size * 0.12)

  const raw = Buffer.alloc(size * (size * 4 + 1))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      // rounded square accent in the centre
      const inX = x >= inset && x < size - inset
      const inY = y >= inset && y < size - inset
      let accent = inX && inY
      if (accent) {
        // round the corners of the accent square
        const lx = x - inset
        const ly = y - inset
        const w = size - 2 * inset
        const cornerX = Math.min(lx, w - 1 - lx)
        const cornerY = Math.min(ly, w - 1 - ly)
        if (cornerX < radius && cornerY < radius) {
          const dx = radius - cornerX
          const dy = radius - cornerY
          if (dx * dx + dy * dy > radius * radius) accent = false
        }
      }
      raw[p++] = accent ? fr : br
      raw[p++] = accent ? fgc : bgc
      raw[p++] = accent ? fb : bb
      raw[p++] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = '#0f766e'
const FG = '#5eead4'

writeFileSync(join(outDir, 'icon-192.png'), makePng(192, BG, FG))
writeFileSync(join(outDir, 'icon-512.png'), makePng(512, BG, FG))
writeFileSync(join(outDir, 'icon-512-maskable.png'), makePng(512, BG, FG))
console.log('Icons written to', outDir)
