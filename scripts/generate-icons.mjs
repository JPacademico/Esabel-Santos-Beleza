/**
 * Rasterizes branding/logo.jpg into every icon the browser tab and the PWA
 * need. Run with: npm run icons
 *
 * The source is a wide (538×303) wordmark on a near-black background, so every
 * target is produced by padding it onto a square canvas filled with that same
 * sampled background color — the letterboxing is seamless rather than a
 * visible bar.
 *
 * Maskable icons get extra padding so Android's circular/squircle crop
 * doesn't clip the text: the safe zone is a centered circle of radius 40% of
 * the icon size, and the logo's own 1.78:1 aspect ratio already bakes in some
 * vertical letterboxing once it's fit into a square, so 17% padding is the
 * smallest value that keeps every corner of the wordmark's bounding box
 * inside that circle (derived from the source's actual aspect ratio, with a
 * small safety margin).
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../branding/logo.jpg");
const iconsDir = resolve(here, "../public/icons");

// Sampled from the source's corners — used verbatim (not pure #000) so the
// generated padding is indistinguishable from the logo's own background.
const BG = { r: 3, g: 3, b: 5 };
const BG_HEX = "#030305";

const SQUARE_TARGETS = [
  { file: "icon-192.png", size: 192, padding: 0.06 },
  { file: "icon-512.png", size: 512, padding: 0.06 },
  { file: "icon-512-maskable.png", size: 512, padding: 0.17 },
  { file: "apple-touch-icon-180.png", size: 180, padding: 0.06 },
];

// Small browser-tab favicons: the full wordmark reads as a smudge below
// ~48px, so these get a tighter crop with less padding to keep the text as
// large as legibility allows at that size.
const FAVICON_TARGETS = [
  { file: "favicon-32.png", size: 32, padding: 0.02 },
  { file: "favicon-16.png", size: 16, padding: 0.02 },
];

await mkdir(iconsDir, { recursive: true });

async function squareFrom(size, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);

  const resized = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: resized, top: offset, left: offset }])
    .png({ compressionLevel: 9 });
}

for (const { file, size, padding } of [...SQUARE_TARGETS, ...FAVICON_TARGETS]) {
  const out = await squareFrom(size, padding);
  await out.toFile(resolve(iconsDir, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log(`\nIcons generated in public/icons/ — background ${BG_HEX}.`);
