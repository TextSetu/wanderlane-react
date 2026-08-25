import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { checkForUpdates } from '@/i18n';
import { namespaceLoads, subscribeToNamespaceLoads } from '@/i18n/activity';
import type { OtaLanguage } from '@/i18n/types';

/**
 * The translation layer, made legible.
 *
 * Open it, move between tabs, and each screen's namespace appears as it is
 * fetched — which is the split-chunk story for copy, happening in front of you
 * rather than asserted in a README. It is also the fastest way to tell a working
 * integration from a silently broken one: `bundled` everywhere means the CDN is
 * unreachable and the app is quietly serving what it shipped with.
 */

const TONE: Record<string, string> = {
    cdn: 'bg-sea/10 text-sea-deep',
    bundled: 'bg-sand-100 text-sand-600',
    missing: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
};

export function OtaPanel({
    languages,
    releaseVersion,
}: {
    languages: OtaLanguage[];
    releaseVersion: number | null;
}) {
    const { t, i18n } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [checking, setChecking] = useState(false);

    const events = useSyncExternalStore(subscribeToNamespaceLoads, namespaceLoads);
    const bytes = new Intl.NumberFormat(i18n.language, {
        notation: 'compact',
        style: 'unit',
        unit: 'byte',
        unitDisplay: 'narrow',
    });

    const check = async () => {
        setChecking(true);
        try {
            await checkForUpdates();
        } finally {
            setChecking(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-xs text-ink-soft transition hover:border-sand-400"
            >
                <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${
                        releaseVersion === null ? 'bg-sand-400' : 'bg-sea'
                    }`}
                />
                {releaseVersion === null
                    ? t('ota.noManifest')
                    : t('ota.release', { version: releaseVersion })}
                <span className="text-sand-600">
                    {t('ota.namespaceCount', { count: events.length })}
                </span>
            </button>

            {open && (
                <div className="mt-3 rounded-card border border-sand-200 bg-white p-4">
                    <p className="text-xs leading-relaxed text-sand-600">{t('ota.explainer')}</p>

                    <p className="mt-3 text-xs text-sand-600">
                        {t('ota.languages', {
                            list: languages.map((l) => l.code).join(', ') || '—',
                        })}
                    </p>

                    {events.length === 0 ? (
                        <p className="mt-3 text-xs text-sand-600">{t('ota.nothingYet')}</p>
                    ) : (
                        <ul className="mt-3 space-y-1.5">
                            {events.map((event) => (
                                <li
                                    key={event.id}
                                    className="flex flex-wrap items-center gap-2 text-xs"
                                >
                                    <span
                                        className={`rounded-full px-2 py-0.5 font-medium ${
                                            TONE[event.source] ?? TONE.bundled
                                        }`}
                                    >
                                        {t(`ota.source.${event.source}`)}
                                    </span>
                                    <span className="font-medium text-ink">{event.namespace}</span>
                                    <span className="text-sand-600">{event.language}</span>
                                    {event.bytes !== null && (
                                        <span className="text-sand-600">
                                            {bytes.format(event.bytes)}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        type="button"
                        onClick={() => void check()}
                        disabled={checking}
                        className="mt-4 rounded-full border border-sand-400 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink disabled:opacity-50"
                    >
                        {checking ? t('ota.checking') : t('ota.checkNow')}
                    </button>
                </div>
            )}
        </div>
    );
}
