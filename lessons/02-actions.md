# Lesson 2 — Actions + swap by id

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/actions> |
| **Code** | [`src/demos/02-actions.tsx`](../src/demos/02-actions.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | `@get` / `@post`, HTML fragment responses, swap by id, `contentType: 'form'`, `readSignals`, `data-indicator`, the 2xx rule, and computed order in patched HTML |

---

## The idea

An **action** (`@get`, `@post`, `@put`, `@patch`, `@delete`) is a request to the server that you write inside an expression. The server replies with **HTML**. For each top-level element in that HTML, Datastar finds the element on the page with the **same `id`** and swaps the new version in. It does this by "morphing": updating only what actually changed rather than replacing the whole element.

That's the whole model. There's no JSON API and no templates in the browser: the server owns the HTML.

A server can answer in one of two ways:
- A **plain `text/html` response**: one patch per request. That's this lesson.
- A **Server-Sent Events (SSE) stream**: many patches over time, covered from Lesson 3 on.

## Before you start

Open DevTools → **Network**, filtered to *Fetch/XHR*, so you can watch each action's request and response.

---

## Step 1 — Click to edit: GET a fragment

```html
<div id="contact">
  <dl>…Ada Lovelace…</dl>
  <button data-on:click="@get('/lessons/actions/contact/edit')">Edit</button>
</div>
```

**Try it:** click **Edit**.

1. Network shows `GET /lessons/actions/contact/edit?datastar=…`.
2. The response is a `<div id="contact">` containing a form.
3. The `#contact` already on the page is replaced by it. **The URL doesn't change.**

**Breakdown:**
- Look at the request URL: `@get` sends **every signal on the page** as JSON in the `datastar` query parameter. POST, PUT and PATCH send them in the body instead.
- Look at the request headers: `Datastar-Request: true`. That's how a server tells a Datastar action apart from a normal page load.
- The view and the edit form **share one id**, so each one replaces the other. Cancel works the same way: it GETs the view fragment back.

## Step 2 — Saving: POST a form, see the in-flight state

```html
<form data-on:submit="@post('/lessons/actions/contact', {contentType: 'form'})"
      data-indicator="contactSaving">
  <input name="name" …> <input name="email" …>
  <button type="submit" data-attr:disabled="$contactSaving">
    <span data-text="$contactSaving ? 'Saving…' : 'Save'">Save</span>
  </button>
</form>
```

**Try it:** clear the email field and Save. An error appears **inside the form**. Fix the email and Save again: you're back in view mode with the new values. Reload the page and the values are still there, because the server keeps them in memory. Restarting the server resets them.

**Breakdown:**
- `{contentType: 'form'}` sends the form's **fields** (`name=…&email=…`) instead of the signals. The server reads them with `c.req.parseBody()`.
- `data-on:submit` stops the browser's normal form submission for you, so the page doesn't navigate.
- `data-indicator="contactSaving"` makes `$contactSaving` true **while this element's request is in progress**. The button disables itself and its label changes. The server waits 600 ms on purpose so you can see it.
- The error response is the edit form again, with a message, **sent with status 200**. Step 4 shows why that matters.

## Step 3 — Inline validation: POST the signals

```html
<form data-signals='{"signupName":"","signupEmail":""}'
      data-on:submit="@post('/lessons/actions/validate')"
      data-indicator="validateSending">
  <input data-bind="signupName"> <input data-bind="signupEmail">
  <button type="submit">Sign up</button>
</form>
<div id="validate-result"></div>
```

**Try it:** submit `G` / `nope`, read the errors, then submit `Grace` / `grace@navy.mil`.

**Breakdown:**
- With no `contentType`, `@post` sends **every signal** as a JSON body. The server reads it with `ServerSentEventGenerator.readSignals(c.req.raw)`, which returns `{ success, signals }`.
- The page ships an **empty placeholder**, `<div id="validate-result">`, and the response fills it.
- Read the "The server received" block in the response. It includes `validateSending: true`: the indicator signal itself was sent, because it flipped to true just before the request left. If you opened the contact editor first, you'll also see `contactSaving`. **A signal stays in the store after the element that created it is gone.**
- Signals whose names start with `_` are **never sent** (see *Break it #3*).

## Step 4 — Break it on purpose: 200 vs 422

Both buttons get **the same fragment** back (the same `<div id="status-result">` component). Only the status code differs; the number inside the text just echoes it.

**Try it:** click **Respond 422**. Nothing changes. The Network tab shows the response body containing the HTML, and the console shows `Failed to load resource: … 422`. Now click **Respond 200**, and the fragment is swapped in.

**Why it matters:** Datastar only applies responses with a **2xx status**. If you return a validation error as a 4xx with a helpful message, the user sees nothing, and any busy flag you set by hand stays stuck on. So send expected errors (like validation) with **status 200**. For unexpected errors, send a 200 that shows a visible error message (Lesson 4 builds this).

## Step 5 — Gotcha: computed order in patched HTML

**Try it:** click **Load the calculator from the server**, then click **base + 1** a few times. `$chainEarly` stays stuck on `0`, while the other two update.

```html
<div data-signals='{"chainBase":10}'
     data-computed:chain-early="$chainDoubled * 2"      ← reads chainDoubled…
     data-computed:chain-doubled="$chainBase * 2"       ← …which is declared AFTER it
     data-computed:chain-ordered="$chainDoubled * 2"    ← declared after: fine
     data-computed:chain-inline="$chainBase * 4">       ← base signals only: always fine
```

**Breakdown:** a computed signal that reads another computed signal **declared after it** never starts tracking it. Oddly, **on a first page load Datastar 1.0.2 copes**. It only breaks when the same HTML arrives later in a patch. That's the worst kind of bug: everything works until the HTML is delivered a different way.

**Rule:** declare computed signals in dependency order. The safest option is to make every *displayed* computed read only base signals, as `chain-inline` does.

---

## Break it

Each exercise changes **one thing** in [`src/demos/02-actions.tsx`](../src/demos/02-actions.tsx) (#5 copies markup into Lesson 1's `src/demos/01-signals.tsx`). Refresh the browser after saving. Undo each change before starting the next one.

1. **Lose the target.** In `ContactView`, change `id="contact"` to `id="contact-view"`, refresh, and click **Edit**. → Nothing happens. The console warns `PatchElementsNoTargetsFound`: the edit form's `#contact` has nowhere to go.
2. **Put the indicator on the wrong element.** Move `data-indicator="contactSaving"` from the `<form>` to the Save `<button>`. → Saving never shows "Saving…" and the button never disables. `data-indicator` only tracks requests started by **its own element's** `data-on:*`, and here that's the form's submit.
3. **Keep a signal private.** Rename `signupName` to `_signupName` in both `data-signals` and `data-bind`. → It disappears from "The server received", and the server now says the name is missing. Signals starting with `_` stay in the browser.
4. **Forget the content type.** Remove `{contentType: 'form'}` from the Save action. → The server receives signals as JSON instead of form fields, `parseBody()` comes back empty, and Save always says "Name is required".
5. **See it work on first load.** Copy the inner `<div>` of `ChainCalculator` into Lesson 1's page and reload. → `$chainEarly` updates there. Same markup, delivered differently, different result.

## Check yourself

<details>
<summary>How does Datastar decide where a response goes?</summary>

By the `id` of each top-level element in the response. It swaps the new version into the element on the page with the same id.
</details>

<details>
<summary>Why send a validation error with status 200?</summary>

Datastar ignores non-2xx responses, so a 4xx error message would never be shown.
</details>

<details>
<summary>What's the difference between <code>@post(url)</code> and <code>@post(url, {contentType: 'form'})</code>?</summary>

The first sends every signal (except `_`-prefixed ones) as JSON. The second sends the form's fields, form-encoded, and no signals.
</details>

<details>
<summary>Where does <code>data-indicator</code> go on a form?</summary>

On the `<form>`, because its `data-on:submit` is what starts the request.
</details>

## Official docs for this lesson

- Guide: [Backend requests](https://data-star.dev/guide/backend_requests), especially [sending signals](https://data-star.dev/guide/backend_requests#sending-signals), [reading signals](https://data-star.dev/guide/backend_requests#reading-signals) and [`data-indicator`](https://data-star.dev/guide/backend_requests#data-indicator)
- Reference: [`@get`](https://data-star.dev/reference/actions#get) · [`@post`](https://data-star.dev/reference/actions#post) · [action options (`contentType`, signal filtering)](https://data-star.dev/reference/actions#options) · [response handling](https://data-star.dev/reference/actions#response-handling) · [request cancellation](https://data-star.dev/reference/actions#request-cancellation) · [`data-indicator`](https://data-star.dev/reference/attributes#data-indicator) · [attribute evaluation order](https://data-star.dev/reference/attributes#attribute-evaluation-order) (Step 5)
- Official versions of these demos: [Click to edit](https://data-star.dev/examples/click_to_edit) · [Inline validation](https://data-star.dev/examples/inline_validation)
- Server side: [TypeScript SDK](https://github.com/starfederation/datastar-typescript) (`readSignals`) · [Hono `parseBody`](https://hono.dev/docs/api/request)
- Error explained: [`PatchElementsNoTargetsFound`](https://data-star.dev/errors/patch_elements_no_targets_found) (*Break it #1*)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 3 — Server reads signals](03-server-signals.md). The server streams patches back over SSE, including patches to signals.
