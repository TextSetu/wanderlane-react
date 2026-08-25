/**
 * The manifest contract, as published by TextSetu content delivery.
 *
 * Mirrors `textsetu.distribution/v1`. Hand-written rather than generated: this is
 * the whole public surface of the read path, it is small, and the SDK's
 * `getContentManifest` is currently typed `unknown`, so there is nothing to
 * generate from.
 */

export interface OtaFile {
    language: string;
    /** ⚠️ Nullable — `null` when the distribution is not split by module. */
    module: string | null;
    path: string;
    /** Absolute, content-addressed, served `immutable`. Never construct it. */
    url: string;
    contentHash: string;
    byteSize: number;
    contentType: string;
}

export interface OtaLanguage {
    code: string;
    label: string;
    icon: string | null;
    direction: 'ltr' | 'rtl';
}

export interface OtaManifest {
    schema: string;
    distribution: { key: string; name: string; channel: string };
    release: { id: string; version: number; contentHash: string; publishedAt: string };
    project: { id: string; sourceLanguage: string | null };
    format: { id: string; keySeparator: string; extension: string };
    languages: string[];
    /** ⚠️ Optional — absent on releases published before the field existed. */
    languageDetails?: OtaLanguage[];
    files: OtaFile[];
    minAppVersion: string | null;
    maxAppVersion: string | null;
    bundles: unknown[];
}

/** A 200 is not proof of a manifest — it may be an S3 error document. */
export function isManifest(value: unknown): value is OtaManifest {
    if (typeof value !== 'object' || value === null) return false;
    const m = value as Partial<OtaManifest>;
    return (
        typeof m.schema === 'string' &&
        m.schema.startsWith('textsetu.distribution/') &&
        typeof m.release?.contentHash === 'string' &&
        Array.isArray(m.files) &&
        Array.isArray(m.languages)
    );
}
