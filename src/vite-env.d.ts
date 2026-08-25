/// <reference types="vite/client" />

/**
 * The build-time configuration surface. Vite inlines each of these into the
 * bundle, so they are set per deployment but not at runtime — which is right:
 * the manifest URL identifies the distribution, and repointing a built app at a
 * different one mid-session would be a different app.
 */
interface ImportMetaEnv {
    readonly VITE_OTA_MANIFEST_URL?: string;
    readonly VITE_OTA_DISABLED?: string;
    readonly VITE_OTA_DEBUG?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
