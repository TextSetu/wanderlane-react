const FALLBACK_MANIFEST_URL =
    'https://cdn.textsetu.com/REPLACE_WITH_WANDERLANE_REACT_PUBLIC_KEY/manifest.json';

/**
 * Treat blank as unset.
 *
 * ⚠️ `??` is NOT enough here, and the failure is genuinely nasty. A GitHub
 * Actions `vars.*` that has not been defined substitutes an EMPTY STRING, so a
 * workflow doing `VITE_OTA_MANIFEST_URL: ${{ vars.OTA_MANIFEST_URL }}` inlines
 * `""` — which is not nullish, so `??` keeps it. `fetch("")` then resolves
 * against the current document, and an SPA host that rewrites unknown paths to
 * `/index.html` answers **200 with HTML**. The result is a manifest request that
 * looks perfectly healthy in the network tab, returns 200, and is not a manifest.
 */
function configured(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

/** Where the published translations live. Inlined at build time by Vite. */
export const OTA_MANIFEST_URL = configured(
    import.meta.env.VITE_OTA_MANIFEST_URL,
    FALLBACK_MANIFEST_URL,
);

/**
 * A relative URL would resolve against the app's own origin and silently fetch
 * its shell. Say so once, loudly, rather than let it look like a CDN problem.
 */
if (!/^https?:\/\//i.test(OTA_MANIFEST_URL)) {
    console.error(
        `[ota] VITE_OTA_MANIFEST_URL must be an absolute https:// URL, got "${OTA_MANIFEST_URL}". ` +
            'Translations will not update.',
    );
}

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
