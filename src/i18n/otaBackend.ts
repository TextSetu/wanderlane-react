import type { BackendModule, ReadCallback, Services, InitOptions } from 'i18next';

import en from '../../messages/en.json';
import { blobUrlFor, fetchManifest } from './manifest';
import { otaLog } from './config';

/** The source language compiled into this bundle, by namespace. */
const BUNDLED = en as Record<string, Record<string, unknown>>;
const BUNDLED_LANGUAGE = 'en';

/**
 * What to serve when the CDN cannot answer.
 *
 * Returns the compiled-in copy for the source language and `null` for anything
 * else — a French screen falling back to English text is i18next's job via
 * `fallbackLng`, and doing it here would rob it of the chance to retry.
 */
function bundledFallback(lng: string, ns: string): Record<string, unknown> | null {
    return lng === BUNDLED_LANGUAGE ? (BUNDLED[ns] ?? null) : null;
}

/**
 * An i18next backend that resolves namespaces from a TextSetu manifest.
 *
 * This is the whole integration, and it is deliberately ~40 lines.
 *
 * The app it is modelled on (`apps/web` in the TextSetu monorepo) uses
 * `i18next-http-backend` with a static `loadPath` of
 * `/locales/{{lng}}/{{ns}}.json` — files shipped in the bundle, so changing a
 * string means a deploy. Swapping that one module for this one is the entire
 * difference between "copy ships with the app" and "copy is published".
 *
 * Two properties come for free and are worth naming:
 *
 *   - **Lazy per namespace.** i18next calls `read()` on first
 *     `useTranslation('<ns>')`, so a screen downloads its own copy and nothing
 *     else. That is the split-chunk methodology applied to translations.
 *   - **No language list.** `read()` is called with whatever language i18next
 *     resolved; the manifest decides whether a file exists. Nothing here, and
 *     nothing in the build, enumerates the supported languages.
 */
export const otaBackend: BackendModule = {
    type: 'backend',

    // i18next requires these; there is nothing to configure.
    init(_services: Services, _backendOptions: unknown, _i18nextOptions: InitOptions) {},

    async read(language: string, namespace: string, callback: ReadCallback) {
        try {
            const manifest = await fetchManifest();
            if (!manifest) {
                // Offline, or the CDN is unreachable and nothing was cached.
                // The compiled-in copy is exactly what should render.
                callback(null, bundledFallback(language, namespace) ?? {});
                return;
            }

            const url = blobUrlFor(manifest, language, namespace);
            if (!url) {
                // The distribution carries no file for this pair — a namespace
                // that exists in the app but not yet in the catalogue.
                callback(null, bundledFallback(language, namespace) ?? {});
                return;
            }

            const res = await fetch(url, { cache: 'default' });
            if (!res.ok) {
                const fallback = bundledFallback(language, namespace);
                if (fallback) {
                    // Something readable beats a retry the user is waiting on.
                    otaLog(`${language}/${namespace} responded ${res.status} — using the bundled copy`);
                    callback(null, fallback);
                    return;
                }
                // No bundled copy to fall back to, so report it as retryable: a
                // 5xx or 429 on an immutable blob is transient by definition,
                // and i18next falls back to the source language meanwhile.
                callback(new Error(`${namespace}/${language} responded ${res.status}`), null);
                return;
            }

            const body: unknown = await res.json();
            if (typeof body !== 'object' || body === null) {
                callback(null, {});
                return;
            }

            otaLog(`loaded ${language}/${namespace} from release ${manifest.release.version}`);
            callback(null, body as Record<string, unknown>);
        } catch (error) {
            const fallback = bundledFallback(language, namespace);
            if (fallback) {
                callback(null, fallback);
                return;
            }
            callback(error as Error, null);
        }
    },
};
