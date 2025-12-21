import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateFavicons() {
    const svgPath = join(__dirname, '../public/favicon.svg');
    const svgBuffer = readFileSync(svgPath);

    console.log('Generating favicons from SVG...');

    // Generate different sizes
    const sizes = [16, 32, 48, 180, 192, 512];
    const pngBuffers = {};

    // Standard scale is 0.8 (from favicon.svg)
    // For app icons (iOS/PWA), we want it slightly smaller (0.72)
    // 0.72 is about 10% smaller than the original 0.8, providing safe padding for iOS.
    const smallSvgString = svgBuffer.toString().replace('scale(0.8)', 'scale(0.72)');
    const smallSvgBuffer = Buffer.from(smallSvgString);

    for (const size of sizes) {
        // Use standard buffer for browser icons (16, 32, 48)
        // Use small buffer for app icons (180, 192, 512)
        const activeBuffer = size > 48 ? smallSvgBuffer : svgBuffer;

        const pngBuffer = await sharp(activeBuffer)
            .resize(size, size)
            .png()
            .toBuffer();
        pngBuffers[size] = pngBuffer;
        console.log(`  ✓ Generated ${size}x${size} PNG (${size > 48 ? 'scaled down' : 'standard size'})`);
    }

    // Save favicon-32.png
    writeFileSync(join(__dirname, '../public/favicon-32.png'), pngBuffers[32]);
    console.log('  ✓ Saved favicon-32.png');

    // Save apple-touch-icon (180x180) - uses scaled down version
    writeFileSync(join(__dirname, '../public/apple-touch-icon.png'), pngBuffers[180]);
    console.log('  ✓ Saved apple-touch-icon.png (smaller for iOS)');

    // Save icon-192 for PWA - uses scaled down version
    writeFileSync(join(__dirname, '../public/icon-192.png'), pngBuffers[192]);
    console.log('  ✓ Saved icon-192.png (smaller for PWA)');

    // Save icon-512 for PWA - uses scaled down version
    writeFileSync(join(__dirname, '../public/icon-512.png'), pngBuffers[512]);
    console.log('  ✓ Saved icon-512.png (smaller for PWA)');

    // Generate ICO file (contains 16, 32, 48 - standard size)
    const icoBuffer = await pngToIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]]);
    writeFileSync(join(__dirname, '../public/favicon.ico'), icoBuffer);
    console.log('  ✓ Saved favicon.ico (standard size)');

    console.log('\n✅ All favicons generated successfully!');
}

generateFavicons().catch(console.error);
