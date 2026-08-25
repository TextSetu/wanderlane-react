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
         * The bundled copy: what renders before any network call resolves, and
         * what the app degrades to if the CDN is unreachable. Published copy is
         * layered ON TOP of this, never instead of it.
         */
        resources: { [DEFAULT_LANGUAGE]: en },

        /**
         * ⚠️ Load-bearing. Without it i18next treats a language present in
         * `resources` as fully bundled and never calls the backend — so the
         * source language would silently stop receiving published updates while
         * every other language received them.
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
export function startManifestPolling(onUpdate: () => void): () => void {
    if (!OTA_ENABLED) {
        otaLog('disabled — serving the bundled copy only');
        return () => {};
    }

    let stopped = false;
    const tick = async () => {
        const manifest = await fetchManifest(true);
        if (stopped || !manifest) return;
        // The manifest may have arrived after the language was resolved, which
        // is the common case on a cold load — so re-apply direction now.
        applyDocumentLanguage(i18n.language);
        onUpdate();
    };

    void tick();
    const timer = setInterval(() => void tick(), OTA_POLL_MS);
    return () => {
        stopped = true;
        clearInterval(timer);
    };
}

export default i18n;
