import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { messages } from '@/data/trips';

export default function MessagesPage() {
    const { t, i18n } = useTranslation('messages');
    const when = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <Page title={t('title')} intro={t('intro')}>
            <ul className="space-y-3">
                {messages.map((message) => (
                    <li key={message.id}>
                        <Card>
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="text-sm font-medium text-ink">
                                    {t(`from.${message.from}`)}
                                </p>
                                <p className="text-xs text-sand-600">
                                    {when.format(new Date(message.at))}
                                </p>
                            </div>
                            <p className="mt-2 leading-relaxed text-ink-soft">
                                {t(`items.${message.key}`)}
                            </p>
                        </Card>
                    </li>
                ))}
            </ul>
            <p className="mt-6 text-sm text-sand-600">{t('note')}</p>
        </Page>
    );
}
