const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// High quality bicubic or bilinear image resizer
function resizeImage(src, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const xRatio = src.width / targetW;
  const yRatio = src.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(src.width - 1, Math.floor(x * xRatio));
      const srcY = Math.min(src.height - 1, Math.floor(y * yRatio));
      const dstIdx = (y * targetW + x) * 4;
      const srcIdx = (srcY * src.width + srcX) * 4;

      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  return dst;
}

// Bilinear interpolation resizer for smooth downscaling
function resizeBilinear(src, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const xRatio = (src.width - 1) / Math.max(1, targetW - 1);
  const yRatio = (src.height - 1) / Math.max(1, targetH - 1);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const gx = x * xRatio;
      const gy = y * yRatio;
      const gxi = Math.floor(gx);
      const gyi = Math.floor(gy);
      const fx = gx - gxi;
      const fy = gy - gyi;

      const p00 = (gyi * src.width + gxi) * 4;
      const p10 = (gyi * src.width + Math.min(gxi + 1, src.width - 1)) * 4;
      const p01 = (Math.min(gyi + 1, src.height - 1) * src.width + gxi) * 4;
      const p11 = (Math.min(gyi + 1, src.height - 1) * src.width + Math.min(gxi + 1, src.width - 1)) * 4;

      const dstIdx = (y * targetW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = src.data[p00 + c] * (1 - fx) + src.data[p10 + c] * fx;
        const bot = src.data[p01 + c] * (1 - fx) + src.data[p11 + c] * fx;
        dst.data[dstIdx + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return dst;
}

async function run() {
  const brainDir = 'C:/Users/earlg/.gemini/antigravity-ide/brain/9d834631-402a-46a1-8932-b4aa2ced8082';
  const assetsDir = path.resolve(__dirname, '../assets');

  const fullIconBuf = fs.readFileSync(path.join(brainDir, 'oliver_icon_1024.png'));
  const fullIcon = PNG.sync.read(fullIconBuf);

  const transparentBuf = fs.readFileSync(path.join(brainDir, 'scratch/test_foreground.png'));
  const transparentSrc = PNG.sync.read(transparentBuf);

  console.log('1. Writing assets/icon.png (1024x1024)...');
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), fullIconBuf);

  console.log('2. Writing assets/splash-icon.png (1024x1024)...');
  fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), fullIconBuf);

  console.log('3. Writing assets/favicon.png (48x48)...');
  const favicon = resizeBilinear(fullIcon, 48, 48);
  fs.writeFileSync(path.join(assetsDir, 'favicon.png'), PNG.sync.write(favicon));

  console.log('4. Creating assets/android-icon-background.png (1024x1024)...');
  // Create gradient from top #58B8FA (88, 184, 250) to bottom #96E6FD (150, 230, 253)
  const bgPng = new PNG({ width: 1024, height: 1024 });
  for (let y = 0; y < 1024; y++) {
    const t = y / 1023;
    const r = Math.round(88 * (1 - t) + 150 * t);
    const g = Math.round(184 * (1 - t) + 230 * t);
    const b = Math.round(250 * (1 - t) + 253 * t);
    for (let x = 0; x < 1024; x++) {
      const idx = (y * 1024 + x) * 4;
      bgPng.data[idx] = r;
      bgPng.data[idx + 1] = g;
      bgPng.data[idx + 2] = b;
      bgPng.data[idx + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(assetsDir, 'android-icon-background.png'), PNG.sync.write(bgPng));

  console.log('5. Creating assets/android-icon-foreground.png (1024x1024) scaled to safe area...');
  // Scale transparent character to fit in safe circle (680px diameter, safe zone)
  const fgScale = 0.74; // fits 704x773 -> ~520x572, safely within 680px circle
  const targetCharW = Math.round(transparentSrc.width * fgScale);
  const targetCharH = Math.round(transparentSrc.height * fgScale);
  const scaledChar = resizeBilinear(transparentSrc, targetCharW, targetCharH);

  const fgPng = new PNG({ width: 1024, height: 1024 });
  const startX = Math.round((1024 - targetCharW) / 2);
  const startY = Math.round((1024 - targetCharH) / 2);

  for (let y = 0; y < targetCharH; y++) {
    for (let x = 0; x < targetCharW; x++) {
      const sIdx = (y * targetCharW + x) * 4;
      const dX = startX + x;
      const dY = startY + y;
      if (dX >= 0 && dX < 1024 && dY >= 0 && dY < 1024) {
        const dIdx = (dY * 1024 + dX) * 4;
        fgPng.data[dIdx] = scaledChar.data[sIdx];
        fgPng.data[dIdx + 1] = scaledChar.data[sIdx + 1];
        fgPng.data[dIdx + 2] = scaledChar.data[sIdx + 2];
        fgPng.data[dIdx + 3] = scaledChar.data[sIdx + 3];
      }
    }
  }
  fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), PNG.sync.write(fgPng));

  console.log('6. Creating assets/android-icon-monochrome.png (1024x1024)...');
  const monoPng = new PNG({ width: 1024, height: 1024 });
  for (let i = 0; i < 1024 * 1024 * 4; i += 4) {
    const alpha = fgPng.data[i + 3];
    if (alpha > 20) {
      monoPng.data[i] = 255;
      monoPng.data[i + 1] = 255;
      monoPng.data[i + 2] = 255;
      monoPng.data[i + 3] = alpha;
    }
  }
  fs.writeFileSync(path.join(assetsDir, 'android-icon-monochrome.png'), PNG.sync.write(monoPng));

  console.log('All asset icons created successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
