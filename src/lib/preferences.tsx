import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Display preferences that are NOT the language.
 *
 * ⚠️ This distinction is the point of the file. A traveller reading the app in
 * Japanese may still want to see prices in euros, because the currency is a fact
 * about the booking and the language is a fact about the reader. Deriving one
 * from the other — the `locale === 'ja' ? 'JPY' : …` reflex — quietly restates
 * every price in a currency nobody agreed to pay.
 *
 * So the LOCALE decides how a number is written (separators, digit system, which
 * side the symbol sits on) and the PREFERENCE decides which currency it is
 * written in. `Intl.NumberFormat(language, { currency })` takes both, separately,
 * and has always been able to.
 */

/** Presentation only — nothing here converts, and the amounts do not change. */
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'INR'] as const;
export type Currency = (typeof CURRENCIES)[number];

const STORAGE_KEY = 'wanderlane.currency';

function stored(): Currency {
    const value = localStorage.getItem(STORAGE_KEY);
    return (CURRENCIES as readonly string[]).includes(value ?? '') ? (value as Currency) : 'EUR';
}

interface Preferences {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
}

const PreferencesContext = createContext<Preferences>({
    currency: 'EUR',
    setCurrency: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>(stored);

    const setCurrency = useCallback((next: Currency) => {
        localStorage.setItem(STORAGE_KEY, next);
        setCurrencyState(next);
    }, []);

    const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
    return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export const usePreferences = () => useContext(PreferencesContext);

/**
 * A money formatter bound to the active language AND the chosen currency.
 *
 * Memoised on both: `Intl.NumberFormat` is not free to construct, and this is
 * called on every row of every list.
 */
export function useMoney(): Intl.NumberFormat {
    const { i18n } = useTranslation();
    const { currency } = usePreferences();
    return useMemo(
        () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency }),
        [i18n.language, currency],
    );
}

/**
 * "in 3 months", "2 days ago" — in the active language.
 *
 * ⚠️ Picks the largest unit that fits rather than always reporting days.
 * `Intl.RelativeTimeFormat` formats a number and a unit; deciding WHICH unit is
 * the caller's job, and every implementation that skips it ends up telling
 * someone their trip is in 214 days.
 */
export function useRelativeTime(): (iso: string, now?: Date) => string {
    const { i18n } = useTranslation();

    const format = useMemo(
        () => new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }),
        [i18n.language],
    );

    return useCallback(
        (iso: string, now: Date = new Date()) => {
            const diffMs = new Date(iso).getTime() - now.getTime();
            const units: [Intl.RelativeTimeFormatUnit, number][] = [
                ['year', 31_536_000_000],
                ['month', 2_592_000_000],
                ['week', 604_800_000],
                ['day', 86_400_000],
                ['hour', 3_600_000],
                ['minute', 60_000],
            ];
            for (const [unit, ms] of units) {
                if (Math.abs(diffMs) >= ms) return format.format(Math.round(diffMs / ms), unit);
            }
            return format.format(0, 'minute');
        },
        [format],
    );
}
