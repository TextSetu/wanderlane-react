# Wanderlane — React/Vite reference integration for TextSetu

The Wanderlane traveller app: a single-page React application whose copy is
published, not deployed. **A language added in TextSetu appears here with no
rebuild, no deploy and no reload** — the language switcher is derived from the
live manifest, and there is no supported-locale list anywhere in this repo.

**Wanderlane is a fictional brand.** Nothing is bookable and no payment is taken.

> Its sibling, [`wanderlane-next`](https://github.com/TextSetu/wanderlane-next),
> is the same brand as a statically exported Next.js site with prerendered
> per-locale routes, `hreflang` and SEO. See *Which one do I want?* below.

- **Live:** https://demo2.textsetu.com
- **Stack:** Vite 7, React 19, i18next + react-i18next, Tailwind v4
- **Hosting:** S3 + CloudFront

---

## The whole integration is one file

`src/i18n/otaBackend.ts` is about forty lines. It is an i18next backend that
resolves a namespace to a blob URL from the manifest instead of from disk.

The app it is modelled on — `apps/web` in the TextSetu monorepo — uses
`i18next-http-backend` with a static `loadPath` of `/locales/{{lng}}/{{ns}}.json`.
Swapping that one module for this one is the entire difference between *copy
ships with the app* and *copy is published*.

```ts
// before: copy is a build artifact
.use(HttpBackend)
.init({ backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
        supportedLngs: ['en', 'es', 'fr', 'de', 'hi'] })

// after: copy is published, and the manifest decides what exists
.use(otaBackend)
.init({ resources: { en: { common: en.common } },   // the chrome only — see below
        partialBundledLanguages: true })
```

Two things fall out for free:

- **Lazy per namespace.** i18next calls `read()` on the first
  `useTranslation('<ns>')`, so a screen downloads its own copy and nothing else.
  That is the split-chunk methodology applied to translations, and it pairs with
  `React.lazy` route splitting so code and copy split along the same seam.
- **No language list.** `supportedLngs` is left at its default. The manifest is
  the only authority on what exists.

## Which one do I want?

A statically exported site prerenders one route per locale, so a **new language**
needs a rebuild before it has a page. An SPA has no per-locale routes, so it does
not.

| | this repo | `wanderlane-next` |
| --- | --- | --- |
| Copy change to an existing language | live on next load | live in ~60s |
| **A brand-new language** | **live immediately, no deploy** | needs a rebuild |
| SEO / `hreflang` / prerendered HTML | ✗ | ✓ |
| Works with JavaScript disabled | ✗ | ✓ |

Pick this one for a signed-in product surface. Pick the Next one for anything a
search engine needs to read.

---

## How it fits together

```
bundle          messages/en.json          compiled in; renders first, and is the
                                          fallback when the CDN is unreachable

first paint     bundled copy              no network on the critical path

runtime         src/i18n/otaBackend.ts    per-namespace fetch from the manifest
                src/i18n/manifest.ts      manifest read + last-good-copy cache
                startManifestPolling()    re-reads every 5 min so a language
                                          published just now becomes selectable
```

**Only `common` is seeded into `resources`, and that is the whole trick.**
i18next never calls the backend for a namespace it already has. Seed the full
catalogue and the source language is served entirely from the bundle — zero blob
requests, no published update ever reaching an English reader — while every
*other* language works perfectly. It is the hardest kind of bug to notice,
because the feature looks alive.

So `common` (the chrome) is seeded, which lets the shell paint with no network on
the critical path, and every other namespace is absent and therefore goes through
the backend: lazily, per route, from the CDN. `partialBundledLanguages: true`
is what tells i18next the seed is incomplete. The full catalogue is still
compiled in — `otaBackend` serves it whenever the CDN cannot be reached, so the
app works offline and during an outage.

**A new release refreshes what is already on screen.** i18next will not re-read a
namespace it considers loaded, so when the polled manifest reports a content hash
different from the one currently applied, the app calls `i18n.reloadResources()`
— which re-runs the backend for every loaded language/namespace pair, including
the seeded `common`. It is guarded on the hash, so an unchanged manifest polled
every five minutes costs nothing, and a failed reload leaves the previous copy in
place rather than blanking the UI.

---

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3030
pnpm build
pnpm typecheck
```

| Variable | Purpose |
| --- | --- |
| `VITE_OTA_MANIFEST_URL` | The distribution's manifest. Copy it from **Project → Manage → Content delivery**. |
| `VITE_OTA_DISABLED=true` | Serve only the bundled copy. Does **not** mean untranslated. |
| `VITE_OTA_DEBUG=true` | Log what the OTA layer decided. On by default in dev. |

**Turn `VITE_OTA_DEBUG` on the first time.** A healthy integration and a
completely broken one look identical in the network tab — both are "no blob
requests". The **Profile** screen also shows the live release, distribution and
language list, for the same reason: the healthy state of this feature is silent,
and silence is indistinguishable from "it never ran".

---

## Deploying

`.github/workflows/deploy.yml` uploads hashed assets first with
`max-age=31536000,immutable`, then the shell with `max-age=0,must-revalidate`,
then invalidates CloudFront. The order is deliberate: an `index.html` uploaded
before its assets references files that are not there yet, which is a white
screen for the length of the sync.

**CloudFront needs two custom error responses** for client-side routing —
`403 → /index.html (200)` and `404 → /index.html (200)`. Without them a visitor
who reloads on `/itinerary` gets S3's XML error document. This is the one piece
of configuration that is not in the repo.

Secrets: `PROD_AWS_ACCESS_KEY`, `PROD_AWS_SECRET_KEY`, `PROD_AWS_REGION`,
`PROD_AWS_S3_BUCKET`, `PROD_AWS_DISTRIBUTION`. Repository variable:
`OTA_MANIFEST_URL`.

---

## Setting it up against your own TextSetu project

1. Create a project, add languages, and create a **distribution**: format
   `i18next`, **split by module ON**. Splitting is what makes per-namespace
   fetching possible; without it every screen downloads every namespace.
2. Publish, then set `VITE_OTA_MANIFEST_URL`.
3. Point a delivery target at your bucket and configure **both** the CDN
   response-headers policy **and** the bucket's CORS rules. A response-headers
   policy decorates real responses but cannot synthesize a preflight, and
   `If-None-Match` is not CORS-safelisted — with only one of the two, publishing
   reports success while every browser fetch fails.
4. Set `projectId` in `textsetu.json` and add a project token (`tsu_proj_…`) as
   the `TEXTSETU_API_KEY` secret.

---

## Things that will bite you

- **Seeding the whole catalogue into `resources` kills the feature for your
  source language.** i18next skips the backend for anything it already has, so
  English is served from the bundle and never updates, while French does — which
  looks like the integration working. Seed only what you need to paint, and let
  the backend serve the rest.
- **`reloadResources()` is what makes a mid-session release visible.** Without
  it, a namespace loaded before the release stays on the old copy until a
  language switch or a reload.
- **`module` is nullable.** A distribution that is not split by module has one
  file per language and no namespace to match on. `blobUrlFor()` falls back to it
  rather than returning nothing.
- **`languageDetails` is optional** on releases published before the field
  existed. `languagesFrom()` falls back to `languages`.
- **`202` is not an error.** A distribution mid-publish answers
  `202 {"status":"building"}` with a `Retry-After`. Treating it as a failure
  means a brand-new distribution looks permanently broken.
- **The ETag is not the content hash.** `files[].contentHash` is `sha256:<hex>`;
  the `ETag` header is bare hex identifying the *manifest document*. Comparing
  them is permanently false.
- **A backend error must be reported, not swallowed.** Returning `{}` on a 5xx
  tells i18next the namespace is empty and it will never retry; returning an
  error lets it recover later. `otaBackend.read()` distinguishes the two.
- **`dir` comes from the manifest**, not a hardcoded RTL list, and is left alone
  until the manifest arrives — flipping to a guessed direction is worse than
  waiting one tick.
- **Dates, money and counts are not translated.** They are formatted with `Intl`
  in the active language. Only the *plural forms* around a count live in the
  catalogue. See `src/data/trips.ts`.

## Known trade-offs

- **No SEO.** The shell is one document served to everyone; a crawler that does
  not run JavaScript sees `lang="en"` for every language. That is the price of
  zero-deploy language changes, and it is why the Next sibling exists.
- **First paint is the bundled source language** for a visitor whose preferred
  language has not loaded yet. The alternative — blocking render on a network
  request — is worse.
- **Only `en` is committed.** Translations are owned by TextSetu, not authored
  here. Everything else arrives at runtime.


## Photography

The images under `src/assets/img/` are real Unsplash photographs, downloaded by
a reproducible script rather than committed by hand:

| File | Role |
| --- | --- |
| `content/photos.json` | The manifest: one Unsplash photo id per image slot. Edit this to swap a photo. |
| `scripts/fetch-photos.mjs` | `pnpm photos`. Downloads, crops, writes the WebP files and regenerates the credits. |
| `content/credits.json` | Generated. |

Two things it refuses to do: download an Unsplash+ photo (a paid licence, whose
metadata is indistinguishable from a free one's, in a public repository), and
hand-write an attribution — photographer names come from the API response for
the id being downloaded.

⚠️ **They live in `src/assets/`, not `public/`.** Vite content-hashes anything
imported from `src`, so the files land in `dist/assets` — the one prefix the
deploy workflow serves with `immutable`. A photograph in `public/` is copied
through verbatim and falls under the `max-age=0, must-revalidate` rule, which
means a conditional request for it on every page load, forever.

Alt text is not here. It lives in `messages/en.json` with every other string a
reader can perceive, and it is translated like the rest.

---

## The interactive pieces, and what each one is for

| Where | What it shows |
| --- | --- |
| **Trip cards** | `Intl.RelativeTimeFormat` picking the largest unit that fits, so a trip is "in 3 months" rather than "in 87 days". Expanding one loads the `itinerary` namespace on a screen that is not the itinerary — cross-namespace fetching, visible in the panel below. |
| **Itinerary filter** | A live count through the locale's plural rule, on a number that changes as you click. |
| **Message composer** | The one string on the page that must NOT be localized. A thread mixing catalogue copy with text a reader typed is where that line is easiest to blur. |
| **Currency preference** (Profile) | Deliberately independent of the language. Someone reading in Japanese may still be paying in euros; the `locale === 'ja' ? 'JPY' : …` reflex restates every price in a currency nobody agreed to. `Intl.NumberFormat(language, { currency })` has always taken both, separately. |
| **Delivery panel** (footer) | Every namespace load as it happens: which language, which module, how many bytes, and whether it came off the CDN or out of the bundle. `Bundled` everywhere means the CDN is unreachable and the app is quietly serving what it shipped with — the failure this whole architecture is otherwise silent about. |

---

## One trap this repo hit, and how it is handled

A key added to `messages/en.json` does not exist on the CDN until CI has pushed
it and someone has published. In between, the published module REPLACES the
bundled one and the app renders the raw key path into the UI — observed as a
button reading `labels.hidePlan`.

`otaBackend.ts` lays the bundled copy **underneath** the published one, **for the
source language only**. The bundle was compiled from the same commit as the code
asking for the key, so for the source language it is by construction at least as
new as the release on the CDN.

⚠️ That argument does not extend to a target language, and the overlay must not
either. A published module is the authoritative copy of its namespace; merging a
stale bundle under a French release would resurrect keys that were deliberately
deleted upstream.


## Licence

MIT. See `LICENSE`.
