import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateFavicons() {
  const svgPath = join(__dirname, '../public/favicon.svg');
  const svgBuffer = readFileSync(svgPath);
  const svgString = svgBuffer.toString();

  console.log('Generating favicons from SVG...');

  // 1. Standard variant (for browser tabs: favicon.ico, favicon-32.png)
  // Already has 0.8 scale and transparent bg from source.
  const standardPng = async (size) => await sharp(svgBuffer).resize(size, size).png().toBuffer();

  const gradientDef = `
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style="stop-color:#444444" />
        <stop offset="100%" style="stop-color:#262626" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#bg-grad)"/>`;

  // 2. PWA/Chrome variant (gradient background, 0.69 scale)
  const pwaSvgString = svgString
    .replace('<g transform=', gradientDef + '<g transform=')
    .replace('scale(0.9)', 'scale(0.69)');
  const pwaPng = async (size) => await sharp(Buffer.from(pwaSvgString)).resize(size, size).png().toBuffer();

  // 3. Safari/iOS variant (gradient background, 0.85 scale)
  const safariSvgString = svgString
    .replace('<g transform=', gradientDef + '<g transform=')
    .replace('scale(0.9)', 'scale(0.85)');
  const safariPng = async (size) => await sharp(Buffer.from(safariSvgString)).resize(size, size).png().toBuffer();

  // Generate Standard Sizes
  const png16 = await standardPng(16);
  const png32 = await standardPng(32);
  const png48 = await standardPng(48);

  // Save favicon-32.png (Standard)
  writeFileSync(join(__dirname, '../public/favicon-32.png'), png32);
  console.log('  ✓ Saved favicon-32.png (Standard)');

  // Save apple-touch-icon (180x180) - Dark variant, 0.85 scale
  writeFileSync(join(__dirname, '../public/apple-touch-icon.png'), await safariPng(180));
  console.log('  ✓ Saved apple-touch-icon.png (Dark Theme, 0.85 scale for Safari)');

  // Save icon-192 for PWA - Dark variant, 0.69 scale
  writeFileSync(join(__dirname, '../public/icon-192.png'), await pwaPng(192));
  console.log('  ✓ Saved icon-192.png (Dark Theme, 0.69 scale for Chrome)');

  // Save icon-512 for PWA - Dark variant, 0.69 scale
  writeFileSync(join(__dirname, '../public/icon-512.png'), await pwaPng(512));
  console.log('  ✓ Saved icon-512.png (Dark Theme, 0.69 scale for Chrome)');

  // Generate ICO file (contains 16, 32, 48 - standard transparent)
  const icoBuffer = await pngToIco([png16, png32, png48]);
  writeFileSync(join(__dirname, '../public/favicon.ico'), icoBuffer);
  console.log('  ✓ Saved favicon.ico (Standard)');

  console.log('\n✅ All favicons generated successfully!');
}

generateFavicons().catch(console.error);
