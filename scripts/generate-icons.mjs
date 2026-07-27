/**
 * Rasterizes public/icons/favicon.svg into the PNG sizes the PWA manifest and
 * iOS need. Run with: npm run icons
 *
 * Maskable icons get extra padding so Android's circular/squircle masks don't
 * clip the scissors (safe zone = inner 80%).
 */
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, "../public/icons");
const source = resolve(iconsDir, "favicon.svg");

const TARGETS = [
  { file: "icon-192.png", size: 192, padding: 0 },
  { file: "icon-512.png", size: 512, padding: 0 },
  { file: "icon-512-maskable.png", size: 512, padding: 0.1 },
  { file: "apple-touch-icon-180.png", size: 180, padding: 0, background: "#b76e79" },
];

const svg = await readFile(source);
await mkdir(iconsDir, { recursive: true });

for (const { file, size, padding, background } of TARGETS) {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);

  const rendered = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const canvas = background
    ? sharp({
        create: { width: size, height: size, channels: 4, background },
      })
    : sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: padding > 0 ? "#b76e79" : { r: 0, g: 0, b: 0, alpha: 0 },
        },
      });

  await canvas
    .composite([{ input: rendered, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(iconsDir, file));

  console.log(`✓ ${file} (${size}×${size})`);
}

console.log("\nIcons generated in public/icons/");
