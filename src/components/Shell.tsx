import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './LanguageSwitcher';
import type { OtaLanguage } from '@/i18n/types';

const NAV = [
    { to: '/', key: 'nav.trips', end: true },
    { to: '/bookings', key: 'nav.bookings', end: false },
    { to: '/itinerary', key: 'nav.itinerary', end: false },
    { to: '/messages', key: 'nav.messages', end: false },
    { to: '/profile', key: 'nav.profile', end: false },
] as const;

export function Shell({
    languages,
    releaseVersion,
}: {
    languages: OtaLanguage[];
    releaseVersion: number | null;
}) {
    const { t } = useTranslation('common');

    return (
        <div className="min-h-screen">
            <header className="border-b border-sand-200 bg-white">
                <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-5 py-3">
                    <span className="font-serif text-lg text-ink">Wanderlane</span>
                    <span className="text-xs text-sand-600">{t('appName')}</span>
                    <div className="ms-auto">
                        <LanguageSwitcher languages={languages} />
                    </div>
                </div>
                <nav className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-5">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
                                    isActive
                                        ? 'border-sea text-sea-deep'
                                        : 'border-transparent text-ink-soft hover:text-ink'
                                }`
                            }
                        >
                            {t(item.key)}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main>
                <Outlet />
            </main>

            <footer className="mt-12 border-t border-sand-200 bg-white">
                <div className="mx-auto w-full max-w-4xl px-5 py-6 text-xs text-sand-600">
                    <p>{t('footer.disclaimer')}</p>
                    {releaseVersion !== null && (
                        // Deliberately visible: it makes "publish, and it changed"
                        // demonstrable rather than something you take on trust.
                        <p className="mt-1">{t('footer.release', { version: releaseVersion })}</p>
                    )}
                </div>
            </footer>
        </div>
    );
}
