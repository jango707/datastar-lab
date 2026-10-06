# Datastar Lab 🧪

> 👤 **For humans. Start here.**
> *(AI agents: read [`AGENTS.md`](AGENTS.md) instead.)*

A hands-on course in **[Datastar](https://data-star.dev) v1** where you learn by breaking things. Datastar is a ~10 KB client that turns server-rendered HTML into a reactive UI: state lives in `data-*` attributes, and the server sends back HTML to patch the page.

This repo is one small app with one page per lesson. Each demo isolates **one idea**, and each lesson ends with exercises where you deliberately break something and watch what happens.

---

## Requirements

| You need | Version | Why |
|---|---|---|
| [Bun](https://bun.com/docs/installation) | **1.3 or newer** | Runs the server and installs dependencies. You don't need Node. |
| A modern browser | Any current Chrome, Edge, Firefox or Safari | The lessons rely heavily on DevTools (Elements, Network, Console) |
| Git | any | To clone the repo |

**What you should already know:** basic HTML and a little JavaScript. You don't need any framework experience. The server code is TypeScript using [Hono](https://hono.dev/docs/), but every lesson explains the parts that matter.

**Network:** only needed for `bun install`. The Datastar client is bundled in `public/vendor/`, so the lab works offline after that.

## Run it

```bash
bun install
bun run dev
```

Then open **<http://localhost:4321>**, which starts at Lesson 0. The server reloads itself when you save a file; just refresh the browser.

```bash
bun run typecheck   # type-check everything
```

**Troubleshooting:** if requests start hanging or streams behave strangely after a lot of saving, stop `bun run dev` and start it again. Hot reloading and long-lived streams (Lessons 5–6) don't always mix.

---

## Lessons

| # | Lesson | Walkthrough |
|---|---|---|
| 0 | **Under the hood**: one full round trip, drawn live with arrows | [lessons/00-under-the-hood.md](lessons/00-under-the-hood.md) |
| 1 | Signals (no server) | [lessons/01-signals.md](lessons/01-signals.md) |
| 2 | Actions + swap by id | [lessons/02-actions.md](lessons/02-actions.md) |
| 3 | Server reads signals: SSE, active search, patch modes | [lessons/03-server-signals.md](lessons/03-server-signals.md) |
| 4 | Navigation, errors, double-submit | [lessons/04-navigation-errors.md](lessons/04-navigation-errors.md) |
| 5 | Streaming: a word-by-word chat, a progress stream | [lessons/05-streaming.md](lessons/05-streaming.md) |
| 6 | Live updates: polling vs push, a room shared across tabs, heartbeats | [lessons/06-live.md](lessons/06-live.md) |
| 7 | Where Datastar stops: expressions vs programs, a pixel-paint island | [lessons/07-islands.md](lessons/07-islands.md) |

### How to do a lesson

1. **Open the lesson page** in the browser. Every demo has a **Code** panel underneath it, a short excerpt with the important parts highlighted, and every page has a **Live signals** panel showing the page's state as JSON.
2. **Follow the walkthrough** in [`lessons/`](lessons/). It goes step by step: what to click, what each attribute does, and what to notice.
3. **Break it.** Each walkthrough ends with exercises that change one thing (usually in `src/demos/NN-*.tsx`; a few touch `src/server.tsx` or `src/islands/paint.ts`) and tell you what you should see.
4. **Check yourself** with the short questions at the end of each walkthrough.

Every gotcha in these lessons was **reproduced in a real browser** against the bundled Datastar 1.0.2 client. Where the official docs and this lab differ, the lab says so.

---

## Who reads what

This repo has two audiences, and every Markdown file says at the top which one it's for.

| Badge | Audience | Files | Style |
|---|---|---|---|
| 👤 | **Humans** | `README.md`, `lessons/*.md`, `RESOURCES.md` | Explanations, walkthroughs, exercises |
| 🤖 | **AI coding agents** | `AGENTS.md`, `CLAUDE.md`, `ai/*.md` | Short rules, conventions, checklists |
| — | Both | `src/**`, `public/lab.css` | Code, with comments written for people |

If you're a human, you can skip everything marked 🤖. Those files exist so an AI assistant working in this repo follows the same conventions.

## Repo map

```
README.md          👤 you are here
lessons/           👤 step-by-step walkthroughs, one per lesson
RESOURCES.md       👤 official docs and further reading
src/
  server.tsx       Hono app: static files + one sub-app per lesson
  layout.tsx       page shell: lesson nav, the Datastar <script>, Live signals panel
  components.tsx   lesson heading, demo card, Code panels
  demos/           the code behind each lesson page (00-under-the-hood.tsx, …)
  islands/         Lesson 7's client-side TypeScript, served as /islands/*.js
  lib/signals.ts   safe JSON for data-signals attributes
  lib/datastar.tsx server helpers: toHtml, dsRedirect, dsError (toasts)
public/
  lab.css          plain-CSS pixel-art theme (no framework, no rounded corners)
  vendor/          the unmodified Datastar 1.0.2 client
AGENTS.md          🤖 instructions for AI coding agents
CLAUDE.md          🤖 Claude Code entry point (imports AGENTS.md)
ai/                🤖 Datastar v1 rules verified in this lab
```

Files ending in `.local.md` are personal notes and are gitignored.

## Further reading

Start with [RESOURCES.md](RESOURCES.md). The short version: the official [guide](https://data-star.dev/guide/getting_started), the [attribute reference](https://data-star.dev/reference/attributes), the [examples](https://data-star.dev/examples), and the [Discord](https://discord.gg/bnRNgZjgPh) for questions.

## Credits

- `public/vendor/datastar-1.0.2.js` is the unmodified Datastar v1.0.2 client from [starfederation/datastar](https://github.com/starfederation/datastar), MIT licensed. The server SDK is [`@starfederation/datastar-sdk`](https://github.com/starfederation/datastar-typescript), also MIT.
- Pixel fonts: [Press Start 2P](https://github.com/fontsource/font-files/tree/main/fonts/google/press-start-2p) and [VT323](https://github.com/fontsource/font-files/tree/main/fonts/google/vt323), both SIL Open Font License 1.1, installed from npm via Fontsource and served locally.
