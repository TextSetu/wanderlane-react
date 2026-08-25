import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { itinerary, trips } from '@/data/trips';
import { useRelativeTime } from '@/lib/preferences';

export default function ItineraryPage() {
    const { t, i18n } = useTranslation(['itinerary', 'trips']);
    const relative = useRelativeTime();
    const [day, setDay] = useState<number | null>(null);

    const trip = trips[0]!;
    /**
     * ⚠️ In the STAY'S zone, not the reader's. Without `timeZone` this formats
     * in whatever zone the browser is in, so a 16:00 check-in in Marrakech reads
     * as 15:00 to someone planning from London and 00:00 to someone in Tokyo —
     * correct arithmetic, useless itinerary. `timeZoneName` is shown so the
     * reader can see which clock they are looking at.
     */
    const time = new Intl.DateTimeFormat(i18n.language, {
        timeStyle: 'short',
        timeZone: trip.timeZone,
    });
    const zoneLabel = new Intl.DateTimeFormat(i18n.language, {
        timeZone: trip.timeZone,
        timeZoneName: 'short',
    })
        .formatToParts(new Date(trip.from))
        .find((part) => part.type === 'timeZoneName')?.value;

    const days = [...new Set(itinerary.map((item) => item.day))];
    const shown = day === null ? itinerary : itinerary.filter((item) => item.day === day);
    const shownDays = [...new Set(shown.map((item) => item.day))];

    const chip = (active: boolean) =>
        `rounded-full border px-3.5 py-1.5 text-sm transition ${
            active
                ? 'border-ink bg-ink text-sand-50'
                : 'border-sand-200 bg-white text-ink-soft hover:border-sand-400'
        }`;

    return (
        <Page
            title={t('itinerary:title')}
            intro={t('itinerary:intro', { stay: t(`trips:stays.${trip.stay}`) })}
        >
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setDay(null)} className={chip(day === null)}>
                    {t('itinerary:filter.all')}
                </button>
                {days.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setDay(value === day ? null : value)}
                        className={chip(day === value)}
                    >
                        {t('itinerary:day', { number: value })}
                    </button>
                ))}
                <span className="ms-auto text-sm text-sand-600" aria-live="polite">
                    {t('itinerary:filter.showing', { count: shown.length })}
                </span>
            </div>

            <div className="mt-3">
                <p className="text-xs text-sand-600">
                    {t('itinerary:localTime', { zone: zoneLabel ?? trip.timeZone })}
                </p>
            </div>

            <div className="mt-8 space-y-6">
                {shownDays.map((value) => (
                    <div key={value}>
                        <h2 className="font-serif text-lg text-ink">
                            {t('itinerary:day', { number: value })}
                        </h2>
                        <ul className="mt-3 space-y-3">
                            {shown
                                .filter((item) => item.day === value)
                                .map((item) => (
                                    <li key={item.id}>
                                        <Card className="flex gap-4">
                                            <span className="w-16 shrink-0 text-sm tabular-nums text-sand-600">
                                                {time.format(new Date(item.at))}
                                            </span>
                                            <div>
                                                <p className="text-ink">
                                                    {t(`itinerary:items.${item.key}.title`)}
                                                </p>
                                                <p className="mt-0.5 text-sm text-ink-soft">
                                                    {t(`itinerary:items.${item.key}.detail`)}
                                                </p>
                                                {/* Localized by `Intl.RelativeTimeFormat`,
                                                    which needs no catalogue entry at all. */}
                                                <p className="mt-1 text-xs text-sand-600">
                                                    {relative(item.at)}
                                                </p>
                                            </div>
                                        </Card>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Page>
    );
}
