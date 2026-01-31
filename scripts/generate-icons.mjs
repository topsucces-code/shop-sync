import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true })
}

// Icon sizes for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Read the SVG file
const svgBuffer = readFileSync(join(iconsDir, 'icon.svg'))

async function generateIcons() {
  console.log('Generating PWA icons...')

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`)

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)

    console.log(`✓ Generated icon-${size}x${size}.png`)
  }

  // Generate shortcut icons
  const scanSvg = readFileSync(join(iconsDir, 'scan-icon.svg'))
  await sharp(scanSvg)
    .resize(192, 192)
    .png()
    .toFile(join(iconsDir, 'scan-icon.png'))
  console.log('✓ Generated scan-icon.png')

  const ordersSvg = readFileSync(join(iconsDir, 'orders-icon.svg'))
  await sharp(ordersSvg)
    .resize(192, 192)
    .png()
    .toFile(join(iconsDir, 'orders-icon.png'))
  console.log('✓ Generated orders-icon.png')

  console.log('\nAll icons generated successfully!')
}

generateIcons().catch(console.error)
