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
Each row was reproduced in a browser. "Proof" = where a human can see it.

| Behaviour | Do this | Proof |
|---|---|---|
| HTML lowercases attribute names: `data-bind:userName` binds `$username` | `data-bind="userName"` (value form); kebab keys elsewhere (`data-computed:email-ok` → `$emailOk`) | L1 demo 5 |
| Hono JSX renders a valueless attribute as `="true"`; key-form `data-bind:x="true"` throws `KeyAndValueProvided` | Write `=""` for valueless key-form attributes | L1 Break it #5 |
| `data-attr:X="expr"`: `false` removes X; `true` sets `X=""` | ARIA booleans: `data-attr:aria-expanded="$open ? 'true' : 'false'"` | L1 demo 2, Break it #3 |
| Unknown signal in an expression evaluates empty, no console error | Check the signals inspector when output is blank | L1 Break it #2 |
| `data-bind` preserves the initial signal's type (number stays number) | Seed numeric fields with numbers; strings + `+` concatenate | L1 demo 4, Break it #4 |
| Two classes setting the same property: stylesheet order wins, not the signal | Toggle both exclusively: `data-class="{'a': $x, 'b': !$x}"`; no static competitor | L1 demo 6 |
| A computed reading a computed declared **later** on the same element: works on initial page load, **stuck forever** when the markup arrives via a patch | Declare computeds in dependency order; derive displayed values from base signals | L2 demo 4 |
| Non-2xx responses are not applied (body ignored) | Return expected errors as 200 + error fragment | L2 demo 3 |
| Fragment whose top-level id has no match: nothing applied; console warns `PatchElementsNoTargetsFound` | Keep every version of a fragment on the same id | L2 Break it #1 |
| `data-indicator` only tracks fetches fired by its own element's `data-on:*` | On a submit flow, put it on the `<form>` | L2 demo 1–2, Break it #2 |
| `@get` sends all signals as `?datastar=<json>`; `@post` sends them as JSON body; signals matching `/(^_\|\._)/` are never sent | Prefix browser-only state with `_` | L2 demo 3 response, Break it #3 |
| Indicator signals are sent too (they flip to `true` before the request leaves) | Don't treat the received payload as "just this form" | L2 demo 3 response |
| Signals persist after the element that declared them is removed | Don't rely on removal to reset state | L2 demo 1 + network log |
| `{contentType: 'form'}` sends the closest form's fields, no signals; server reads with `c.req.parseBody()` | Use for classic `name=` forms | L2 demo 1, Break it #4 |
| Requests carry `Datastar-Request: true` | Branch server error handling on it | Client source (`public/vendor/datastar-1.0.2.js`); visible in DevTools request headers |

## Not yet verified here (do not teach as fact)
- `requestCancellation: 'auto'` behaviour (docs: aborts an in-flight request with the same method + URL). Planned for Lesson 4.
- Redirect via `text/javascript` response vs following a 302. Planned for Lesson 4.
- SSE keepalive / long-lived stream behaviour. Planned for Lesson 6.
