# Lesson 0 — Under the hood

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/under-the-hood> (also what <http://localhost:4321> opens) |
| **Code** | [`src/demos/00-under-the-hood.tsx`](../src/demos/00-under-the-hood.tsx) |
| **Time** | ~20 minutes |
| **You'll learn** | The whole loop at once: what the browser sends, what the server sees, what travels back, and what Datastar does with it. Every later lesson zooms in on one box. |

---

## The idea

Datastar is a **loop between the browser and your server**. There's no client-side app, no router and no JSON API, just four steps:

```text
 ① your page ──── request (signals) ───▶ ② your server
      ▲                                      │
      │                                      ▼
 ④ Datastar ◀──── events (HTML, signals) ─── ③ the response
```

The page draws this loop as four boxes joined by three pixel arrows (① → ② → ③ → ④; the way back to ① is you pressing **Send** again). When you press **Send**, the box that's currently active lights up, and every panel fills with the **real** data from that step, not a mock-up.

## Before you start

Leave **Slow motion** ticked. It makes the server wait about 0.7 seconds between steps so you can follow the light. Without it, the whole loop takes a few milliseconds.

---

## Step 1 — Before anything is sent

Look at box ①. The panel **"What Datastar will send"** is live. Type in **Your name** and watch it change.

**Breakdown:**
- When the page loaded, the Datastar script walked the page looking for `data-*` attributes and set each one up. It also watches for new ones arriving later (using a `MutationObserver`). That's how patched-in HTML comes alive.
- `data-signals` put `hoodName`, `hoodSlow` and the rest into **one store**. `data-bind` keeps the input and `$hoodName` in sync.
- Signals starting with `_` (like `_hoodStage`, which drives the lights) **stay in the browser**. That's why they're missing from this panel, which uses `data-json-signals="{exclude: /^_/}"`.

## Step 2 — Press "Send with @post" and watch box ②

Box ② fills with the request **exactly as the server's handler saw it**, and lights up together with the arrow leading into it:

```text
POST /lessons/under-the-hood/echo
Datastar-Request: true
Content-Type: application/json

readSignals() found them in the JSON body:
{ "hoodName": "Ada", "hoodSlow": true, … }
```

**Breakdown:**
- `@post(...)` is an ordinary `fetch()`. Datastar doesn't use `EventSource`, which can only do GET. Using `fetch` is what lets an action POST and send its own headers.
- Every action carries `Datastar-Request: true`, so the server can tell it apart from a normal page load (Lesson 4 uses this for errors).
- The body is **every non-`_` signal**, including `hoodSending`. That's the `data-indicator` signal, which flipped to `true` just before the request left.

Now press **Send with @get**. Box ② says the signals were found in **the `?datastar=` query parameter** instead. GET requests have no body, so the signals travel in the URL.

## Step 3 — Box ③: the response is a stream

The handler calls `readSignals()`, then answers with a **`text/event-stream`**. Box ③ shows the **raw text** of each event the SDK wrote, with how many milliseconds after the request it was sent:

```text
+1410ms
event: datastar-patch-elements
data: elements <div id="hood-greeting" class="hood-target">Hello, Ada! …</div>

+2113ms
event: datastar-patch-signals
data: signals {"hoodVisits":1,"hoodReply":"Hello, Ada!"}
```

**Breakdown:**
- That's the whole protocol: an `event:` line, `data:` lines, and a blank line. Two event types do everything.
- The server can send as many events as it likes and take as long as it likes. This one sends several, with gaps.
- The diagram itself is driven by extra events (patches to `_hoodStage` and to these panels). They're left out of box ③, because logging them would mean logging the log.

## Step 4 — Box ④: Datastar applies each event as it arrives

Two things happen, each the moment its event lands:

1. **`datastar-patch-elements`**: Datastar reads `id="hood-greeting"` from the incoming HTML, finds the element with that id on the page, and **morphs** it: only the parts that changed are touched.
2. **`datastar-patch-signals`**: the JSON is **merged into the signal store**. Anything reading `$hoodVisits` or `$hoodReply` updates. The log in box ④ comes from `data-on-signal-patch`, which runs every time a patch is merged and receives the patch as `patch`.

With slow motion on, the greeting changes about 0.7 seconds **before** the signal log does. They're two separate events, and each is applied on arrival, without waiting for the response to finish.

---

## The parts, named

| You saw | It's called | Deep dive |
|---|---|---|
| `data-signals`, `data-bind`, `$name` | signals and expressions | Lesson 1 |
| `@post` / `@get` | actions | Lesson 2 |
| `readSignals`, `text/event-stream`, the two event types | the SDK and the SSE protocol | Lesson 3 |
| `Datastar-Request: true` | how servers spot Datastar requests | Lesson 4 |
| events spaced out over one response | streaming | Lesson 5 |
| a response that stays open | long-lived streams | Lesson 6 |
| the bits Datastar doesn't do | islands | Lesson 7 |

## Break it

Change **one thing** in [`src/demos/00-under-the-hood.tsx`](../src/demos/00-under-the-hood.tsx), refresh, observe, undo.

1. **Make a private signal public.** Rename `_hoodStage` to `hoodStage` everywhere in the file. → It now appears in box ①'s "what will be sent" and in box ②. Every request carries the diagram's own bookkeeping to the server.
2. **Lose the target.** In the `/echo` handler, change the greeting's `id="hood-greeting"` to `id="hood-hello"`. → Box ③ still shows the event arriving, but box ④'s greeting never changes, and the console warns `PatchElementsNoTargetsFound`.
3. **Unfilter the log.** Delete the `data-on-signal-patch-filter` attribute. → The log also fills with the `_hoodStage` patches the server sends to drive the lights.

## Check yourself

<details>
<summary>Why can a Datastar action POST, when <code>EventSource</code> can only GET?</summary>

Datastar reads the stream through `fetch()`, not `EventSource`, so it can use any method and set headers.
</details>

<details>
<summary>Which signals travel to the server?</summary>

All of them except names starting with `_`. On GET (and DELETE) they go in `?datastar=`; on POST, PUT and PATCH they go in the JSON body.
</details>

<details>
<summary>How does Datastar know where to put incoming HTML?</summary>

By the `id` of each top-level element (unless the event names a `selector`). It morphs the matching element on the page.
</details>

## Official docs for this lesson

- Guide: [Getting started](https://data-star.dev/guide/getting_started) · [Backend requests](https://data-star.dev/guide/backend_requests) · [The Tao of Datastar](https://data-star.dev/guide/the_tao_of_datastar)
- Reference: [SSE events](https://data-star.dev/reference/sse_events) · [`data-json-signals`](https://data-star.dev/reference/attributes#data-json-signals) · [`data-on-signal-patch`](https://data-star.dev/reference/attributes#data-on-signal-patch) · [`@get`](https://data-star.dev/reference/actions#get) / [`@post`](https://data-star.dev/reference/actions#post)
- Background: [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 1 — Signals (no server)](01-signals.md)
