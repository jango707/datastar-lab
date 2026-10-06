# Lesson 5 — Streaming

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/streaming> |
| **Code** | [`src/demos/05-streaming.tsx`](../src/demos/05-streaming.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | Keeping one response open while the server sends many patches, morphing one element over and over ("fat" patches), streaming only signals, `data-style`, errors mid-stream, and `onAbort` |

---

## The idea

So far every response was over almost immediately. A **stream** is the same response, just kept open: the server sends an event, waits, sends another, and so on. Datastar applies each event **as it arrives**. That's how chat replies appear word by word, and how a progress bar fills up with no polling.

## Before you start

Open DevTools → **Network**, send a chat message, and click the `chat` request. Its response is the raw stream of events.

---

## Step 1 — A streamed chat reply

Type `how do streams work?` and press **Send**.

```html
<div id="chat-messages">…</div>
<form data-on:submit="$message.trim() && !$chatBusy && ($chatBusy = true, @post('/lessons/streaming/chat'))">
  <input data-bind="message" data-attr:disabled="$chatBusy">
```

```ts
return ServerSentEventGenerator.stream(async (sse) => {
  sse.patchElements(userBubble, { selector: '#chat-messages', mode: 'append' });
  sse.patchSignals(JSON.stringify({ message: '' }));            // clear the input
  sse.patchElements(typing, { selector: '#chat-messages', mode: 'append' });
  for (const word of words) {
    text += ' ' + word;
    sse.patchElements('<div id="asst-3" class="bubble bot">' + text + '</div>'); // same id → morphed
    await sleep(70);
  }
  sse.patchSignals(JSON.stringify({ chatBusy: false }));        // re-enable the input
});
```

**Breakdown:**
- The `data-on:submit` expression does three things in order: it refuses empty or duplicate sends, sets `$chatBusy = true` **immediately** (so the input disables before the server even hears about it), then posts.
- One response sends many events: your bubble (append), clearing `$message`, a typing indicator (append), then **the whole bot bubble again for every word**. Because it always has the same `id`, Datastar morphs it in place, so it seems to grow.
- Sending the **whole** bubble each time ("fat" patches) is simpler than sending only the new word: the server always sends the full truth and never has to work out a diff.
- The typing indicator is removed when the first word arrives (`removeElements('#typing-3')`).
- The **last** event releases `$chatBusy`. A stream must always end by un-busying the page.

## Step 2 — An error halfway through

Send a message containing the word **fail**.

**Breakdown:** a few words arrive, then an error bubble appears and the input re-enables. Why not use the app's error handler from Lesson 4? Because this response has **already started**: its status (200) and its first events are gone. Once a stream is open, the only way to report a problem is through the stream itself: append an error bubble, then release the busy signal.

## Step 3 — A progress stream (signals only)

Click **Start job**.

```html
<div class="bar-fill" data-style:width="$progress + '%'"></div>
```

```ts
return ServerSentEventGenerator.stream(async (sse) => {
  for (let p = 5; p <= 100; p += 5) {
    await sleep(150);
    if (aborted) return;                               // nobody is listening any more
    sse.patchSignals(JSON.stringify({ progress: p }));
  }
}, {
  onAbort: () => { aborted = true; jobsAborted += 1; },
  onError: () => {},
});
```

**Breakdown:**
- This stream sends **no HTML at all**, just 20 signal patches. `data-style:width` turns `$progress` into a CSS width, and `data-text` shows the status.

## Step 4 — Restart mid-way

Start the job, and while it's running click **Restart job**.

**Breakdown:**
- The second click is the same method and URL from the same button, so Datastar **cancels the first request** (the Network tab shows it as cancelled) and starts a new one.
- On the server, the cancelled stream's `onAbort` runs. It stops that loop and counts the abort, and the new stream reports the count: *streams the server saw aborted: 1*.
- Without the `if (aborted) return`, the old loop would keep running for nobody, and its next write would throw. Always clean up in `onAbort`.

---

## Break it

Change **one thing** in [`src/demos/05-streaming.tsx`](../src/demos/05-streaming.tsx), refresh, observe, undo.

1. **Forget to un-busy.** Delete the final `sse.patchSignals(JSON.stringify({ chatBusy: false }))`. → After one reply the input stays disabled for good.
2. **Leave the typing indicator.** Delete the `sse.removeElements(...)` line. → "Bot is typing…" stays under every finished reply.
3. **Ignore aborts.** Remove the `onAbort` option. → Restarting no longer increases "streams the server saw aborted".
4. **Slow it down.** Change `await sleep(70)` to `await sleep(400)`. → The reply crawls in one word at a time, and the `chat` request in Network stays pending until the last word.

## Check yourself

<details>
<summary>Why re-send the whole bubble on every word?</summary>

It's morphed by id, so the result looks like a growing bubble. Sending the full state each time keeps the server simple: it never has to work out what changed.
</details>

<details>
<summary>Why can't the app-wide error handler report a mid-stream failure?</summary>

The response has already started with status 200 and sent events. The only channel left is the stream, so append an error and release busy flags there.
</details>

<details>
<summary>What does <code>onAbort</code> protect you from?</summary>

Work that keeps running (and writing) after the browser has gone, whether because of a restart, a closed tab or a lost connection.
</details>

## Official docs for this lesson

- Guide: [Backend requests → SSE events](https://data-star.dev/guide/backend_requests#sse-events)
- Reference: [SSE events](https://data-star.dev/reference/sse_events) · [`data-style`](https://data-star.dev/reference/attributes#data-style) · [request cancellation](https://data-star.dev/reference/actions#request-cancellation)
- SDK: [TypeScript SDK](https://github.com/starfederation/datastar-typescript) (`stream` options `onAbort`, `onError`, `keepalive`)
- Background: [Using server-sent events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 6 — Live updates](06-live.md)
