/**
 * Downloads the shipped photography from Unsplash and regenerates the credits.
 *
 *   node scripts/fetch-photos.mjs            # only slots with no committed file
 *   node scripts/fetch-photos.mjs --force    # re-download everything
 *
 * ⚠️ NOT part of the build. It talks to the network, and a build that can be
 * broken by someone else's CDN is a build that will be. The output is committed;
 * this script exists so the committed files are reproducible and so a fork can
 * swap a photo by editing one id in `content/photos.json`.
 *
 * Two things it refuses to do, both licence-related:
 *
 *  - An Unsplash+ photo (`plus.unsplash.com`, `premium_photo-…`) is a PAID
 *    licence, not the free one. Its metadata looks identical to a free photo's
 *    and it downloads just as happily, which is exactly why the check is here
 *    and not in a reviewer's head.
 *  - It never hand-writes a photographer's name. Attribution comes from the API
 *    response for the id being downloaded, so `content/credits.json` cannot
 *    drift from the file it describes.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const FORCE = process.argv.includes('--force');
const ROOT = path.join(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'src/assets/img');

/** Emitted widths per slot family. */
const WIDTHS = { default: [600, 1200] };

/**
 * The crop is derived from the slot NAME so a new slot cannot invent a ratio the
 * layout has no CSS for. `Picture` sets the same numbers as width/height, and
 * `aspect-[…]` in the markup repeats them — three copies, so keep them in step.
 */
function ratioFor(slot) {
    if (slot.endsWith('-hero')) return 15 / 8;
    return 3 / 2;
}

function widthsFor() {
    return WIDTHS.default;
}

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

/**
 * ⚠️ Unsplash rate-limits this endpoint, and 43 slots is enough to trip it. Back
 * off rather than fail: a 429 halfway through leaves a half-populated src/assets/img
 * and a credits file describing photos that are not there.
 */
async function getJson(url, attempt = 0) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429 && attempt < 5) {
        const wait = 2000 * 2 ** attempt;
        console.log(`[photos] rate limited, waiting ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
        return getJson(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
}

async function metadata(id) {
    const photo = await getJson(`https://unsplash.com/napi/photos/${id}`);

    const raw = photo?.urls?.raw ?? '';
    if (raw.includes('plus.unsplash.com') || raw.includes('premium_photo')) {
        throw new Error(
            `${id} is an Unsplash+ photo. That licence is not the free one and this ` +
                `repository is public — pick a different id in content/photos.json.`,
        );
    }
    if (!raw) throw new Error(`${id}: no source URL in the response`);

    return {
        raw,
        photographer: photo?.user?.name ?? null,
        username: photo?.user?.username ?? null,
        photoUrl: photo?.links?.html ?? `https://unsplash.com/photos/${id}`,
        // Unsplash's own alt text, kept for reference only. The alt text the site
        // RENDERS lives in the translation catalogue, because alt text is copy and
        // belongs in the TMS like every other string a reader can perceive.
        altDescription: photo?.alt_description ?? null,
    };
}

async function download(rawUrl) {
    // 2400px is comfortably above the largest emitted width, so every crop is a
    // downscale. `q=85` on the source keeps the recompression to WebP honest.
    const url = new URL(rawUrl);
    url.searchParams.set('w', '2400');
    url.searchParams.set('q', '85');
    url.searchParams.set('fm', 'jpg');
    url.searchParams.set('fit', 'max');

    const res = await fetch(url);
    if (!res.ok) throw new Error(`download: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

async function emit(slot, buffer) {
    const ratio = ratioFor(slot);
    const out = [];

    for (const width of widthsFor()) {
        const height = Math.round(width / ratio);
        const file = path.join(IMG_DIR, `${slot}-${width}.webp`);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(
            file,
            await sharp(buffer)
                .resize(width, height, { fit: 'cover', position: 'attention' })
                .webp({ quality: 66, effort: 6 })
                .toBuffer(),
        );
        out.push({ width, height });
    }

    /**
     * A 24px-wide preview, inlined as a data URI and painted as the wrapper's
     * background. It fills the reserved box while the real file downloads, and
     * the photo simply covers it — so the blur-up costs zero JavaScript and
     * cannot cause a layout shift.
     */
    const lqip = await sharp(buffer)
        .resize(24, Math.max(1, Math.round(24 / ratio)), { fit: 'cover' })
        .webp({ quality: 40 })
        .toBuffer();

    return { sizes: out, lqip: `data:image/webp;base64,${lqip.toString('base64')}` };
}

const manifest = JSON.parse(await readFile(path.join(ROOT, 'content/photos.json'), 'utf8'));
const slots = Object.entries(manifest.photos);

const creditsFile = path.join(ROOT, 'content/credits.json');

/**
 * id → metadata, so a photo used by two slots is fetched once — and so a repeat
 * run makes NO metadata calls at all. Every credit is already committed, and
 * asking the API to re-confirm 43 unchanged attributions is how the rate limit
 * gets hit by someone who only wanted to add one photo.
 */
const seen = new Map();
if (!FORCE && (await exists(creditsFile))) {
    const committed = JSON.parse(await readFile(creditsFile, 'utf8'));
    for (const credit of committed.photos ?? []) {
        if (credit.id) seen.set(credit.id, { meta: credit });
    }
}
const previews = {};
const credits = new Map();
let written = 0;
let skipped = 0;

for (const [slot, id] of slots) {
    const widest = widthsFor().at(-1);
    const marker = path.join(IMG_DIR, `${slot}-${widest}.webp`);

    if (!FORCE && (await exists(marker))) {
        skipped += 1;
    } else {
        if (!seen.has(id)) seen.set(id, { meta: await metadata(id) });
        const entry = seen.get(id);
        // A credit reloaded from disk has no source URL — only a download needs one.
        if (!entry.meta.raw) entry.meta = await metadata(id);
        entry.buffer ??= await download(entry.meta.raw);

        const { sizes, lqip } = await emit(slot, entry.buffer);
        previews[slot] = { lqip, ...sizes.at(-1) };
        written += 1;
        console.log(`[photos] ${slot} <- ${id} (${entry.meta.photographer})`);
    }

    if (!seen.has(id)) seen.set(id, { meta: await metadata(id) });
    credits.set(id, seen.get(id).meta);
}

/**
 * Previews are regenerated for every slot on a --force run, but a partial run
 * must not drop the entries it skipped — merge onto what is already committed.
 */
const previewFile = path.join(ROOT, 'content/photos.generated.json');
let existingPreviews = {};
if (await exists(previewFile)) {
    existingPreviews = JSON.parse(await readFile(previewFile, 'utf8')).previews ?? {};
}
await writeFile(
    previewFile,
    `${JSON.stringify(
        {
            _generated: 'scripts/fetch-photos.mjs — do not edit by hand',
                    _note: 'Inline 24px previews, one per image slot. Painted behind the real photo so a slow connection sees the shape of the image rather than an empty box, with no JavaScript involved.',
            previews: Object.fromEntries(
                Object.entries({ ...existingPreviews, ...previews }).sort(([a], [b]) =>
                    a.localeCompare(b),
                ),
            ),
        },
        null,
        4,
    )}\n`,
);

/** Which slots each photo appears in, so a credit line can point at what it credits. */
const usedBy = new Map();
for (const [slot, id] of slots) usedBy.set(id, [...(usedBy.get(id) ?? []), slot]);

await writeFile(
    path.join(ROOT, 'content/credits.json'),
    `${JSON.stringify(
        {
            _generated: 'scripts/fetch-photos.mjs — do not edit by hand',
            _note: "Photography credits, rendered on /about/. The Unsplash licence does not require attribution; we attribute anyway, because a brand claiming to be reputable should behave like one — and because a reader who wants the original should be one click away.",
            photos: [...credits.entries()]
                .map(([id, c]) => ({
                    id,
                    photographer: c.photographer,
                    profileUrl: c.username ? `https://unsplash.com/@${c.username}` : null,
                    photoUrl: c.photoUrl,
                    license: 'Unsplash',
                    usedBy: usedBy.get(id) ?? [],
                }))
                .sort((a, b) => (a.photographer ?? '').localeCompare(b.photographer ?? '')),
        },
        null,
        4,
    )}\n`,
);

console.log(
    `[photos] ${written} slot(s) written, ${skipped} already present, ` +
        `${credits.size} photographer credit(s).${FORCE ? '' : ' Use --force to re-download.'}`,
);
