import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const imagesDir = path.join(publicDir, 'images');
const appDir = path.join(root, 'src', 'app');

const fullLogoSrc = path.join(imagesDir, 'rentalpilot-logo.png');
const iconSrc = path.join(publicDir, 'rentalpilot-icon-src.png');

const MASKABLE_BG = { r: 255, g: 255, b: 255, alpha: 1 }; // white bg so the dark pin stays visible

async function cleanAndCrop(srcPath, { whiteCutoff = 232, marginPct = 0.08 } = {}) {
  // The generated art has a WHITE background (not transparent). Flood-fill from
  // the borders to turn only background-connected white into transparency,
  // preserving enclosed white areas (e.g. the pin's inner circle). Then crop
  // tightly to the remaining opaque content.
  const img = sharp(srcPath).ensureAlpha();
  const { width, height } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });

  const isWhite = (i) =>
    data[i] >= whiteCutoff && data[i + 1] >= whiteCutoff && data[i + 2] >= whiteCutoff;

  const visited = new Uint8Array(width * height);
  const stack = [];
  const pushIfWhite = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (visited[p]) return;
    if (isWhite(p * 4)) {
      visited[p] = 1;
      stack.push(p);
    }
  };

  for (let x = 0; x < width; x++) {
    pushIfWhite(x, 0);
    pushIfWhite(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfWhite(0, y);
    pushIfWhite(width - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    data[p * 4 + 3] = 0; // make background transparent
    const x = p % width;
    const y = (p - x) / width;
    pushIfWhite(x + 1, y);
    pushIfWhite(x - 1, y);
    pushIfWhite(x, y + 1);
    pushIfWhite(x, y - 1);
  }

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    return sharp(srcPath).png().toBuffer();
  }

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const margin = Math.round(boxH * marginPct);
  console.log(`  [debug] src=${width}x${height} bbox=(${minX},${minY})-(${maxX},${maxY}) => ${boxW}x${boxH}`);

  const cleaned = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  return sharp(cleaned)
    .extract({ left: minX, top: minY, width: boxW, height: boxH })
    .extend({
      top: margin,
      bottom: margin,
      left: margin,
      right: margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function makeFullLogo() {
  const out = path.join(imagesDir, 'rentalpilot-logo.png');
  const buf = await cleanAndCrop(fullLogoSrc, { whiteCutoff: 232, marginPct: 0.06 });
  await fs.promises.writeFile(out, buf);
  const meta = await sharp(buf).metadata();
  console.log(`full logo: ${out} (${meta.width}x${meta.height})`);
}

async function trimmedSquareMark() {
  // Clean ghosting + crop tightly, then place on a square transparent canvas
  // with a little breathing room so it is centered.
  const trimmed = await cleanAndCrop(iconSrc, { whiteCutoff: 232, marginPct: 0 });
  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width, meta.height);
  const canvas = Math.round(side * 1.14); // ~7% padding on each side
  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function makeTransparentIcon(base, size, outPath) {
  const buf = await sharp(base)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await fs.promises.writeFile(outPath, buf);
  console.log(`icon: ${outPath} (${size}x${size})`);
}

async function makeMaskableIcon(base, size, outPath) {
  // Maskable icons need the mark inside a ~80% safe zone on a filled bg.
  const inner = Math.round(size * 0.72);
  const mark = await sharp(base)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: MASKABLE_BG },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
  await fs.promises.writeFile(outPath, buf);
  console.log(`maskable: ${outPath} (${size}x${size})`);
}

function encodeIco(pngBuffers) {
  // Build a Vista+ ICO that embeds PNG payloads directly.
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = 6 + count * 16;
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // size of data
    entry.writeUInt32LE(offset, 12); // offset
    offset += data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.data)]);
}

async function makeFavicon(base) {
  const sizes = [16, 32, 48, 256];
  const pngBuffers = [];
  for (const size of sizes) {
    const data = await sharp(base)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, data });
  }
  const ico = encodeIco(pngBuffers);
  const out = path.join(appDir, 'favicon.ico');
  await fs.promises.writeFile(out, ico);
  console.log(`favicon: ${out} (${sizes.join(',')})`);
}

async function main() {
  await makeFullLogo();
  const base = await trimmedSquareMark();

  await makeTransparentIcon(base, 512, path.join(publicDir, 'icon.png'));
  await makeTransparentIcon(base, 192, path.join(publicDir, 'icon-192.png'));
  await makeTransparentIcon(base, 512, path.join(publicDir, 'icon-512.png'));
  await makeMaskableIcon(base, 192, path.join(publicDir, 'icon-192-maskable.png'));
  await makeMaskableIcon(base, 512, path.join(publicDir, 'icon-512-maskable.png'));
  await makeTransparentIcon(base, 180, path.join(publicDir, 'apple-touch-icon.png'));
  await makeFavicon(base);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
