# Lesson 4 — Navigation, errors, double-submit

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/navigation-errors> |
| **Code** | [`src/demos/04-navigation-errors.tsx`](../src/demos/04-navigation-errors.tsx), the error handler in [`src/server.tsx`](../src/server.tsx), helpers in [`src/lib/datastar.tsx`](../src/lib/datastar.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | Redirecting after an action (`text/javascript`, `executeScript`), why a 302 misleads you, one app-wide error handler that shows toasts, and guarding buttons against double-submits |

---

## The idea

Three problems every real Datastar app runs into, each with one reliable fix:

| Problem | What goes wrong | Fix |
|---|---|---|
| An action should move you to another page | A `302` doesn't navigate; Datastar receives the target page's HTML instead | Answer with JavaScript that sets `window.location` |
| Something throws | Datastar ignores non-2xx responses, so the user sees nothing | One error handler that answers **200** with a toast |
| Someone double-clicks | The browser cancels the earlier request, but **the server still runs it** | Disable the button while its request is in progress |

## Before you start

Open DevTools → **Network**, and keep an eye on your **address bar** during Step 1.

---

## Step 1 — Navigate after an action

Click each of the three buttons in turn. After each one, read the two lines under them: **"Server rendered this page for"** and **"Your address bar says"**.

```ts
// ✓ text/javascript: Datastar runs the response body
return c.body('window.location.href = "/lessons/navigation-errors?created=7"', 200,
  { 'Content-Type': 'text/javascript' });

// ✓ an SSE stream with a script event
sse.executeScript('window.location.href = "/lessons/navigation-errors?created=7"');

// ✗ a redirect
return c.redirect('/lessons/navigation-errors?created=7', 302);
```

**Breakdown:**
- **text/javascript** and **executeScript** both cause a real navigation: the page reloads, the address bar changes, and the two readouts agree.
- **302** is the trap. `fetch()` follows redirects silently, so Datastar receives the *target page's HTML* and **morphs it into the current page**. The "Created note" banner appears and it *looks* like it worked, but the address bar never changed, so the two readouts disagree. Press reload and the 302's banner is gone (on a clean URL there's no banner at all; after an earlier real navigation you'll see *that* note instead), because `?created=…&via=302` never reached the address bar. Bookmarks, back and refresh are now all lying to the user.
- The lab wraps the good version as `dsRedirect(c, url)` in `src/lib/datastar.tsx`.

## Step 2 — Errors you can see

Click **Do risky thing** in both columns.

```html
<button data-on:click="$handledBusy = true; @post('/lessons/navigation-errors/explode/handled')"
        data-attr:disabled="$handledBusy">Do risky thing</button>
<div id="toasts"></div>   <!-- in the shared layout, on every page -->
```

```ts
// src/server.tsx — one handler for the whole app
app.onError((err, c) => {
  if (c.req.header('Datastar-Request') === 'true') return dsError(err.message);
  return c.text('Something went wrong', 500);
});
```

**Breakdown:**
- **Broken:** the route answers `500` itself. Datastar ignores it, so there's no message. Worse, the button set `$naiveBusy = true` *by hand* before the request, and nothing ever sets it back. It's stuck on "Working… forever" (use **Unstick it**).
- **Fixed:** the route just `throw`s. Hono's `app.onError` catches errors from **every** route, including ones in sub-apps, and checks the `Datastar-Request` header. For Datastar requests it calls `dsError`, which answers **200** with a short SSE stream that:
  1. appends a toast to `#toasts` (`mode: 'append'`),
  2. sets the busy flags it knows about back to `false`,
  3. waits 5 seconds, then removes its own toast (`removeElements`).
- Busy flags set by `data-indicator` reset themselves. Only flags you set by hand (`$x = true`) need `dsError` to release them, which is why `KNOWN_BUSY_SIGNALS` in `src/lib/datastar.tsx` lists them.

## Step 3 — The double-submit

Click **Send (unguarded)** three times quickly, then wait. Click **Reset**, then do the same with **Send (guarded)**.

```html
<!-- ✗ -->
<button data-on:click="@post('/lessons/navigation-errors/send-email')">Send</button>

<!-- ✓ -->
<button data-on:click="@post('/lessons/navigation-errors/send-email')"
        data-indicator="sendingEmail"
        data-attr:disabled="$sendingEmail">Send</button>
```

**Breakdown:**
- **Unguarded:** "Emails sent" ends at **3**. In the Network tab, the first two requests show as cancelled. By default, a repeat of the same method + URL **aborts the earlier fetch in the browser**, but the server had already received those requests and ran them anyway. Three emails were sent.
- **Guarded:** the button disables itself while its own request is in progress, so there's only one request and **1** email.
- Every button that changes something on the server deserves this guard.

---

## Break it

Change **one thing**, refresh, observe, undo.

1. **Reload after the 302.** Open <http://localhost:4321/lessons/navigation-errors> with no query string, click the 302 button, then press the browser's reload. → The banner disappears: the address bar never contained `?created=`.
2. **Answer the error yourself.** In `/explode/handled`, replace `throw new Error(...)` with `return c.json({ error: 'nope' }, 500)`. → The fixed column now behaves like the broken one: no toast, stuck button.
3. **Remove the guard.** Delete `data-indicator="sendingEmail"` from the guarded button. → Three quick clicks now send 3 emails.
4. **Delete the error handler.** Remove the `app.onError(...)` block from `src/server.tsx`. → The fixed column breaks too: Hono's default 500 is ignored by Datastar.

## Check yourself

<details>
<summary>Why doesn't a 302 navigate?</summary>

Datastar actions use `fetch()`, which follows redirects invisibly and hands Datastar the final HTML to patch. Only a full navigation (`window.location`) changes the page and the URL.
</details>

<details>
<summary>Why does the error handler answer 200?</summary>

Datastar only applies 2xx responses. A 200 SSE response can show the toast and release busy flags; a 500 would be dropped.
</details>

<details>
<summary>If the browser cancels the first request, why was the email still sent?</summary>

Cancelling a fetch only stops the browser listening. The request had already reached the server, which ran it to completion.
</details>

## Official docs for this lesson

- Reference: [Actions → response handling](https://data-star.dev/reference/actions#response-handling) (how `text/javascript` and `text/event-stream` responses are handled) · [request cancellation](https://data-star.dev/reference/actions#request-cancellation) · [`data-indicator`](https://data-star.dev/reference/attributes#data-indicator) · [SSE events](https://data-star.dev/reference/sse_events)
- Server: [Hono error handling (`app.onError`)](https://hono.dev/docs/api/hono#error-handling) · [TypeScript SDK](https://github.com/starfederation/datastar-typescript) (`executeScript`, `removeElements`)
- Background: [HTTP status codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 5 — Streaming](05-streaming.md)
