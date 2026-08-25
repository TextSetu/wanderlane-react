/**
 * The traveller's data.
 *
 * ⚠️ Deliberately NOT in the translation catalogue. Dates, prices, reference
 * codes and counts are identical in every language; putting them in the TMS
 * would ask a translator to "translate" a booking reference and invite a typo
 * into a factual field. Prose goes to TextSetu; facts stay here.
 *
 * The stay and city NAMES are keys, not display strings — they are looked up in
 * the `trips` namespace so they can be transliterated where that matters.
 */
export interface Trip {
    id: string;
    stay: string;
    city: string;
    /** ISO dates, formatted at render time in the active locale. */
    from: string;
    to: string;
    guests: number;
    nights: number;
    reference: string;
    /**
     * The booked amount, in EUR. ⚠️ The DISPLAY currency is a user preference
     * (see lib/preferences.tsx) and nothing here converts — switching it
     * restates the same number, which is honest for a demo and would be a bug
     * in a product that took money.
     */
    totalEur: number;
    status: 'confirmed' | 'awaiting_balance' | 'past';
}

export const trips: Trip[] = [
    {
        id: 't1', stay: 'riad-zitoun', city: 'marrakech',
        from: '2026-11-14', to: '2026-11-19', guests: 4, nights: 5,
        reference: 'WL-4471-MRK', totalEur: 1240, status: 'confirmed',
    },
    {
        id: 't2', stay: 'machiya-nishijin', city: 'kyoto',
        from: '2027-03-28', to: '2027-04-04', guests: 2, nights: 7,
        reference: 'WL-5093-KYO', totalEur: 2310, status: 'awaiting_balance',
    },
    {
        id: 't3', stay: 'alfama-atelier', city: 'lisbon',
        from: '2026-05-02', to: '2026-05-05', guests: 1, nights: 3,
        reference: 'WL-3810-LIS', totalEur: 465, status: 'past',
    },
];

export interface ItineraryItem {
    id: string;
    tripId: string;
    day: number;
    /** Local time, rendered in the active locale. */
    at: string;
    key: string;
}

export const itinerary: ItineraryItem[] = [
    { id: 'i1', tripId: 't1', day: 1, at: '2026-11-14T16:00:00Z', key: 'checkin' },
    { id: 'i2', tripId: 't1', day: 1, at: '2026-11-14T19:30:00Z', key: 'dinner' },
    { id: 'i3', tripId: 't1', day: 2, at: '2026-11-15T07:00:00Z', key: 'bread-oven' },
    { id: 'i4', tripId: 't1', day: 3, at: '2026-11-16T09:30:00Z', key: 'souks' },
    { id: 'i5', tripId: 't1', day: 5, at: '2026-11-19T11:00:00Z', key: 'checkout' },
];

export interface Message {
    id: string;
    tripId: string;
    from: 'host' | 'traveller';
    at: string;
    key: string;
}

export const messages: Message[] = [
    { id: 'm1', tripId: 't1', from: 'host', at: '2026-10-02T09:12:00Z', key: 'welcome' },
    { id: 'm2', tripId: 't1', from: 'traveller', at: '2026-10-02T18:40:00Z', key: 'arrival-time' },
    { id: 'm3', tripId: 't1', from: 'host', at: '2026-10-03T07:05:00Z', key: 'airport-pickup' },
];
