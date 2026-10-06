# Resources

> 👤 **For humans.** The official documentation and further reading, grouped by what you're trying to do.
> *(AI agents: the verified rules you need are in [`ai/datastar-v1-rules.md`](ai/datastar-v1-rules.md).)*

**Version note:** this lab ships the Datastar **1.0.2** client (in `public/vendor/`). The official site documents the *latest* release, so if something in the docs doesn't match what you see here, check the version first.

---

## Official Datastar docs ([data-star.dev](https://data-star.dev))

### Start here: the guide

Read these in order. Each one is short.

| Page | Pairs with |
|---|---|
| [Getting started](https://data-star.dev/guide/getting_started) | Lesson 0 |
| [Reactive signals](https://data-star.dev/guide/reactive_signals) | Lesson 1 |
| [Datastar expressions](https://data-star.dev/guide/datastar_expressions) | Lesson 1 |
| [Backend requests](https://data-star.dev/guide/backend_requests) | Lessons 0, 2–6 |
| [The Tao of Datastar](https://data-star.dev/guide/the_tao_of_datastar) | After Lesson 2, when the "server owns the HTML" idea has clicked |

### Look things up: the reference

| Page | What's in it |
|---|---|
| [Attributes](https://data-star.dev/reference/attributes) | Every `data-*` attribute, its modifiers, [attribute casing](https://data-star.dev/reference/attributes#attribute-casing) and [evaluation order](https://data-star.dev/reference/attributes#attribute-evaluation-order). Used beyond Lesson 1: [`data-on-interval`](https://data-star.dev/reference/attributes#data-on-interval) and [`data-init`](https://data-star.dev/reference/attributes#data-init) (L6), [`data-style`](https://data-star.dev/reference/attributes#data-style) (L5), [`data-on-signal-patch`](https://data-star.dev/reference/attributes#data-on-signal-patch) (L0) |
| [Actions](https://data-star.dev/reference/actions) | `@get`/`@post`/…, [options](https://data-star.dev/reference/actions#options), [response handling](https://data-star.dev/reference/actions#response-handling), [request cancellation](https://data-star.dev/reference/actions#request-cancellation) |
| [SSE events](https://data-star.dev/reference/sse_events) | The wire format: [`datastar-patch-elements`](https://data-star.dev/reference/sse_events#datastar-patch-elements) and [`datastar-patch-signals`](https://data-star.dev/reference/sse_events#datastar-patch-signals) |
| [SDKs](https://data-star.dev/reference/sdks) | Server SDKs for every language, including the TypeScript one used here |
| [Security](https://data-star.dev/reference/security) | Expressions, escaping, and Content Security Policy |

### See it done: examples and how-tos

- [Examples](https://data-star.dev/examples): small, complete patterns. Several match this lab's demos: [click to edit](https://data-star.dev/examples/click_to_edit) and [inline validation](https://data-star.dev/examples/inline_validation) (Lesson 2), [active search](https://data-star.dev/examples/active_search) (Lesson 3), [infinite scroll](https://data-star.dev/examples/infinite_scroll) and [bulk update](https://data-star.dev/examples/bulk_update).
- [How-tos](https://data-star.dev/how_tos): task-focused recipes.
- [Essays](https://data-star.dev/essays) and [videos](https://data-star.dev/videos): the reasoning behind the design.

### When something breaks

The console errors link straight to an explanation page, for example:
- [`KeyAndValueProvided`](https://data-star.dev/errors/key_and_value_provided) (Lesson 1, *Break it #5*)
- [`PatchElementsNoTargetsFound`](https://data-star.dev/errors/patch_elements_no_targets_found) (Lesson 2, *Break it #1*)

### Source and community

- [github.com/starfederation/datastar](https://github.com/starfederation/datastar): the client (MIT)
- [github.com/starfederation/datastar-typescript](https://github.com/starfederation/datastar-typescript): the TypeScript server SDK (MIT), published on npm as [`@starfederation/datastar-sdk`](https://www.npmjs.com/package/@starfederation/datastar-sdk)
- [Discord](https://discord.gg/bnRNgZjgPh): the most active place to ask questions
- [YouTube](https://www.youtube.com/@data-star)

---

## The rest of this repo's stack

| Tool | Read |
|---|---|
| **Hono** (server + routing) | [Docs home](https://hono.dev/docs/) · [Hono on Bun](https://hono.dev/docs/getting-started/bun) · [Request API, including `parseBody`](https://hono.dev/docs/api/request) · [Error handling (`app.onError`)](https://hono.dev/docs/api/hono#error-handling) |
| **Hono JSX** (server-rendered HTML) | [JSX guide](https://hono.dev/docs/guides/jsx) · [JSX Renderer middleware](https://hono.dev/docs/middleware/builtin/jsx-renderer) (what `c.render` uses) |
| **Bun** (runtime) | [Docs](https://bun.com/docs) · [Installation](https://bun.com/docs/installation) |

## Web platform background

Each of these explains a "why" behind one of the gotchas:

- [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events): the transport behind Lessons 3–6
- [Using data attributes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes)
- [HTML spec: attribute names are lowercased while parsing](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inattrname): the reason behind Lesson 1, Step 6
- [The CSS cascade (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Cascade): the reason behind Lesson 1, Step 7
- [`aria-expanded` (MDN)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded): the reason behind Lesson 1, *Break it #3*
- [HTTP status codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status): background for Lesson 2, Step 4

## Going wider

- [*Hypermedia Systems*](https://hypermedia.systems/): free online book on the "server sends HTML" way of building apps. It uses htmx, but the ideas carry straight over to Datastar.
