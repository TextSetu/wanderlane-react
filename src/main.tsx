import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './i18n';
import './index.css';
import { RouteFallback } from './components/ui';
import { PreferencesProvider } from './lib/preferences';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/*
          i18next's `useSuspense: true` means the first render of any component
          calling `useTranslation` suspends until its namespace resolves. The
          bundled source-language resources satisfy that immediately for `common`,
          so this boundary is only really exercised on a language switch.
        */}
        <Suspense fallback={<RouteFallback />}>
            <PreferencesProvider>
                <App />
            </PreferencesProvider>
        </Suspense>
    </StrictMode>,
);
