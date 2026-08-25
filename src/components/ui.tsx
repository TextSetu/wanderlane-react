import type { ReactNode } from 'react';

export function Page({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-4xl px-5 py-10">
            <h1 className="font-serif text-3xl text-ink">{title}</h1>
            {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}
            <div className="mt-8">{children}</div>
        </div>
    );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`rounded-card border border-sand-200 bg-white p-5 shadow-card ${className}`}>
            {children}
        </div>
    );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' }) {
    const tones = {
        neutral: 'bg-sand-100 text-sand-600',
        good: 'bg-sea/10 text-sea-deep',
        warn: 'bg-amber-100 text-amber-800',
    } as const;
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
            {children}
        </span>
    );
}

/** Shown while a lazily-loaded route and its namespace are in flight. */
export function RouteFallback() {
    return (
        <div className="mx-auto w-full max-w-4xl px-5 py-10">
            <div className="h-8 w-48 animate-pulse rounded bg-sand-200" />
            <div className="mt-6 space-y-3">
                <div className="h-24 animate-pulse rounded-card bg-sand-100" />
                <div className="h-24 animate-pulse rounded-card bg-sand-100" />
            </div>
        </div>
    );
}
