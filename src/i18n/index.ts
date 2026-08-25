import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../messages/en.json';
import { OTA_ENABLED, OTA_LANGUAGE_KEY, OTA_POLL_MS, otaLog } from './config';
import { cachedManifest, fetchManifest, languagesFrom } from './manifest';
import { otaBackend } from './otaBackend';

/**
 * ⚠️ There is NO `SUPPORTED_LANGUAGES` constant in this repo, and that absence is
 * the feature.
 *
 * The sibling app (`apps/web` in the TextSetu monorepo) declares one, and so does
 * almost every i18next setup — which means adding a language is a code change, a
 * review and a deploy. Here `supportedLngs` is left at its default (`false`,
 * "allow anything") and the manifest is the only authority on what exists. A
 * language published a minute ago is selectable immediately.
 *
 * The cost, stated plainly: a bogus language code is accepted and simply
 * resolves to nothing, falling back to the source language. That is the correct
 * trade — the alternative re-introduces the deploy.
 */

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_NS = 'common';

/**
 * One namespace per screen, matching the distribution's module split.
 *
 * ⚠️ Listed here only so the router can preload; nothing enforces it. A
 * namespace the manifest carries but this list omits still loads fine on first
 * `useTranslation()`.
 */
export const NAMESPACES = [
    'common',
    'trips',
    'bookings',
    'itinerary',
    'messages',
    'profile',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

void i18n
    .use(otaBackend)
    .use(initReactI18next)
    .init({
        lng: localStorage.getItem(OTA_LANGUAGE_KEY) ?? DEFAULT_LANGUAGE,
        fallbackLng: DEFAULT_LANGUAGE,
        defaultNS: DEFAULT_NS,
        ns: [DEFAULT_NS],
        load: 'languageOnly',

        /**
         * ⚠️ ONLY `common`, and that is the whole trick.
         *
         * i18next never calls the backend for a namespace it already has. Seed
         * the full catalogue here and the source language is served entirely
         * from the bundle: zero blob requests, no published update ever
         * reaching an English reader, while every OTHER language works — the
         * hardest kind of bug to notice, because the feature looks alive.
         * (Verified: with the full catalogue seeded, `read()` fired for `fr`
         * and never once for `en`.)
         *
         * `common` is the chrome, so seeding it means the shell paints with no
         * network on the critical path. Every other namespace is absent and
         * therefore goes through the backend — lazily, per route, from the CDN —
         * and `common` itself is refreshed by `reloadResources()` when a new
         * release appears. The full bundled catalogue is still imported: the
         * backend serves it when the CDN cannot be reached.
         */
        resources: { [DEFAULT_LANGUAGE]: { [DEFAULT_NS]: en[DEFAULT_NS] } },

        /**
         * ⚠️ Load-bearing, and only meaningful because the seed above is
         * partial: it tells i18next that `resources` is incomplete and the
         * backend must be consulted for whatever is missing.
         */
        partialBundledLanguages: true,

        interpolation: { escapeValue: false }, // React already escapes
        react: { useSuspense: true },
        debug: false,
    });

/**
 * Keep the document in step with the active language.
 *
 * ⚠️ Direction comes from the MANIFEST, not a hardcoded RTL list. Reading it
 * from the cached copy rather than refetching keeps this synchronous, so the
 * attribute flips in the same frame as the language.
 */
function applyDocumentLanguage(language: string): void {
    document.documentElement.lang = language;
    const details = languagesFrom(cachedManifest()).find((l) => l.code === language);
    // Leave `dir` alone when the manifest has not arrived: the document starts
    // `ltr`, and flipping to a guessed direction would be worse than waiting.
    if (details) document.documentElement.dir = details.direction;
}

i18n.on('languageChanged', (lng: string) => {
    localStorage.setItem(OTA_LANGUAGE_KEY, lng);
    applyDocumentLanguage(lng);
});

/**
 * Re-read the manifest periodically so a language published while the app is
 * open becomes selectable without a reload.
 *
 * Only the manifest is re-read — namespaces already loaded are not refetched.
 * Copy that changed mid-session lands on the next language switch or reload,
 * which is the right trade: silently swapping strings under a user who is
 * mid-sentence in a form is worse than being one release behind.
 */
/** Release the loaded namespaces were last fetched at. */
let appliedRelease: string | null = null;
/** Set by `startManifestPolling`; the app's re-render hook. */
let notify: (() => void) | null = null;

async function checkOnce(): Promise<void> {
    const manifest = await fetchManifest(true);
    if (!manifest) return;

    // The manifest may arrive after the language was resolved, which is the
    // common case on a cold load — so re-apply direction now.
    applyDocumentLanguage(i18n.language);

    /**
     * A new release only reaches the screen if the namespaces already in memory
     * are re-read; i18next will not do it on its own, because as far as it is
     * concerned they are loaded. `reloadResources` re-runs the backend for every
     * loaded language/namespace pair — including the seeded `common`.
     *
     * Guarded on the release hash so an unchanged manifest, polled every five
     * minutes, costs nothing. A failed reload leaves the previous copy in place
     * rather than blanking the UI (verified), so this is safe to run unattended.
     */
    if (appliedRelease !== null && manifest.release.contentHash !== appliedRelease) {
        otaLog(`release ${manifest.release.version} — refreshing loaded namespaces`);
        await i18n.reloadResources().catch(() => {});
    }
    appliedRelease = manifest.release.contentHash;

    notify?.();
}

/**
 * Check now, on demand.
 *
 * ⚠️ Deliberately the SAME function the poll runs, not a second copy of it. Two
 * code paths that both "check for updates" is how one of them quietly stops
 * refreshing loaded namespaces while the other still does, and the difference
 * only shows up as "it updates on its own but not when I press the button".
 */
export function checkForUpdates(): Promise<void> {
    return checkOnce();
}

/**
 * Re-read the manifest periodically so a language published while the app is
 * open becomes selectable without a reload.
 *
 * Only the manifest is re-read on a poll where nothing changed — namespaces
 * already loaded are refetched only when the release hash moves. Copy that
 * changed mid-session lands then, or on the next language switch or reload.
 */
export function startManifestPolling(onUpdate: () => void): () => void {
    if (!OTA_ENABLED) {
        otaLog('disabled — serving the bundled copy only');
        return () => {};
    }

    notify = onUpdate;
    void checkOnce();
    const timer = setInterval(() => void checkOnce(), OTA_POLL_MS);

    return () => {
        notify = null;
        clearInterval(timer);
    };
}

export default i18n;
