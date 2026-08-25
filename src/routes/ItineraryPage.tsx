import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { itinerary, trips } from '@/data/trips';

export default function ItineraryPage() {
    const { t, i18n } = useTranslation(['itinerary', 'trips']);
    const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' });
    const trip = trips[0]!;

    const days = [...new Set(itinerary.map((i) => i.day))];

    return (
        <Page
            title={t('itinerary:title')}
            intro={t('itinerary:intro', { stay: t(`trips:stays.${trip.stay}`) })}
        >
            <div className="space-y-6">
                {days.map((day) => (
                    <div key={day}>
                        <h2 className="font-serif text-lg text-ink">
                            {t('itinerary:day', { number: day })}
                        </h2>
                        <ul className="mt-3 space-y-3">
                            {itinerary
                                .filter((i) => i.day === day)
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
