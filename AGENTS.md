# AGENTS.md

> 🤖 **For AI coding agents.** Terse operating rules for this repo. Humans: start at [README.md](README.md). This file is not tutorial content.

## What this repo is
A Datastar v1 learning lab. One Hono app; one page per lesson; each demo isolates one Datastar idea. Human walkthroughs live in `lessons/`. Correctness of what the lessons *claim* matters more than code volume.

## Commands
- `bun install`
- `bun run dev` → http://localhost:4321 (`bun --hot`; server reloads, browser needs a refresh)
- `bun run typecheck` → must pass before any commit

## Stack (do not swap)
- Bun ≥ 1.3, Hono + Hono JSX (`jsxImportSource: hono/jsx`), `@starfederation/datastar-sdk/web`.
- Datastar client: `public/vendor/datastar-1.0.2.js`, loaded once in `src/layout.tsx`. Never load from a CDN. Never edit the vendored file; upgrading = replace file + `<script src>` in one commit + re-verify every lesson.
- Plain CSS with tokens on `:root` in `public/lab.css`. Light theme only. No Tailwind or CSS frameworks.
- Datastar syntax rules: [`ai/datastar-v1-rules.md`](ai/datastar-v1-rules.md). Read it before writing any `data-*` attribute.

## Anatomy of a lesson (all five parts, every time)
1. `src/demos/NN-slug.tsx`: a Hono sub-app. `GET /` renders the page via `c.render(…, { title, slug })`; its actions live under the same prefix (`/lessons/<slug>/…`).
2. `src/demos/index.ts`: entry in `LESSONS`; set `ready: true` only when 1–5 are done.
3. `src/server.tsx`: `app.route('/lessons/<slug>', …)`.
4. `lessons/NN-slug.md`: the 👤 walkthrough. Sections in order: audience banner → summary table (page, code, time, you'll learn) → The idea → Before you start → numbered Steps (markup snippet, **Try it**, **Breakdown**) → Break it (numbered; each changes ONE thing and states the observed result) → Check yourself (`<details>` Q&A) → Official docs for this lesson → Next.
5. `README.md` lessons table row (status ✅).

## Demo conventions
- Wrap each demo in `<Demo id title shows>` from `src/components.tsx`. `shows` = one-sentence takeaway; detail belongs in the walkthrough, not on the page.
- Signal names must be unique across a page (one global store). Prefix per demo when in doubt (`chainBase`, `signupName`).
- Seed signals with `signals({...})` from `src/lib/signals.ts`, never hand-built JSON strings.
- Every `data-show` element starts with `style="display:none"`.
- Server actions that mutate or validate sleep `SLOW_MS` so in-flight states are visible.
- Expected errors return **200** with an error fragment (Datastar ignores non-2xx).
- `data-indicator` goes on the element whose `data-on:*` fires the fetch (the `<form>` for submit).
- A deliberately broken example is labelled `<span class="label-broken">` and paired with a `<span class="label-fixed">` version. Never "fix" these:
  - Lesson 1 demo 5: `data-bind:userName=""` (lowercasing gotcha)
  - Lesson 1 demo 6: `.swatch.gc-muted` + `data-class:gc-accent` (cascade gotcha; `.gc-muted` must stay AFTER `.gc-accent` in `lab.css`)
  - Lesson 2 demo 3: the 422 route
  - Lesson 2 demo 4: `chain-early` declared before `chain-doubled`

## Truthfulness rule
Only document behaviour you have **reproduced in a browser against the vendored 1.0.2 client**. If an upstream doc or prior belief doesn't reproduce, change the lesson, don't keep the claim. Record each newly verified behaviour in `ai/datastar-v1-rules.md` → "Verified behaviour" with the lesson/demo that proves it.

## Docs audience split (keep it obvious)
- 👤 human files: `README.md`, `RESOURCES.md`, `lessons/*.md`. Explanatory prose. First line after the title is the 👤 banner.
- 🤖 AI files: `AGENTS.md`, `CLAUDE.md`, `ai/*.md`. Rules and checklists only. First line after the title is the 🤖 banner.
- Don't put agent instructions in 👤 files or tutorial prose in 🤖 files.
- Links to external docs: only URLs you have fetched and confirmed resolve (the Datastar domain is `data-star.dev`, with a hyphen).

## Never commit
`*.local.md`, `contracts/`, `.claude/skills/datastar/`, `node_modules/`. These are gitignored personal or tooling files. This repo is public: no employer-internal names, paths or code.

## Definition of done (per change)
- `bun run typecheck` passes.
- Every demo on the touched page exercised in a browser; console shows no errors other than the ones a 👤 walkthrough deliberately provokes.
- No horizontal scroll at 375px wide; layout holds at 1280px.
- Walkthrough "Try it" and "Break it" results match what the browser actually did.
