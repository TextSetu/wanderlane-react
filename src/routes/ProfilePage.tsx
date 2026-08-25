import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { cachedManifest } from '@/i18n/manifest';

/**
 * Doubles as the integration's own diagnostics panel.
 *
 * The healthy state of an OTA integration is silent — no blob requests, nothing
 * in the console — which is indistinguishable from it never having run. Showing
 * the release, the distribution and the language count makes "it is working"
 * something you can see rather than infer.
 */
export default function ProfilePage() {
    const { t, i18n } = useTranslation('profile');
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
