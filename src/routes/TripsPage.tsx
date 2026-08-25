import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Page } from '@/components/ui';
import { Photo } from '@/components/Photo';
import { itinerary, trips } from '@/data/trips';
import { useMoney, useRelativeTime } from '@/lib/preferences';

const TONE = { confirmed: 'good', awaiting_balance: 'warn', past: 'neutral' } as const;

export default function TripsPage() {
    // The namespace is fetched from the CDN on this line's first execution —
    // one blob, for this screen, in the active language.
    // ⚠️ Three namespaces, and the third is deliberate: the expanded plan renders
    // the itinerary's own strings rather than a second copy of them under
    // `trips`. i18next fetches `itinerary` here as well as on its own screen —
    // one extra blob, against duplicating six strings that would then have to be
    // kept in step by hand in every language.
    const { t, i18n } = useTranslation(['trips', 'common', 'itinerary']);
    const money = useMoney();
    const relative = useRelativeTime();
    const [openId, setOpenId] = useState<string | null>(trips[0]?.id ?? null);

    /**
     * ⚠️ Dates are formatted by `Intl`, in the ACTIVE language, not translated.
     * A date is data; its presentation is a locale rule the platform already
     * knows. Putting "14 November 2026" in the catalogue would mean
     * re-translating it every time the booking moved.
     */
    const dateRange = new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    /**
     * The plan is a list of moments WITHIN one week, so relative time is the
     * wrong tool there — `useRelativeTime` picks the largest unit that fits and
     * would print "in 3 months" against all five stops. Weekday plus clock time
     * is what a reader of an itinerary actually wants, and `Intl` knows both in
     * every language.
     */
    const stopTime = new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
    });

    return (
        <Page title={t('trips:title')} intro={t('trips:intro')}>
            <ul className="space-y-6">
                {trips.map((trip) => {
                    const open = openId === trip.id;
                    const stops = itinerary.filter((item) => item.tripId === trip.id);

                    return (
                        <li
                            key={trip.id}
                            className="overflow-hidden rounded-card border border-sand-200 bg-white shadow-card"
                        >
                            <div className="relative">
                                <Photo
                                    slot={`stays/${trip.stay}-hero`}
                                    alt={t(`trips:photoAlt.${trip.stay}`)}
                                    sizes="(max-width: 880px) 100vw, 880px"
                                    priority={trip.id === trips[0]?.id}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-ink/5" />
                                <div className="absolute inset-0 flex items-end p-5">
                                    <div className="w-full">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone={TONE[trip.status]}>
                                                {t(`trips:status.${trip.status}`)}
                                            </Badge>
                                            {/* "in 3 months" — the unit is chosen, not
                                                always days. See useRelativeTime. */}
                                            <span className="rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-medium text-ink">
                                                {relative(trip.from)}
                                            </span>
                                        </div>
                                        <h2 className="mt-2 font-serif text-2xl text-white">
                                            {t(`trips:stays.${trip.stay}`)}
                                        </h2>
                                        <p className="text-sm text-sand-100">
                                            {t(`trips:cities.${trip.city}`)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                                    <div>
                                        <dt className="text-sand-600">
                                            {t('trips:labels.dates')}
                                        </dt>
                                        <dd className="text-ink">
                                            {dateRange.formatRange(
                                                new Date(trip.from),
                                                new Date(trip.to),
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sand-600">
                                            {t('trips:labels.nights')}
                                        </dt>
                                        {/* Plural rules, exercised rather than declared. */}
                                        <dd className="text-ink">
                                            {t('common:units.nights', { count: trip.nights })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sand-600">
                                            {t('trips:labels.guests')}
                                        </dt>
                                        <dd className="text-ink">
                                            {t('common:units.guests', { count: trip.guests })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sand-600">
                                            {t('trips:labels.total')}
                                        </dt>
                                        <dd className="text-ink">{money.format(trip.totalEur)}</dd>
                                    </div>
                                </dl>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-sand-600">
                                        {t('trips:labels.reference', { reference: trip.reference })}
                                    </p>
                                    {stops.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setOpenId(open ? null : trip.id)}
                                            aria-expanded={open}
                                            className="rounded-full border border-sand-200 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink"
                                        >
                                            {open
                                                ? t('trips:labels.hidePlan')
                                                : t('trips:labels.showPlan', {
                                                      count: stops.length,
                                                  })}
                                        </button>
                                    )}
                                </div>

                                {open && stops.length > 0 && (
                                    <ol className="mt-4 space-y-2 border-t border-sand-200 pt-4">
                                        {stops.map((stop) => (
                                            <li
                                                key={stop.id}
                                                className="flex gap-3 text-sm text-ink-soft"
                                            >
                                                <span className="w-28 shrink-0 tabular-nums text-sand-600">
                                                    {stopTime.format(new Date(stop.at))}
                                                </span>
                                                <span>{t(`itinerary:items.${stop.key}.title`)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[...new Set(trips.map((trip) => trip.city))].map((city) => (
                    <div
                        key={city}
                        className="overflow-hidden rounded-card border border-sand-200 bg-white"
                    >
                        <Photo
                            slot={`cities/${city}-card`}
                            alt={t(`trips:photoAlt.${city}`)}
                            sizes="(max-width: 640px) 100vw, 280px"
                        />
                        <p className="px-4 py-3 text-sm text-ink">{t(`trips:cities.${city}`)}</p>
                    </div>
                ))}
            </div>
        </Page>
    );
}
