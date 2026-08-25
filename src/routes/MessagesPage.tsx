import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, Page } from '@/components/ui';
import { messages as seeded } from '@/data/trips';

interface Sent {
    id: string;
    at: string;
    body: string;
}

export default function MessagesPage() {
    const { t, i18n } = useTranslation('messages');
    const [draft, setDraft] = useState('');
    const [sent, setSent] = useState<Sent[]>([]);

    const when = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    /**
     * ⚠️ The composer is local only — nothing is transmitted, and the reply
     * never comes. It is here because a message a reader typed is the one string
     * on the page that must NOT be localized, and a thread mixing catalogue copy
     * with user content is where that distinction is easiest to get wrong.
     */
    const send = (event: React.FormEvent) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body) return;
        setSent((current) => [
            ...current,
            { id: `local-${current.length}`, at: new Date().toISOString(), body },
        ]);
        setDraft('');
    };

    return (
        <Page title={t('title')} intro={t('intro')}>
            <ul className="space-y-3">
                {seeded.map((message) => (
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

                {sent.map((message) => (
                    <li key={message.id}>
                        <Card className="border-sea/40 bg-sea/5">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="text-sm font-medium text-ink">{t('from.traveller')}</p>
                                <p className="text-xs text-sand-600">
                                    {when.format(new Date(message.at))}
                                </p>
                            </div>
                            {/* User content. Rendered verbatim, never through `t()`. */}
                            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-soft">
                                {message.body}
                            </p>
                        </Card>
                    </li>
                ))}
            </ul>

            <form onSubmit={send} className="mt-6">
                <label htmlFor="reply" className="text-sm font-medium text-ink">
                    {t('composer.label')}
                </label>
                <textarea
                    id="reply"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                    placeholder={t('composer.placeholder')}
                    className="mt-2 w-full rounded-card border border-sand-200 bg-white px-3 py-2 text-sm text-ink transition focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/30"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-sand-600">{t('composer.hint')}</p>
                    <button
                        type="submit"
                        disabled={draft.trim().length === 0}
                        className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-sand-50 transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {t('composer.send')}
                    </button>
                </div>
            </form>

            <p className="mt-6 text-sm text-sand-600">{t('note')}</p>
        </Page>
    );
}
