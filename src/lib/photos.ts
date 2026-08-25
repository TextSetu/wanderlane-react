import generated from '../../content/photos.generated.json';

/**
 * The photography slots, resolved to hashed asset URLs.
 *
 * ⚠️ The files are globbed out of `src/assets/`, not linked from `public/`, so
 * Vite fingerprints them into `dist/assets` — the one prefix the deploy workflow
 * serves with `immutable`. Anything in `public/` is copied through verbatim and
 * lands under the `max-age=0, must-revalidate` rule, which for a photograph
 * means a conditional request on every page load, forever.
 *
 * `eager: true` because there are six of them: a lazy glob would make every
 * image a second round trip after the chunk that needs it, to save a few
 * hundred bytes of URL strings.
 */
const FILES = import.meta.glob('../assets/img/**/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

interface Preview {
    lqip: string;
    width: number;
    height: number;
}

const previews = generated.previews as Record<string, Preview | undefined>;

/** The widths `scripts/fetch-photos.mjs` emits. Keep the two in step. */
const WIDTHS = [600, 1200];

export interface PhotoSources {
    src: string;
    srcSet: string;
    lqip: string | null;
    /** CSS aspect ratio, derived from the slot name exactly as the script does. */
    ratio: string;
}

function urlFor(slot: string, width: number): string | undefined {
    return FILES[`../assets/img/${slot}-${width}.webp`];
}

/**
 * Resolve a slot to what an `<img>` needs, or null when the files are absent.
 *
 * Null rather than a throw: a missing photo is a slot added to
 * `content/photos.json` before `pnpm photos` was run, and the page should render
 * without it rather than fail to render at all.
 */
export function photoFor(slot: string): PhotoSources | null {
    const widest = urlFor(slot, WIDTHS[WIDTHS.length - 1]!);
    if (!widest) return null;

    return {
        src: widest,
        srcSet: WIDTHS.map((width) => {
            const url = urlFor(slot, width);
            return url ? `${url} ${width}w` : null;
        })
            .filter((entry): entry is string => entry !== null)
            .join(', '),
        lqip: previews[slot]?.lqip ?? null,
        ratio: slot.endsWith('-hero') ? '15 / 8' : '3 / 2',
    };
}
