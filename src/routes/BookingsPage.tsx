import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';

/**
 * The booking terms.
 *
 * These are the strings a property changes at four o'clock on a Friday — and the
 * clearest demonstration in either repo: edit `bookings.policy.body` in TextSetu,
 * publish, and it lands here on the next namespace load with no deploy at all.
 */
export default function BookingsPage() {
    const { t } = useTranslation('bookings');

    return (
        <Page title={t('title')} intro={t('intro')}>
            <div className="space-y-4">
                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('policy.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('policy.body')}</p>
                    <p className="mt-3 text-xs text-sand-600">{t('policy.updated')}</p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('balance.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('balance.body')}</p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('taxes.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('taxes.body')}</p>
                </Card>
            </div>

            <p className="mt-8 text-sm text-sand-600">{t('note')}</p>
        </Page>
    );
}
