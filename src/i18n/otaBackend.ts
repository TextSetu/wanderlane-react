import type { BackendModule, ReadCallback, Services, InitOptions } from 'i18next';

import en from '../../messages/en.json';
import { blobUrlFor, fetchManifest } from './manifest';
import { otaLog } from './config';
import { recordNamespaceLoad } from './activity';

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
 * ⚠️ FOR THE SOURCE LANGUAGE ONLY, the bundle is laid UNDERNEATH the published
 * copy. This is not a nicety; without it the app renders raw key paths.
 *
 * A published module is the authoritative copy of its namespace, so a target
 * language must REPLACE the bundle wholesale — otherwise a key deleted upstream
 * is resurrected from a build that predates the deletion, and the string
 * everybody agreed to remove comes back.
 *
 * The source language is the one case where that argument inverts. The bundle
 * was compiled from the same commit as the code asking for the key, so it is by
 * construction at least as new as the release on the CDN. Between adding a
 * string and CI pushing it — a window of minutes at best and a weekend at worst
 * — the CDN legitimately does not have it, and replacing wholesale renders
 * `labels.hidePlan` into a button. Observed exactly that.
 *
 * The overlay is deep because the catalogue is nested; a shallow spread would
 * let a published `labels` object hide every sibling key added since.
 */
function overlaySourceBundle(
    lng: string,
    ns: string,
    published: Record<string, unknown>,
): Record<string, unknown> {
    const bundled = bundledFallback(lng, ns);
    return bundled ? deepMerge(bundled, published) : published;
}

/** `published` wins at every leaf. Arrays are values, not things to merge. */
function deepMerge(
    base: Record<string, unknown>,
    over: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(over)) {
        const existing = out[key];
        const bothPlainObjects =
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value) &&
            typeof existing === 'object' &&
            existing !== null &&
            !Array.isArray(existing);
        out[key] = bothPlainObjects
            ? deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>)
            : value;
    }
    return out;
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
                recordNamespaceLoad({ language, namespace, source: 'bundled', bytes: null, release: null });
                callback(null, bundledFallback(language, namespace) ?? {});
                return;
            }

            const url = blobUrlFor(manifest, language, namespace);
            if (!url) {
                // The distribution carries no file for this pair — a namespace
                // that exists in the app but not yet in the catalogue.
                recordNamespaceLoad({
                    language,
                    namespace,
                    source: 'missing',
                    bytes: null,
                    release: manifest.release.version,
                });
                callback(null, bundledFallback(language, namespace) ?? {});
                return;
            }

            const res = await fetch(url, { cache: 'default' });
            if (!res.ok) {
                const fallback = bundledFallback(language, namespace);
                if (fallback) {
                    // Something readable beats a retry the user is waiting on.
                    otaLog(`${language}/${namespace} responded ${res.status} — using the bundled copy`);
                    recordNamespaceLoad({
                        language,
                        namespace,
                        source: 'bundled',
                        bytes: null,
                        release: manifest.release.version,
                    });
                    callback(null, fallback);
                    return;
                }
                recordNamespaceLoad({
                    language,
                    namespace,
                    source: 'error',
                    bytes: null,
                    release: manifest.release.version,
                });
                // No bundled copy to fall back to, so report it as retryable: a
                // 5xx or 429 on an immutable blob is transient by definition,
                // and i18next falls back to the source language meanwhile.
                callback(new Error(`${namespace}/${language} responded ${res.status}`), null);
                return;
            }

            // Read as TEXT first so the panel can report a real size. The JSON
            // is parsed from the same string, so this costs no second request
            // and cannot disagree with what was served.
            const text = await res.text();
            let body: unknown;
            try {
                body = JSON.parse(text);
            } catch {
                recordNamespaceLoad({
                    language,
                    namespace,
                    source: 'error',
                    bytes: text.length,
                    release: manifest.release.version,
                });
                callback(null, bundledFallback(language, namespace) ?? {});
                return;
            }
            if (typeof body !== 'object' || body === null) {
                callback(null, {});
                return;
            }

            otaLog(`loaded ${language}/${namespace} from release ${manifest.release.version}`);
            recordNamespaceLoad({
                language,
                namespace,
                source: 'cdn',
                bytes: new TextEncoder().encode(text).length,
                release: manifest.release.version,
            });
            callback(null, overlaySourceBundle(language, namespace, body as Record<string, unknown>));
        } catch (error) {
            const fallback = bundledFallback(language, namespace);
            recordNamespaceLoad({
                language,
                namespace,
                source: fallback ? 'bundled' : 'error',
                bytes: null,
                release: null,
            });
            if (fallback) {
                callback(null, fallback);
                return;
            }
            callback(error as Error, null);
        }
    },
};
