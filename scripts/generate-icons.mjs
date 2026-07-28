/**
 * Generates every icon the browser tab and the PWA need from branding/logo.jpg.
 * Run with: npm run icons
 *
 * Two different crops, because one image can't serve both jobs:
 *
 *  - APP ICONS (192/512/maskable/apple-touch) use the full wordmark, cropped
 *    to its actual ink. The raw JPEG has ~35% empty width and ~50% empty
 *    height around the artwork, so fitting the whole frame rendered the logo
 *    at only ~26% of the icon's height — the "distant, hard to see" look.
 *    Cropping to CONTENT first makes it fill ~90% of the width instead.
 *
 *  - FAVICONS (16/32/48) use only the bold hair-lock curve. The script
 *    wordmark is unreadable below ~48px; a single high-contrast shape still
 *    reads at 16px. Slightly brightened, since thin gold on near-black loses
 *    too much mass once it's a couple of pixels wide.
 *
 * Both crops were measured from the source, not guessed: content bounds came
 * from a per-row/column ink-density scan, and the favicon crop was chosen by
 * rendering candidates at true 16/32px and comparing.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../branding/logo.jpg");
const iconsDir = resolve(here, "../public/icons");

// Sampled from the source — used verbatim (not pure #000) so generated
// padding is indistinguishable from the logo's own background.
const BG = { r: 3, g: 3, b: 5 };

/** Ink bounds of the full wordmark within the 538×303 source. */
const CONTENT = { left: 92, top: 70, width: 354, height: 160 };
const CONTENT_ASPECT = CONTENT.width / CONTENT.height; // ≈ 2.21

/** The bold lock/curve at the left of the mark — the only element that
 *  survives being 16 pixels wide. */
const MARK = { left: 92, top: 88, width: 44, height: 112 };
const MARK_BOOST = { brightness: 1.5, saturation: 1.15 };

/**
 * Android's maskable safe zone is a centred circle of radius 40% of the icon.
 * For a centred box of aspect r, the corners sit at (W/2)·√(1+1/r²) from the
 * centre, so W ≤ 0.8·size / √(1+1/r²). With r ≈ 2.21 that's W ≤ 0.729·size,
 * i.e. ~13.6% padding per side. Rounded up to 14% for margin.
 */
const MASKABLE_PADDING = 0.14;

const APP_ICONS = [
  { file: "icon-192.png", size: 192, padding: 0.05 },
  { file: "icon-512.png", size: 512, padding: 0.05 },
  { file: "icon-512-maskable.png", size: 512, padding: MASKABLE_PADDING },
  { file: "apple-touch-icon-180.png", size: 180, padding: 0.05 },
];

const FAVICONS = [
  { file: "favicon-48.png", size: 48 },
  { file: "favicon-32.png", size: 32 },
  { file: "favicon-16.png", size: 16 },
];

await mkdir(iconsDir, { recursive: true });

/** Places a pre-cropped region centred on a square canvas of the brand black. */
async function onSquare(pipeline, size, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await pipeline
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  const offset = Math.round((size - inner) / 2);

  return sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: resized, top: offset, left: offset }])
    .png({ compressionLevel: 9 });
}

for (const { file, size, padding } of APP_ICONS) {
  const out = await onSquare(sharp(source).extract(CONTENT), size, padding);
  await out.toFile(resolve(iconsDir, file));
  const inkHeight = Math.round(size * (1 - padding * 2) / CONTENT_ASPECT);
  console.log(`✓ ${file.padEnd(26)} ${size}×${size}  (wordmark ≈ ${inkHeight}px tall)`);
}

for (const { file, size } of FAVICONS) {
  const out = await onSquare(
    sharp(source).extract(MARK).modulate(MARK_BOOST),
    size,
    0.06,
  );
  await out.toFile(resolve(iconsDir, file));
  console.log(`✓ ${file.padEnd(26)} ${size}×${size}  (lock mark)`);
}

console.log("\nIcons written to public/icons/");
