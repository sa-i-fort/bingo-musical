# Copilot instructions — Bingo Musical

Angular 22 standalone app (signals, no NgModules, no NgRx). 100% frontend,
deployed as static files to GitHub Pages — there is no backend and there
never should be one; any feature needing server-side logic is out of scope
unless explicitly requested.

## Stack

- Angular 22, standalone components, `OnPush` change detection everywhere.
- State: a single `BingoStateService` (signals) injected wherever needed.
  No NgRx/Akita — one linear flow (load songs → configure → generate →
  export), one owner of the state.
- PDF: `jspdf`, unit `mm`, format A4. All PDF logic lives in
  `PdfGeneratorService`.
- CSV: `papaparse`.
- Tests: Vitest via `ng test` (not Karma/Jasmine runner, but Jasmine-style
  `describe/it/expect` API).
- No Angular CDK, no state management library, no UI kit beyond Bootstrap
  classes — keep it that way unless a feature genuinely needs it.

## Flow / file map

- `services/bingo-state.service.ts` — all app state as signals (`songs`,
  `settings`, `pdfSettings`, `cards`, generation progress).
- `services/csv-parser.service.ts` — CSV → `Song[]`. Auto-detects
  number/title columns by common header aliases. Drops invalid rows
  (missing number/title, duplicate number, duplicate title — case
  insensitive), then **always renumbers the surviving songs sequentially
  1..N** so dropped rows never leave gaps in the range.
- `services/csv-validation.service.ts` — validates already-parsed songs
  against the configured settings (duplicates, ranges).
- `services/spotify-import.service.ts` — Spotify playlist import via OAuth
  **Authorization Code + PKCE** (no client secret, no backend). Dedupes by
  Spotify track `id`. See the `ponytail:` comment there about Spotify's
  undocumented `/tracks` → `/items` endpoint rename — if this 403s again,
  re-diagnose the current response shape with `curl` before touching code.
- `services/bingo-generator.service.ts` — the card generation algorithm.
  Numbers are split into per-column ranges (`utils/range.util.ts`), one
  random pick per column per card, sorted ascending within the column. Full
  cards are hashed (`cardKey`) to guarantee **no two generated cards are
  ever identical**; row-level repeats across cards are avoided too when
  possible, with three levels of graceful relaxation if the requested
  card count is not achievable (see `SIMILARITY_WINDOW`,
  `MAX_ATTEMPTS_PER_CARD`).
- `services/bingo-validation.service.ts` — checks settings vs. available
  songs before allowing generation (enough songs per column range, etc.).
- `services/pdf-generator.service.ts` — both PDF exports:
  - `download()`: bingo cards grid, straight (non-rounded) corners so sheets
    can be cut with a straightedge, no header, layout/font sizes scale with
    computed cell size (tuned for elderly/low-vision readers). Song title
    and artist are split (`splitSongTitle`, on `" - "`) and drawn on two
    separate lines. Song/artist text uses the `times` font (serif) instead
    of `helvetica` because Helvetica's capital `I` is visually identical to
    a lowercase `l` — numbers/labels stay `helvetica`.
  - `downloadSongList()`: single-page song list PDF, auto-balances into
    multiple columns if needed to fit one page.
- Components under `components/` are all standalone, one responsibility
  each, wired directly to `BingoStateService` — no smart/dumb component
  split, no `@Input`/`@Output` chains beyond `bingo-card` /
  `bingo-card-grid`.

## Conventions to keep

- **Comments are intentionally minimal.** Only keep comments that state a
  real, non-obvious tradeoff (marked `// ponytail: ...`) or that would be
  needed to safely modify the code later. Do not add explanatory prose that
  just restates what the code already says.
- **No unrequested abstractions.** No interfaces with a single
  implementation, no config for values that never change, no service
  layers "for later". Prefer the smallest correct diff.
- All user-facing strings are in Spanish.
- Card numbers are always split into ascending, non-overlapping per-column
  ranges (classic bingo layout) — see `computeColumnRanges` in
  `utils/range.util.ts`. Don't special-case this per feature; route new
  layout logic through it.
- Any change to song loading (CSV or Spotify) must keep song numbers
  sequential and gap-free (1..N) after any filtering/dedup/deletion —
  several features (bingo generation ranges, column validation) assume
  this invariant.
- Song-list order matters and is user-controlled (manual drag & drop
  reorder in `csv-preview.component.ts`, native HTML5 DnD — no CDK). Do not
  silently re-sort songs elsewhere.

## Spotify import specifics

- Client ID is **never** hardcoded or requested from the user at runtime.
  Local dev: `src/app/spotify-client-id.ts` (gitignored, copy from
  `spotify-client-id.example.ts`). Production: injected at build time in
  `.github/workflows/deploy-pages.yml` from the `SPOTIFY_CLIENT_ID`
  repository **variable** (not secret — it's a public OAuth client ID).
- Local HTTPS is required to test the OAuth redirect: `npm run start:https`
  (`ng serve --ssl`).

## Before considering a change done

- `ng build` must succeed (no new lint/build tooling — use what's already
  configured).
- `ng test` must pass (12 tests as of this writing across `range.util`,
  `bingo-generator.service`, `spotify-import.service`, `app`).
- Don't add tests/frameworks beyond the existing Vitest setup unless asked.
