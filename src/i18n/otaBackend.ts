import type { BackendModule, ReadCallback, Services, InitOptions } from 'i18next';

import { blobUrlFor, fetchManifest } from './manifest';
import { otaLog } from './config';

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
                // No manifest and no cached copy. Report "nothing here" rather
                // than an error: i18next then falls back to the bundled
                // resources, which is precisely the right outcome.
                callback(null, {});
                return;
            }

            const url = blobUrlFor(manifest, language, namespace);
            if (!url) {
                callback(null, {});
                return;
            }

            const res = await fetch(url, { cache: 'default' });
            if (!res.ok) {
                // `true` = retryable. A 5xx or a 429 on an immutable blob is
                // transient by definition, so letting i18next try again later
                // costs nothing and recovers a namespace that would otherwise
                // stay on the bundled copy for the rest of the session.
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
            callback(error as Error, null);
        }
    },
};
