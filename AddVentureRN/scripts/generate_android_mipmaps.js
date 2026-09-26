const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

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

function applyCircleMask(src) {
  const dst = new PNG({ width: src.width, height: src.height });
  const cx = src.width / 2;
  const cy = src.height / 2;
  const r = src.width / 2;

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const idx = (y * src.width + x) * 4;
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

      let maskAlpha = 1;
      if (dist > r + 0.5) {
        maskAlpha = 0;
      } else if (dist > r - 0.5) {
        maskAlpha = (r + 0.5 - dist);
      }

      dst.data[idx] = src.data[idx];
      dst.data[idx + 1] = src.data[idx + 1];
      dst.data[idx + 2] = src.data[idx + 2];
      dst.data[idx + 3] = Math.round(src.data[idx + 3] * maskAlpha);
    }
  }
  return dst;
}

async function run() {
  const assetsDir = path.resolve(__dirname, '../assets');
  const resDir = path.resolve(__dirname, '../android/app/src/main/res');

  const iconSrc = PNG.sync.read(fs.readFileSync(path.join(assetsDir, 'icon.png')));
  const bgSrc = PNG.sync.read(fs.readFileSync(path.join(assetsDir, 'android-icon-background.png')));
  const fgSrc = PNG.sync.read(fs.readFileSync(path.join(assetsDir, 'android-icon-foreground.png')));
  const monoSrc = PNG.sync.read(fs.readFileSync(path.join(assetsDir, 'android-icon-monochrome.png')));

  const densities = [
    { folder: 'mipmap-mdpi', iconSize: 48, adaptiveSize: 108 },
    { folder: 'mipmap-hdpi', iconSize: 72, adaptiveSize: 162 },
    { folder: 'mipmap-xhdpi', iconSize: 96, adaptiveSize: 216 },
    { folder: 'mipmap-xxhdpi', iconSize: 144, adaptiveSize: 324 },
    { folder: 'mipmap-xxxhdpi', iconSize: 192, adaptiveSize: 432 },
  ];

  for (const { folder, iconSize, adaptiveSize } of densities) {
    const targetFolder = path.join(resDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    console.log(`Processing ${folder} (icon: ${iconSize}x${iconSize}, adaptive: ${adaptiveSize}x${adaptiveSize})...`);

    // 1. ic_launcher.png
    const launcher = resizeBilinear(iconSrc, iconSize, iconSize);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher.png'), PNG.sync.write(launcher));

    // 2. ic_launcher_round.png
    const launcherRound = applyCircleMask(launcher);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_round.png'), PNG.sync.write(launcherRound));

    // 3. ic_launcher_background.png
    const background = resizeBilinear(bgSrc, adaptiveSize, adaptiveSize);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_background.png'), PNG.sync.write(background));

    // 4. ic_launcher_foreground.png
    const foreground = resizeBilinear(fgSrc, adaptiveSize, adaptiveSize);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_foreground.png'), PNG.sync.write(foreground));

    // 5. ic_launcher_monochrome.png
    const monochrome = resizeBilinear(monoSrc, adaptiveSize, adaptiveSize);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_monochrome.png'), PNG.sync.write(monochrome));

    // Remove old .webp files to prevent resource collisions
    const webpFiles = [
      'ic_launcher.webp',
      'ic_launcher_round.webp',
      'ic_launcher_background.webp',
      'ic_launcher_foreground.webp',
      'ic_launcher_monochrome.webp',
    ];
    for (const wf of webpFiles) {
      const p = path.join(targetFolder, wf);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  }

  console.log('All Android mipmap icons generated and updated successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
