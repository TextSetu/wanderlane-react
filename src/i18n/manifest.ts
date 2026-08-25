import {
    OTA_CACHE_KEY,
    OTA_MANIFEST_TTL_MS,
    OTA_MANIFEST_URL,
    otaLog,
} from './config';
import { isManifest, type OtaLanguage, type OtaManifest } from './types';

/**
 * Reads and caches the distribution manifest.
 *
 * Blobs are content-addressed and served `immutable`, so the browser's HTTP
 * cache handles them better than anything hand-rolled. The MANIFEST is the part
 * worth caching ourselves: `docs/api/content-delivery.md` is explicit that a
 * client should keep its own copy of the last good manifest and fall back to it
 * on ANY non-2xx. `stale-if-error` does not cover this — CloudFront implements
 * neither it nor `stale-while-revalidate`, and browsers do not either.
 *
 * The stored copy stays usable indefinitely, because every blob URL in it is
 * content-addressed and immutable. That property is the whole reason to read a
 * manifest rather than hardcode file URLs.
 */

let memo: { at: number; manifest: OtaManifest } | null = null;
let inFlight: Promise<OtaManifest | null> | null = null;

const BUILDING_MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readCache(): OtaManifest | null {
    try {
        const raw = localStorage.getItem(OTA_CACHE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isManifest(parsed) ? parsed : null;
    } catch {
        return null; // private mode, quota, corrupt JSON — all supported states
    }
}

function writeCache(manifest: OtaManifest): void {
    try {
        localStorage.setItem(OTA_CACHE_KEY, JSON.stringify(manifest));
    } catch {
        /* the in-memory memo still serves this session */
    }
}

/** The manifest we already hold, without going to the network. */
export function cachedManifest(): OtaManifest | null {
    return memo?.manifest ?? readCache();
}

/**
 * The current manifest, or null when none could be read and none was stored.
 *
 * NEVER throws. Callers use the result to IMPROVE what is already on screen, so
 * failure means "keep what you have", not "show an error".
 */
export async function fetchManifest(force = false): Promise<OtaManifest | null> {
    if (!force && memo && Date.now() - memo.at < OTA_MANIFEST_TTL_MS) return memo.manifest;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        const cached = readCache();

        for (let attempt = 0; attempt < BUILDING_MAX_ATTEMPTS; attempt++) {
            let res: Response;
            try {
                res = await fetch(OTA_MANIFEST_URL, { cache: 'default' });
            } catch {
                otaLog('manifest unreachable — using the last good copy');
                return cached;
            }

            // The distribution is mid-publish. Honour the server's own pacing.
            if (res.status === 202) {
                const retryAfter = Number(res.headers.get('Retry-After') ?? 5);
                const wait = Math.min(Number.isFinite(retryAfter) ? retryAfter : 5, 30);
                otaLog(`release is building — retrying in ${wait}s`);
                await sleep(wait * 1000);
                continue;
            }

            if (!res.ok) {
                otaLog(`manifest responded ${res.status} — using the last good copy`);
                return cached;
            }

            const body: unknown = await res.json().catch(() => null);
            if (!isManifest(body)) {
                // Most often this is an SPA host answering 200 with index.html
                // for a URL that does not exist — see the note in config.ts.
                otaLog(
                    `${OTA_MANIFEST_URL} returned 200 but not a manifest ` +
                        '(an app shell, an S3 error document, or a captive portal?) ' +
                        '— using the last good copy',
                );
                return cached;
            }

            memo = { at: Date.now(), manifest: body };
            writeCache(body);
            return body;
        }

        otaLog('release still building — using the last good copy');
        return cached;
    })().finally(() => {
        inFlight = null;
    });

    return inFlight;
}

/**
 * The languages to offer, straight off the wire.
 *
 * ⚠️ There is no hardcoded locale list in this repo, and no build step that
 * produces one. Whatever the manifest lists is what the switcher shows — which
 * is exactly why a language published five minutes ago appears without a deploy.
 *
 * Falls back to `languages` when `languageDetails` is absent (older releases),
 * as the docs mandate, and preserves manifest order because that order is
 * curated upstream.
 */
export function languagesFrom(manifest: OtaManifest | null): OtaLanguage[] {
    if (!manifest) return [];
    return (
        manifest.languageDetails ??
        manifest.languages.map((code) => ({
            code,
            label: code,
            icon: null,
            direction: 'ltr' as const,
        }))
    );
}

/** Resolve one namespace for one language to its absolute, immutable blob URL. */
export function blobUrlFor(
    manifest: OtaManifest,
    language: string,
    namespace: string,
): string | null {
    // ⚠️ Match on `module`, and treat `null` as "the whole locale document".
    // A distribution that is not split by module has one file per language and
    // no namespace to match on.
    const exact = manifest.files.find(
        (f) => f.language === language && f.module === namespace,
    );
    if (exact) return exact.url;

    const whole = manifest.files.find((f) => f.language === language && f.module === null);
    return whole ? whole.url : null;
}
