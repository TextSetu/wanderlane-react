/** Where the published translations live. Inlined at build time by Vite. */
export const OTA_MANIFEST_URL =
    import.meta.env.VITE_OTA_MANIFEST_URL ??
    'https://cdn.textsetu.com/REPLACE_WITH_WANDERLANE_REACT_PUBLIC_KEY/manifest.json';

/**
 * Serve only the bundled copy. Off does NOT mean untranslated — the source
 * language is compiled in — it means "ignore anything published since".
 */
export const OTA_ENABLED = import.meta.env.VITE_OTA_DISABLED !== 'true';

/** Matches the manifest's own `max-age=60`, so the memo and the HTTP cache expire together. */
export const OTA_MANIFEST_TTL_MS = 60_000;

/**
 * How often to re-read the manifest while the app is open.
 *
 * This is the mechanism behind "a new language appears with no deploy": the
 * dropdown is re-derived every time this fires. 5 minutes is a compromise —
 * short enough to demo live, long enough not to be chatty on a tab left open.
 */
export const OTA_POLL_MS = 5 * 60_000;

export const OTA_CACHE_KEY = 'wanderlane.ota.manifest';
export const OTA_LANGUAGE_KEY = 'wanderlane.language';

export const OTA_DEBUG = import.meta.env.VITE_OTA_DEBUG === 'true' || import.meta.env.DEV;

export function otaLog(message: string): void {
    if (OTA_DEBUG) console.info(`[ota] ${message}`);
}
