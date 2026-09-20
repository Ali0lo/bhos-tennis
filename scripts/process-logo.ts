import sharp from 'sharp';
import fs from 'fs';

async function makeTransparent() {
  const inputPath = 'public/images/bhos-logo.png';
  const outputPath = 'public/images/bhos-logo-transparent.png';

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const buffer = Buffer.from(data);

  // Any pixel where R > 235 and G > 235 and B > 235 becomes transparent
  for (let i = 0; i < buffer.length; i += channels) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];

    if (r > 235 && g > 235 && b > 235) {
      buffer[i + 3] = 0; // Transparent
    } else {
      // For dark mode legibility: if the dark blue text/outline is very dark, keep it crisp or adjust
      // Smooth edges slightly if close to white
      if (r > 210 && g > 210 && b > 210) {
        const avg = (r + g + b) / 3;
        buffer[i + 3] = Math.round(255 * (1 - (avg - 210) / 25));
      }
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels },
  })
    .png()
    .toFile(outputPath);

  console.log('Successfully created transparent BHOS logo at', outputPath);

  // Also create a crest-only version optimized for floating navbar
  // Crop the crest (top middle part of image)
  const crestCrop = await sharp(outputPath)
    .extract({
      left: Math.round(width * 0.35),
      top: Math.round(height * 0.08),
      width: Math.round(width * 0.3),
      height: Math.round(height * 0.52),
    })
    .trim()
    .toFile('public/images/bhos-crest.png');

  console.log('Successfully created crest icon at public/images/bhos-crest.png');
}

makeTransparent().catch(console.error);

