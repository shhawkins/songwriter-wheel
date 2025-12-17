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

    for (const size of sizes) {
        const pngBuffer = await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toBuffer();
        pngBuffers[size] = pngBuffer;
        console.log(`  ✓ Generated ${size}x${size} PNG`);
    }

    // Save apple-touch-icon (180x180)
    writeFileSync(join(__dirname, '../public/apple-touch-icon.png'), pngBuffers[180]);
    console.log('  ✓ Saved apple-touch-icon.png');

    // Save icon-192 for PWA
    writeFileSync(join(__dirname, '../public/icon-192.png'), pngBuffers[192]);
    console.log('  ✓ Saved icon-192.png');

    // Save icon-512 for PWA
    writeFileSync(join(__dirname, '../public/icon-512.png'), pngBuffers[512]);
    console.log('  ✓ Saved icon-512.png');

    // Generate ICO file (contains 16, 32, 48)
    const icoBuffer = await pngToIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]]);
    writeFileSync(join(__dirname, '../public/favicon.ico'), icoBuffer);
    console.log('  ✓ Saved favicon.ico');

    console.log('\n✅ All favicons generated successfully!');
}

generateFavicons().catch(console.error);
