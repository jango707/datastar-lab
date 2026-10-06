# AGENTS.md

> 🤖 **For AI coding agents.** Terse operating rules for this repo. Humans: start at [README.md](README.md). This file is not tutorial content.

## What this repo is
A Datastar v1 learning lab. One Hono app; one page per lesson (0–7); each demo isolates one Datastar idea. Human walkthroughs live in `lessons/`. Correctness of what the lessons *claim* matters more than code volume.

## Commands
- `bun install`
- `bun run dev` → http://localhost:4321 (`/` redirects to Lesson 0). `bun --hot`: the server reloads, the browser needs a refresh.
- **Restart `bun run dev` before verifying anything that streams.** Hot reloads plus long-lived SSE streams have produced hanging POST bodies and dead timers that look like app bugs.
- `bun run typecheck` → must pass before any commit.

## Stack (do not swap)
- Bun ≥ 1.3, Hono + Hono JSX (`jsxImportSource: hono/jsx`), `@starfederation/datastar-sdk/web`.
- Datastar client: `public/vendor/datastar-1.0.2.js`, loaded once in `src/layout.tsx`. Never load it from a CDN. Never edit the vendored file; upgrading = replace file + `<script src>` in one commit + re-verify every lesson.
- Fonts: Press Start 2P + VT323 (OFL) from `@fontsource/*`, served at `/fonts/*` from `node_modules`. No font CDN.
- Islands: TypeScript in `src/islands/*.ts`, transpiled on request by the `/islands/:name.js` route in `src/server.tsx`, loaded with `<script type="module">` only on the page that needs it.
- Datastar syntax and verified behaviour: [`ai/datastar-v1-rules.md`](ai/datastar-v1-rules.md). Read it before writing any `data-*` attribute.

## Visual rules (pixel art, light theme — user requirement)
- Tokens on `:root` in `public/lab.css` (Candy pop palette). Light only; no dark mode.
- `border-radius: 0` everywhere; 4px ink outlines; hard offset shadows (no blur); no gradients except the page grid and the progress bar's segments; no `transition`/animation; pixel fonts only.
- State styling: swap classes or raise specificity (`.x.lit`, `[aria-pressed="true"]`). Never stack two same-property classes and rely on source order (except the deliberate L1 gotcha).
- Text contrast ≥ 4.5:1, control borders ≥ 3:1. No horizontal page scroll at 375 / 768 / 1280; wide code scrolls inside its `<pre>`.

## Anatomy of a lesson (all parts, every time)
1. `src/demos/NN-slug.tsx`: a Hono sub-app. `GET /` renders via `c.render(…, { title, slug })`; actions live under `/lessons/<slug>/…`.
2. `src/demos/index.ts`: entry in `LESSONS` (`n`, `slug`, `title`, `ready`).
3. `src/server.tsx`: `app.route('/lessons/<slug>', …)`.
4. Every `<Demo>` gets a `code={…}` prop: `Snippet[]` of simplified excerpts (HTML / Server / Island), with `marks` = **exact substrings** to highlight. `CodeBits` logs `[CodeBits] mark not found in snippet` for a bad mark; there must be none. Keep excerpts in sync with the real code when you change a demo.
5. `lessons/NN-slug.md`: the 👤 walkthrough. Sections in order: audience banner → summary table (page, code, time, you'll learn) → The idea → Before you start → numbered Steps (code snippet, **Try it**, **Breakdown**) → Break it (numbered; each changes ONE thing and states the observed result) → Check yourself (`<details>` Q&A) → Official docs for this lesson → Next.
6. `README.md` lessons table row.

## Demo conventions
- Wrap each demo in `<Demo id title shows code>`. `shows` = one-sentence takeaway.
- Signal names must be unique across a page (one global store). Prefix per demo (`chainBase`, `hoodName`). Browser-only bookkeeping starts with `_`.
- Seed signals with `signals({...})` (`src/lib/signals.ts`). Seed arrays at full length: reading `$arr[i]` past the end creates `""` entries.
- Every `data-show` element starts with `style="display:none"`.
- JSX can't put `.` in attribute names: write modifiers as a spread, `{...{ 'data-on:input__debounce.300ms': '…' }}`.
- Valueless key-form attributes need `=""` (Hono renders bare ones as `="true"`).
- Mutating/validating actions sleep a little so in-flight states are visible.
- Expected errors return **200** + an error fragment. Unexpected errors: throw, and `app.onError` → `dsError` (toast + release `KNOWN_BUSY_SIGNALS`). Add any new hand-rolled `*Busy` signal to `KNOWN_BUSY_SIGNALS`.
- `data-indicator` goes on the element whose `data-on:*`/`data-init` fires the fetch, and **before** `data-init` in attribute order.
- Streams: always end by releasing busy signals; long-lived streams need `keepalive: true`, cleanup in `onAbort`, `onError: () => {}` (writes after a disconnect throw), and a `_heartbeat` patch every ≤ 5s (Bun drops idle connections after 10s).
- Islands: no globals. Datastar → island via `data-attr:data-*` (read or `MutationObserver`); island → Datastar via `CustomEvent` caught by `data-on:<event>`.
- A deliberately broken example is labelled `<span class="label-broken">` and paired with a fixed one where possible. **Never "fix" these:**
  - L1 demo 5 `data-bind:userName=""`; L1 demo 6 `.swatch.gc-muted` + `data-class:gc-accent` (`.gc-muted` must stay AFTER `.gc-accent` in `lab.css`)
  - L2 demo 3 the 422 route; L2 demo 4 `chain-early` declared before `chain-doubled`
  - L4 the 302 route, the `/explode/naive` 500, the unguarded Send button
  - L7 the setInterval-in-an-attribute stopwatch

## Truthfulness rule
Only document behaviour you have **reproduced in a browser against the vendored 1.0.2 client** (fresh server, not mid-hot-reload). If an upstream doc or prior belief doesn't reproduce, change the lesson, don't keep the claim. Record each newly verified behaviour in `ai/datastar-v1-rules.md` with the lesson/demo that proves it.

## Docs audience split (keep it obvious)
- 👤 human files: `README.md`, `RESOURCES.md`, `lessons/*.md`. Explanatory prose. First line after the title is the 👤 banner.
- 🤖 AI files: `AGENTS.md`, `CLAUDE.md`, `ai/*.md`. Rules and checklists only. First line after the title is the 🤖 banner.
- Don't put agent instructions in 👤 files or tutorial prose in 🤖 files.
- Links to external docs: only URLs you have fetched and confirmed resolve (the Datastar domain is `data-star.dev`, with a hyphen).

## Never commit
`*.local.md`, `contracts/`, `.claude/skills/datastar/`, `node_modules/`. These are gitignored personal or tooling files. This repo is public: no employer-internal names, paths or code.

## Definition of done (per change)
- `bun run typecheck` passes; every lesson page renders with zero `[CodeBits]` warnings.
- Every demo on the touched pages exercised in a browser on a freshly started server; console shows no errors other than the ones a 👤 walkthrough deliberately provokes.
- No horizontal page scroll at 375 / 768 / 1280.
- Walkthrough "Try it" and "Break it" results match what the browser actually did.
