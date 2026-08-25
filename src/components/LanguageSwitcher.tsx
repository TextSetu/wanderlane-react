import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cachedManifest, languagesFrom } from '@/i18n/manifest';
import type { OtaLanguage } from '@/i18n/types';

/**
 * The language switcher — rendered entirely from the live manifest.
 *
 * ⚠️ Compare with the statically exported sibling. There, a language the build
 * has no route for cannot be linked and is offered as a client-side "preview".
 * Here there is no such case at all: an SPA has no per-locale routes, so ANY
 * language the manifest lists is fully selectable the moment it is published —
 * no rebuild, no deploy, no preview caveat.
 *
 * That single difference is the reason both repos exist.
 */
export function LanguageSwitcher({ languages }: { languages: OtaLanguage[] }) {
    const { t, i18n } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    /**
     * Before the manifest lands there is exactly one language we can prove
     * exists: the one compiled into this bundle. Offering a guessed list would
     * be worse than offering a short one — every entry in it would be a link to
     * copy we cannot fetch.
     */
    const options = useMemo<OtaLanguage[]>(() => {
        if (languages.length > 0) return languages;
        const cached = languagesFrom(cachedManifest());
        if (cached.length > 0) return cached;
        return [
            { code: i18n.language, label: i18n.language, icon: null, direction: 'ltr' },
        ];
    }, [languages, i18n.language]);

    const current = options.find((o) => o.code === i18n.language);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={t('locale.switch')}
                className="flex items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:border-sand-400"
            >
                <span aria-hidden>{current?.icon || '🌐'}</span>
                <span>{current?.label ?? i18n.language}</span>
                {/* Vertical caret: direction-neutral, so it must NOT mirror in RTL. */}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="opacity-60">
                    <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </button>

            {open && (
                <ul
                    role="listbox"
                    className="absolute end-0 z-50 mt-2 max-h-80 w-56 overflow-auto rounded-card border border-sand-200 bg-white py-1 shadow-card"
                >
                    {options.map((option) => (
                        <li key={option.code}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={option.code === i18n.language}
                                onClick={() => {
                                    void i18n.changeLanguage(option.code);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition hover:bg-sand-100 ${
                                    option.code === i18n.language
                                        ? 'font-semibold text-sea-deep'
                                        : 'text-ink'
                                }`}
                            >
                                <span aria-hidden className="w-5 text-center">
                                    {option.icon ?? ''}
                                </span>
                                <span>{option.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
