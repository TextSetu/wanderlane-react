import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { cachedManifest } from '@/i18n/manifest';
import { CURRENCIES, useMoney, usePreferences, type Currency } from '@/lib/preferences';

/**
 * Preferences, plus the integration's own diagnostics.
 *
 * The healthy state of an OTA integration is silent — no blob requests, nothing
 * in the console — which is indistinguishable from it never having run. Showing
 * the release, the distribution and the language count makes "it is working"
 * something you can see rather than infer.
 */
export default function ProfilePage() {
    const { t, i18n } = useTranslation('profile');
    const { currency, setCurrency } = usePreferences();
    const money = useMoney();
    const manifest = cachedManifest();

    return (
        <Page title={t('title')} intro={t('intro')}>
            <div className="space-y-4">
                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('language.title')}</h2>
                    <p className="mt-2 text-ink-soft">
                        {t('language.body', { language: i18n.language })}
                    </p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('currency.title')}</h2>
                    {/*
                      * ⚠️ Independent of the language on purpose. Someone reading
                      * in Japanese may still be paying in euros — deriving the
                      * currency from the locale restates every price in one
                      * nobody agreed to. See lib/preferences.tsx.
                      */}
                    <p className="mt-2 text-ink-soft">{t('currency.body')}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {CURRENCIES.map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setCurrency(code as Currency)}
                                aria-pressed={currency === code}
                                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                                    currency === code
                                        ? 'border-ink bg-ink text-sand-50'
                                        : 'border-sand-200 bg-white text-ink-soft hover:border-sand-400'
                                }`}
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-ink">
                        {t('currency.sample', { amount: money.format(1240) })}
                    </p>
                    <p className="mt-1 text-xs text-sand-600">{t('currency.note')}</p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('delivery.title')}</h2>
                    {manifest ? (
                        <dl className="mt-3 space-y-1.5 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-sand-600">{t('delivery.distribution')}</dt>
                                <dd className="text-ink">{manifest.distribution.name}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-sand-600">{t('delivery.release')}</dt>
                                <dd className="text-ink tabular-nums">
                                    v{manifest.release.version}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-sand-600">{t('delivery.languages')}</dt>
                                <dd className="text-ink">{manifest.languages.join(', ')}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-sand-600">{t('delivery.format')}</dt>
                                <dd className="text-ink">{manifest.format.id}</dd>
                            </div>
                        </dl>
                    ) : (
                        <p className="mt-2 text-ink-soft">{t('delivery.offline')}</p>
                    )}
                </Card>
            </div>
        </Page>
    );
}
