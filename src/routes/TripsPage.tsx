import { useTranslation } from 'react-i18next';

import { Badge, Card, Page } from '@/components/ui';
import { trips } from '@/data/trips';

const TONE = { confirmed: 'good', awaiting_balance: 'warn', past: 'neutral' } as const;

export default function TripsPage() {
    // The namespace is fetched from the CDN on this line's first execution —
    // one blob, for this screen, in the active language.
    const { t, i18n } = useTranslation(['trips', 'common']);

    /**
     * ⚠️ Dates and money are formatted by `Intl`, in the ACTIVE language, not
     * translated. A date is data; its presentation is a locale rule the platform
     * already knows. Putting "14 November 2026" in the catalogue would mean
     * re-translating it every time the booking moved.
     */
    const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
    const money = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' });

    return (
        <Page title={t('trips:title')} intro={t('trips:intro')}>
            <ul className="space-y-4">
                {trips.map((trip) => (
                    <li key={trip.id}>
                        <Card>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="font-serif text-xl text-ink">
                                        {t(`trips:stays.${trip.stay}`)}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-ink-soft">
                                        {t(`trips:cities.${trip.city}`)}
                                    </p>
                                </div>
                                <Badge tone={TONE[trip.status]}>
                                    {t(`trips:status.${trip.status}`)}
                                </Badge>
                            </div>

                            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                                <div>
                                    <dt className="text-sand-600">{t('trips:labels.dates')}</dt>
                                    <dd className="text-ink">
                                        {date.format(new Date(trip.from))} –{' '}
                                        {date.format(new Date(trip.to))}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sand-600">{t('trips:labels.nights')}</dt>
                                    {/* Plural rules, exercised rather than declared. */}
                                    <dd className="text-ink">
                                        {t('common:units.nights', { count: trip.nights })}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sand-600">{t('trips:labels.guests')}</dt>
                                    <dd className="text-ink">
                                        {t('common:units.guests', { count: trip.guests })}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sand-600">{t('trips:labels.total')}</dt>
                                    <dd className="text-ink">{money.format(trip.totalEur)}</dd>
                                </div>
                            </dl>

                            <p className="mt-4 text-xs text-sand-600">
                                {t('trips:labels.reference', { reference: trip.reference })}
                            </p>
                        </Card>
                    </li>
                ))}
            </ul>
        </Page>
    );
}
