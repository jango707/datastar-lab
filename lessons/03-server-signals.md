# Lesson 3 — Server reads signals

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/server-signals> |
| **Code** | [`src/demos/03-server-signals.tsx`](../src/demos/03-server-signals.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | SSE responses, `readSignals` on GET, `patchElements` + `patchSignals` in one response, `__debounce`, patch modes (`append` / `prepend` / `inner` / remove), what the raw stream looks like |

---

## The idea

In Lesson 2 the server answered with **one HTML fragment**. Now it answers with a **Server-Sent Events (SSE) stream**: a `text/event-stream` response made of separate events. Datastar understands two kinds of event:

| Event | Carries | Server call (TypeScript SDK) |
|---|---|---|
| `datastar-patch-elements` | HTML to swap in | `sse.patchElements(html, { selector?, mode? })` |
| `datastar-patch-signals` | JSON to merge into the signal store | `sse.patchSignals(JSON.stringify({...}))` |

One response can send as many of these as it likes, in any order. In this lesson every response is still short; Lesson 5 keeps them open.

## Before you start

Open DevTools → **Network**. Click any request whose type is `eventsource` or `fetch`, then open its **Response** tab. That's where you'll see the raw events.

---

## Step 1 — Look at a raw stream first

In a terminal, while `bun run dev` is running:

```bash
curl 'http://localhost:4321/lessons/server-signals/search?datastar=%7B%22q%22%3A%22script%22%7D'
```

You'll get something like:

```text
event: datastar-patch-elements
data: elements <ul id="search-results" class="results"><li>CoffeeScript</li>…</ul>

event: datastar-patch-signals
data: signals {"resultCount":5}
```

**Breakdown:** it's plain text. Each event is an `event:` line, one or more `data:` lines, and a blank line. The `?datastar=` part is the page's signals, URL-encoded JSON. That's how a GET action sends them.

## Step 2 — Active search

```html
<div data-signals='{"q":"","resultCount":51}'>
  <input data-bind="q"
         data-on:input__debounce.300ms="@get('/lessons/server-signals/search')"
         data-indicator="searching">
  <span data-text="$searching ? 'Searching…' : $resultCount + ' of 51 languages'"></span>
  <ul id="search-results">…</ul>
</div>
```

**Try it:** type `script` quickly. Then try `zzz`, then clear the box.

**Breakdown:**
- `__debounce.300ms` is a **modifier**: the action runs only after you've stopped typing for 300 ms. Type `s`, `c`, `r` quickly and the Network tab shows **one** request, not three.
- The server reads `$q` with `ServerSentEventGenerator.readSignals(c.req.raw)`. For a GET, it parses the `datastar` query parameter.
- The **same response** patches the `<ul id="search-results">` (HTML, swapped by id) **and** `$resultCount` (a signal). The readout updates from the signal, not from counting `<li>`s.
- `data-indicator="searching"` shows "Searching…" while the request is in progress.

> **Side note (Hono JSX):** JSX attribute names can't contain a `.`, so `data-on:input__debounce.300ms` is passed with a spread: `{...{ 'data-on:input__debounce.300ms': "…" }}`. The HTML that reaches the browser is the same.

## Step 3 — The server writes signals

**Try it:** pick a number of dice and click **Roll**.

**Breakdown:**
- The response is **only** a `datastar-patch-signals` event: no HTML at all. Every die, the total and the roll count re-render from the new signal values.
- `$diceWanted` comes from a `<select data-bind>`. It was seeded with the number `3`, so `data-bind` sends a number back (Lesson 1, Step 5).
- The roll count lives **on the server** (`totalRolls`). Reload the page and roll again: it keeps counting. The server is the source of truth, and the page only shows it.
- Why is `dice` seeded as `[0, 0, 0, 0, 0]` with a separate `diceCount`, instead of `[]`? See *Break it #2*. It's a real gotcha.

## Step 4 — Patch modes

**Try it:** click **Append**, **Append**, **Prepend**, **Remove first**, **Replace all**, then **Remove first** again.

| Button | Server call | Effect on `<ol id="log">` |
|---|---|---|
| Append | `patchElements('<li>…</li>', { selector: '#log', mode: 'append' })` | adds as the last child |
| Prepend | same with `mode: 'prepend'` | adds as the first child |
| Replace all | same with `mode: 'inner'` | replaces all the children |
| Remove first | `removeElements('#log > li:first-child')` | removes the matching element |

**Breakdown:** without `selector`, Datastar matches each top-level element by **id** and morphs it (mode `outer`). That's what Lesson 2 did. With `selector`, you choose the target, and `mode` chooses how to apply the patch. The appended `<li>`s don't need ids at all.

---

## Break it

Change **one thing** in [`src/demos/03-server-signals.tsx`](../src/demos/03-server-signals.tsx), refresh, observe, undo.

1. **Remove the debounce.** Change `data-on:input__debounce.300ms` to `data-on:input`. → Type `script` and Network shows a request **per keystroke**.
2. **Read a signal that isn't there.** Change the dice seed back to `dice: []` and the dice to `data-show={`$dice.length > ${i}`}`. → Before you've rolled, `$dice` has become `["","","","",""]` and five empty dice are showing. **Reading a missing signal path creates it as `""`.** `data-text="$dice[4]"` padded the array. The padded array is also sent to the server with every request (look at the `?datastar=` parameter in Network).
3. **Forget the id.** In `Results`, remove `id="search-results"`. → Searching updates the count but never the list, and the console warns `PatchElementsNoTargetsFound`.
4. **Remove from an empty list.** Click **Remove first** until the list is empty, then once more. → Nothing happens on the page, and the console warns `PatchElementsNoTargetsFound`. A remove with no match isn't an error the user sees.

## Check yourself

<details>
<summary>What are the two event types Datastar understands?</summary>

`datastar-patch-elements` (HTML) and `datastar-patch-signals` (JSON merged into the signal store).
</details>

<details>
<summary>How does a GET action send signals, and how does the server read them?</summary>

As URL-encoded JSON in the `datastar` query parameter. `ServerSentEventGenerator.readSignals(request)` parses it (for POST, it reads the JSON body instead).
</details>

<details>
<summary>When do you need <code>selector</code> + <code>mode</code>?</summary>

When you're not replacing an element by its own id: adding to a list (`append`/`prepend`), replacing children (`inner`), or targeting something without an id.
</details>

<details>
<summary>Why seed array signals at full length?</summary>

Reading `$arr[i]` past the end creates the missing entries as `""`, which changes `length` and gets sent to the server.
</details>

## Official docs for this lesson

- Guide: [Backend requests](https://data-star.dev/guide/backend_requests), especially [reading signals](https://data-star.dev/guide/backend_requests#reading-signals) and [SSE events](https://data-star.dev/guide/backend_requests#sse-events)
- Reference: [SSE events](https://data-star.dev/reference/sse_events) ([`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements), [`datastar-patch-signals`](https://data-star.dev/reference/sse_events#datastar-patch-signals)) · [`data-on` and its modifiers](https://data-star.dev/reference/attributes#data-on) · [`@get`](https://data-star.dev/reference/actions#get) · [SDKs](https://data-star.dev/reference/sdks)
- Official version of this demo: [Active search](https://data-star.dev/examples/active_search)
- Background: [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 4 — Navigation, errors, double-submit](04-navigation-errors.md)
