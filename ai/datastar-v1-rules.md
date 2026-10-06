# Datastar v1 rules

> 🤖 **For AI coding agents.** Syntax rules and behaviour verified in this repo. Humans: the same material, explained, is in [`lessons/`](../lessons/).

Pre-2025 training data describes Datastar v0 and is wrong for this repo. Trust this file, then the official reference (https://data-star.dev/reference/attributes, https://data-star.dev/reference/actions, https://data-star.dev/reference/sse_events).

## Syntax (v1)
- Keys use a colon: `data-on:click`, `data-class:active`, `data-attr:disabled`, `data-computed:total-price`.
- Modifiers use double underscore: `data-on:input__debounce.300ms`.
- Plugin attribute names that contain a hyphen keep it: `data-on-interval`, `data-on-intersect`, `data-on-signal-patch`.
- SSE event types: `datastar-patch-elements`, `datastar-patch-signals`.
- Forbidden (v0 / htmx): `hx-*`, `data-on-load`, `datastar-merge-fragments`, `datastar-merge-signals`, `mergeSignals`, `mergeFragments`.
- Expressions are JS; `$name` reads/writes a signal; actions are `@get/@post/@put/@patch/@delete(url, options?)`.

## Server SDK (TypeScript)
```ts
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web'; // `/web` path

const read = await ServerSentEventGenerator.readSignals(c.req.raw); // { success: true, signals } | { success: false, error }

return ServerSentEventGenerator.stream(async (sse) => {
  sse.patchElements('<div id="x">…</div>');                         // default mode: outer, matched by id
  sse.patchElements('<li>…</li>', { selector: '#list', mode: 'append' });
  sse.patchSignals(JSON.stringify({ busy: false }));                 // JSON STRING, not an object
});
```
- One-shot responses may be plain `c.html(<Fragment/>)`; top-level elements must carry an `id` that exists on the page.

## Verified behaviour (Datastar 1.0.2 client, this lab)
Each row was reproduced in a browser on a freshly started server. "Proof" = where a human can see it.

| Behaviour | Do this | Proof |
|---|---|---|
| Actions use `fetch()`, not `EventSource` (any method, custom headers); requests carry `Datastar-Request: true` | Branch server error handling on the header | Client source; L0 box ② |
| HTML lowercases attribute names: `data-bind:userName` binds `$username` | `data-bind="userName"` (value form); kebab keys elsewhere (`data-computed:email-ok` → `$emailOk`) | L1 demo 5 |
| Hono JSX renders a valueless attribute as `="true"`; key-form `data-bind:x="true"` throws `KeyAndValueProvided` | Write `=""` | L1 Break it #5 |
| JSX can't express `.` in attribute names (`__debounce.300ms`, `__duration.2s`) | Spread: `{...{ 'data-on:input__debounce.300ms': '…' }}` | L3, L6, L7 source |
| `data-attr:X="expr"`: `false` removes X; `true` sets `X=""` | ARIA booleans: `data-attr:aria-expanded="$open ? 'true' : 'false'"` | L1 demo 2, Break it #3 |
| **Reading a missing signal creates it as `""`** (no error); reading `$arr[i]` past the end pads the array with `""`; the new values are sent to the server | Seed every signal and full-length arrays | L1 Break it #2, L3 Break it #2 |
| `data-bind` preserves the initial signal's type (number stays number; checkbox → boolean) | Seed numeric fields with numbers; strings + `+` concatenate | L1 demo 4, L3 demo 2, L0 |
| Two classes setting the same property: stylesheet order wins, not the signal | Toggle both exclusively: `data-class="{'a': $x, 'b': !$x}"` | L1 demo 6 |
| A computed reading a computed declared **later** on the element: fine on initial page load, **stuck** when the markup arrives via a patch | Declare computeds in dependency order; derive displayed values from base signals | L2 demo 4 |
| Non-2xx responses are not applied | Return expected errors as 200 + fragment | L2 demo 3 |
| Fragment whose top-level id has no match (or a `removeElements` selector with no match): nothing applied, console warns `PatchElementsNoTargetsFound` | Keep every version of a fragment on the same id | L2/L3 Break it, L0 Break it #2 |
| `data-indicator` only tracks fetches fired by its own element; on initial load it stays `true` for the whole life of a long-lived `data-init` stream | Put it on the `<form>` for submit; use it as a "connected" light | L2 Break it #2, L6 demo 2 |
| `@get` and `@delete` send signals as `?datastar=<json>`; `@post`/`@put`/`@patch` send a JSON body (`readSignals` handles both; the DELETE half is from client + SDK source, not a browser repro); signals matching `/(^_\|\._)/` are never sent; indicator signals are sent | Prefix browser-only state with `_` | L0 box ②, L2 demo 2 |
| Signals persist after the element that declared them is removed | Don't rely on removal to reset state | L2 network log |
| `{contentType: 'form'}` sends the closest form's fields, no signals | `c.req.parseBody()` on the server | L2 demo 1, Break it #4 |
| SSE: one response may mix any number of `patchElements` / `patchSignals` events; each is applied on arrival | Stream "fat" patches (whole element, same id) | L0, L3, L5 |
| `patchElements` with `selector` + `mode` (`append`/`prepend`/`inner`); `removeElements(selector)` | Use for lists and elements without ids | L3 demo 3 |
| A `302` answer to an action: `fetch` follows it, Datastar **morphs the target page's HTML into the current page**, the URL does **not** change | Navigate with `text/javascript` (`window.location.href = …`) or `sse.executeScript(…)` | L4 demo 1 |
| Repeating the same method + URL (request cancellation `auto`) aborts the earlier fetch **in the browser**; the server still runs it | Disable controls while in flight (`data-indicator` + `data-attr:disabled`) | L4 demo 3, L5 step 4 |
| Hono `app.onError` catches errors thrown in sub-apps mounted with `app.route` | One handler; for Datastar requests answer 200 SSE (toast + release busy) | L4 demo 2 |
| `stream(…, { onAbort })` runs when the browser cancels/leaves; it does **not** run when the stream ends normally | Clean up timers in `onAbort`; never leave intervals running after a normal end | L5 step 4, L6 Break it #2 |
| Without `keepalive: true`, the stream closes when the start function returns; Datastar does **not** reconnect after a normal close | Long-lived streams need `keepalive: true` | L6 Break it #2 |
| Bun closes a connection idle for 10s (`[Bun.serve]: request timed out after 10 seconds`); Datastar then retries automatically (~1s, ×2 backoff) and the indicator stays `true`; events sent in the gap are lost | Send a `_heartbeat` signal patch every ≤ 5s; send full state on (re)connect | L6 step 4 |
| An action may answer `204` with no body | Fine when the update travels through another open stream | L6 demo 3 |
| `data-on-signal-patch` receives `patch`; filter with `data-on-signal-patch-filter="{include: /…/}"`; fires for server-sent patches; its own writes don't retrigger it | Use for logs/side-panels, filtered | L0 box ④ |
| `data-json-signals="{exclude: /^_/}"` filters what it prints | Show "what will be sent" | L0 box ① |
| `data-style:width="$p + '%'"` sets an inline style | Progress bars | L5 demo 2 |

## Not yet verified here (do not teach as fact)
- `data-indicator` on elements added *after* page load with `data-init` stayed `false` in a probe (either attribute order). Unexplained; avoid relying on it for patched-in content.
