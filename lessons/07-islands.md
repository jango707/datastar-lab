# Lesson 7 — Where Datastar stops

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/islands> |
| **Code** | [`src/demos/07-islands.tsx`](../src/demos/07-islands.tsx), [`src/islands/paint.ts`](../src/islands/paint.ts), the `/islands/:name` route in [`src/server.tsx`](../src/server.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | Telling an expression from a program, checking for a plugin first, and wiring a small TypeScript "island" to Datastar with two one-way connections |

---

## The idea

**Attributes hold expressions, never programs.** A short `data-*` expression (`$count++`, `$open = !$open`, `@post(...)`) is what Datastar is for. Once an attribute starts creating timers, managing listeners, keeping ids for cleanup or calling browser APIs, it has become a program. Programs inside attributes can't be type-checked, linted or tested.

When you hit that line, ask two questions in order:

1. **Does Datastar already have a plugin for this?** (timers → `data-on-interval`, visibility → `data-on-intersect`, …)
2. If not, write an **island**: a small, ordinary TypeScript module that owns the one thing Datastar can't do, connected to the page by two one-way links:

```text
signals ──data-attr:*──▶ attributes on the element ──read by──▶ island
island  ──CustomEvent──▶ data-on:<event> on the element ──writes──▶ signals
```

## Before you start

Open the **Live signals** panel (right-hand column on wide screens). You'll watch the island's events turn into signals.

---

## Step 1 — Two stopwatches

Start and stop both. They behave the same.

```html
<!-- ✗ a program in an attribute -->
<button data-on:click="$swRunning ? (clearInterval($swTimer), $swRunning = false)
                                  : ($swTimer = setInterval(() => …, 100), $swRunning = true)">

<!-- ✓ a plugin + an expression (simplified) -->
<div data-on-interval__duration.100ms="$sw2Running && ($sw2Elapsed += 0.1)">
  <button data-on:click="$sw2Running = !$sw2Running">Start</button>
```

**Breakdown:**
- The broken one **works**, and that's the trap. Look at the Live signals panel: `swTimer` holds a browser timer id, and since it doesn't start with `_`, **it's sent to the server with every request** from this page. Nobody can test that attribute, and its cleanup depends on a number living in global state.
- The fixed one uses `data-on-interval`, a Datastar plugin. The attribute is a single expression, and Datastar owns the timer.

## Step 2 — An island: pixel paint

Pick a colour, change the brush size, draw on the canvas, then press **Save** and **Clear**.

```html
<canvas data-island="paint"
        data-attr:data-pen-color="$penColor"
        data-attr:data-pen-size="$penSize"
        data-attr:data-clear-token="$clearToken"
        data-on:paint-change="$strokeCount = evt.detail.strokes; $pixelCount = evt.detail.pixels"></canvas>
<script type="module" src="/islands/paint.js"></script>
```

```ts
// src/islands/paint.ts (excerpts)
ctx.fillStyle = canvas.dataset.penColor;                    // read what Datastar wrote
canvas.dispatchEvent(new CustomEvent('paint-change',        // tell Datastar what happened
  { detail: { strokes, pixels } }));
new MutationObserver(clear).observe(canvas,                 // react to Clear
  { attributes: true, attributeFilter: ['data-clear-token'] });
```

**Breakdown:**
- **Datastar → island:** the colour buttons, the size slider and **Clear** only change *signals*. `data-attr:*` copies those signals onto the canvas as `data-pen-color`, `data-pen-size` and `data-clear-token`. The island reads them when it paints and watches `data-clear-token` to know when to clear.
- **Island → Datastar:** after each stroke, the island dispatches a `paint-change` event. `data-on:paint-change` copies `evt.detail` into `$strokeCount` and `$pixelCount`, which show up in the readout and the inspector.
- **Save** is an ordinary `@post`. The server receives the counts as plain signals. The picture itself stays inside the island, because only the island knows about pixels.
- There are no globals, no `window.something`, and no shared state. Either side can be changed without breaking the other, as long as the attribute names and the event name stay the same.
- The island is TypeScript in `src/islands/`. The server transpiles it on request (`/islands/paint.js`), and only this page loads it.
- The canvas is 32×20 real pixels, scaled up with `image-rendering: pixelated`. That's why it looks like pixel art.

---

## Break it

Change **one thing**, refresh, observe, undo.

1. **Unplug the island.** Delete the `<script type="module" src="/islands/paint.js">` line. → Drawing does nothing. The colour buttons, the slider and Clear still change their signals (watch the inspector), because those parts are pure Datastar. Save stays disabled, though: nothing reports pixels any more, so `$pixelCount` never leaves 0.
2. **Cut the Datastar → island wire.** In `src/islands/paint.ts`, delete the `new MutationObserver(...)` line. → **Clear** does nothing visible. `$clearToken` still goes up (watch the inspector), but the island isn't watching any more, so the canvas and the counts stay as they are.
3. **Cut the island → Datastar wire.** Rename the event in the island to `'paint-changed'`. → You can draw, but the stroke and pixel counts stay at 0 and Save stays disabled.
4. **Hide the timer id.** Rename the broken stopwatch's `swTimer` to `_swTimer` (in `data-signals` and the expression). → It no longer travels to the server, which is better. It's still a program in an attribute, though.

## Check yourself

<details>
<summary>What's the difference between an expression and a program in an attribute?</summary>

An expression computes or assigns something in one go. A program sets up ongoing behaviour: timers, listeners, cleanup, browser APIs. Programs belong in islands, where they can be type-checked and tested.
</details>

<details>
<summary>How does Datastar talk to an island, and how does the island answer?</summary>

Datastar → island: `data-attr:*` writes signals onto the element as attributes, and the island reads or observes them. Island → Datastar: a `CustomEvent` on the element, caught by `data-on:<event>`, which writes signals from `evt.detail`.
</details>

<details>
<summary>What should you check before writing an island?</summary>

Whether a Datastar plugin already does it (`data-on-interval`, `data-on-intersect`, …).
</details>

## Official docs for this lesson

- Guide: [Datastar expressions](https://data-star.dev/guide/datastar_expressions) · [The Tao of Datastar](https://data-star.dev/guide/the_tao_of_datastar)
- Reference: [`data-on-interval`](https://data-star.dev/reference/attributes#data-on-interval) · [`data-attr`](https://data-star.dev/reference/attributes#data-attr) · [`data-on`](https://data-star.dev/reference/attributes#data-on) · [Security (expressions)](https://data-star.dev/reference/security)
- Web platform: [Using data attributes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Done!** Go back to [Lesson 0](00-under-the-hood.md) and run the loop again. Every box should now make sense.
