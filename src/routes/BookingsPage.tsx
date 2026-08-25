import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { trips } from '@/data/trips';
import { useMoney, useRelativeTime } from '@/lib/preferences';

const DEPOSIT_RATE = 0.2;
const BALANCE_DAYS_BEFORE = 14;
const MS_PER_DAY = 86_400_000;

/**
 * The booking terms.
 *
 * These are the strings a property changes at four o'clock on a Friday — and the
 * clearest demonstration in either repo: edit `bookings.policy.body` in TextSetu,
 * publish, and it lands here on the next namespace load with no deploy at all.
 */
export default function BookingsPage() {
    const { t } = useTranslation(['bookings', 'trips']);
    const money = useMoney();
    const relative = useRelativeTime();

    /**
     * The schedule is DERIVED from the booking, not stored and not translated.
     * Every figure and every date on this card is arithmetic on two numbers plus
     * `Intl`; the only strings from the catalogue are the four labels.
     */
    const open = trips.filter((trip) => trip.status !== 'past');

    return (
        <Page title={t('bookings:title')} intro={t('bookings:intro')}>
            <div className="space-y-4">
                {open.length > 0 && (
                    <Card>
                        <h2 className="font-serif text-lg text-ink">
                            {t('bookings:schedule.title')}
                        </h2>
                        <ul className="mt-4 space-y-4">
                            {open.map((trip) => {
                                const deposit = Math.round(trip.totalEur * DEPOSIT_RATE);
                                const balanceDue = new Date(
                                    new Date(trip.from).getTime() -
                                        BALANCE_DAYS_BEFORE * MS_PER_DAY,
                                ).toISOString();

                                return (
                                    <li
                                        key={trip.id}
                                        className="border-t border-sand-200 pt-4 first:border-0 first:pt-0"
                                    >
                                        <p className="text-sm font-medium text-ink">
                                            {t(`trips:stays.${trip.stay}`)}
                                        </p>
                                        <dl className="mt-2 space-y-1.5 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-sand-600">
                                                    {t('bookings:schedule.deposit')}
                                                </dt>
                                                <dd className="text-ink">{money.format(deposit)}</dd>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-sand-600">
                                                    {t('bookings:schedule.balance')}
                                                </dt>
                                                <dd className="text-ink">
                                                    {money.format(trip.totalEur - deposit)}
                                                </dd>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-sand-600">
                                                    {t('bookings:schedule.balanceDue')}
                                                </dt>
                                                <dd className="text-ink">{relative(balanceDue)}</dd>
                                            </div>
                                        </dl>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-4 text-xs text-sand-600">
                            {t('bookings:schedule.note')}
                        </p>
                    </Card>
                )}

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('bookings:policy.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('bookings:policy.body')}</p>
                    <p className="mt-3 text-xs text-sand-600">{t('bookings:policy.updated')}</p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('bookings:balance.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('bookings:balance.body')}</p>
                </Card>

                <Card>
                    <h2 className="font-serif text-lg text-ink">{t('bookings:taxes.title')}</h2>
                    <p className="mt-2 leading-relaxed text-ink-soft">{t('bookings:taxes.body')}</p>
                </Card>
            </div>

            <p className="mt-8 text-sm text-sand-600">{t('bookings:note')}</p>
        </Page>
    );
}
