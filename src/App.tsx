import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Shell } from '@/components/Shell';
import { RouteFallback } from '@/components/ui';
import { startManifestPolling } from '@/i18n';
import { cachedManifest, languagesFrom } from '@/i18n/manifest';
import type { OtaLanguage } from '@/i18n/types';

/**
 * Routes are lazy, so Rollup emits one chunk per screen and i18next fetches that
 * screen's namespace on first render. Code and copy split along the same seam.
 */
const TripsPage = lazy(() => import('@/routes/TripsPage'));
const BookingsPage = lazy(() => import('@/routes/BookingsPage'));
const ItineraryPage = lazy(() => import('@/routes/ItineraryPage'));
const MessagesPage = lazy(() => import('@/routes/MessagesPage'));
const ProfilePage = lazy(() => import('@/routes/ProfilePage'));

export default function App() {
    const [languages, setLanguages] = useState<OtaLanguage[]>(() =>
        languagesFrom(cachedManifest()),
    );
    const [releaseVersion, setReleaseVersion] = useState<number | null>(
        () => cachedManifest()?.release.version ?? null,
    );

    useEffect(() => {
        // Re-derives the language list on every poll. This is the mechanism
        // behind "a language published while you had the tab open just appears".
        return startManifestPolling(() => {
            const manifest = cachedManifest();
            setLanguages(languagesFrom(manifest));
            setReleaseVersion(manifest?.release.version ?? null);
        });
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Shell languages={languages} releaseVersion={releaseVersion} />}>
                    <Route
                        index
                        element={
                            <Suspense fallback={<RouteFallback />}>
                                <TripsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="bookings"
                        element={
                            <Suspense fallback={<RouteFallback />}>
                                <BookingsPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="itinerary"
                        element={
                            <Suspense fallback={<RouteFallback />}>
                                <ItineraryPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="messages"
                        element={
                            <Suspense fallback={<RouteFallback />}>
                                <MessagesPage />
                            </Suspense>
                        }
                    />
                    <Route
                        path="profile"
                        element={
                            <Suspense fallback={<RouteFallback />}>
                                <ProfilePage />
                            </Suspense>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
