# Lesson 6 — Live updates

> 👤 **For humans.** A step-by-step walkthrough to read alongside the running page.
> *(AI agents: your instructions are in [`AGENTS.md`](../AGENTS.md) and [`ai/`](../ai/), not here.)*

| | |
|---|---|
| **Page** | <http://localhost:4321/lessons/live> |
| **Code** | [`src/demos/06-live.tsx`](../src/demos/06-live.tsx) |
| **Time** | ~40 minutes |
| **You'll learn** | Polling with `data-on-interval`, push with `data-init` + a long-lived stream (`keepalive`), broadcasting to every open tab, heartbeats, and what happens when a connection drops |

---

## The idea

There are two ways to keep a page fresh:

| | Polling | Push |
|---|---|---|
| Who starts it | the browser, again and again | the browser, **once** |
| Requests | one per tick | one, kept open |
| Delay before you see a change | up to one interval | as soon as the server sends it |
| Server effort | answer every tick, even when nothing changed | hold a connection, send only real changes |

Both are useful. Polling is simplest; push is better when changes are frequent or need to show up immediately.

## Before you start

Open DevTools → **Network**. Then open this same page in a **second tab** for Step 3.

---

## Step 1 — Polling

```html
<div data-signals='{"polling": true, "pollCount": 0}'
     data-on-interval__duration.2s="$polling && @get('/lessons/live/poll')">
```

**Try it:** watch Network fill with a new `poll` request every 2 seconds. Click **Pause** and they stop. **Resume** starts them again.

**Breakdown:**
- `data-on-interval` runs its expression on a timer. `__duration.2s` sets the timer.
- `$polling && @get(...)`: the `&&` means the action only runs while `$polling` is true. Pausing is just a signal.
- Each answer is a tiny SSE response that patches `pollCount` and `pollTime`.

## Step 2 — Push: one request, many updates

```html
<div data-indicator="clockLive" data-init="@get('/lessons/live/clock')">
  <div id="clock">--:--:--</div>
```

```ts
return ServerSentEventGenerator.stream((sse) => {
  timer = setInterval(() => sse.patchElements('<div id="clock">' + now() + '</div>'), 1000);
}, { keepalive: true, onAbort: () => clearInterval(timer) });
```

**Try it:** the clock ticks every second, yet Network shows **one** `clock` request that never finishes.

**Breakdown:**
- `data-init` runs once, when the element is set up (here, on page load). So the request opens as soon as the page loads.
- `keepalive: true` tells the SDK **not** to close the response when the start function returns. Without it, the stream would close right after setting up the timer.
- `onAbort` runs when the tab closes or navigates away. That's where the timer is stopped; otherwise it would keep running on the server forever.
- `data-indicator="clockLive"` is true **for as long as the request is open**, so it doubles as a "connected" light. It sits **before** `data-init` because attributes are applied in order, and the indicator has to be listening before the request starts (see *attribute evaluation order* in the docs).

## Step 3 — A room shared by every tab

With this page open in two tabs, press **+1** in one of them.

```ts
// GET /room — every tab subscribes through its own open stream
roomSubscribers.add((payload) => sse.patchSignals(payload));

// POST /room/bump — any tab
roomCount += 1;
broadcastRoom();             // → patchSignals on EVERY open stream
return c.body(null, 204);    // this response has nothing to patch
```

**Breakdown:**
- The click is an ordinary `@post`. Its response is empty (`204`), and that's fine.
- The new count reaches **both** tabs through each one's open `/room` stream. The server is a tiny publish/subscribe hub: a `Set` of "send to this tab" functions.
- "Tabs connected" is just the size of that `Set`, re-sent whenever someone joins or leaves (in `onAbort`).

## Step 4 — Heartbeats, and what happens without one

The room is quiet most of the time. Bun (the server runtime) closes any connection that sends nothing for **10 seconds**. So the room stream sends a heartbeat every 5 seconds:

```ts
heartbeat = setInterval(() => sse.patchSignals('{"_heartbeat": 1}'), 5000);
```

The heartbeat signal starts with `_`, so it never gets sent back to the server.

**What happens without it** (*Break it #1*, tested against the real lab): about 10 seconds after the page loads, Bun closes the stream and your terminal prints `request timed out after 10 seconds`. About a second later Datastar **reconnects automatically**, opening a new `/room` request, and this repeats roughly every 11 seconds. The LIVE light never goes off, so the page looks fine. The only signs are a growing list of `room` requests in Network and the warnings in your terminal. Any broadcast sent during a reconnect gap is lost. This room recovers because every new connection gets the full current count, not just the changes since.

---

## Break it

Change **one thing** in [`src/demos/06-live.tsx`](../src/demos/06-live.tsx). **Restart `bun run dev`** after this lesson's edits: long-lived streams and hot reloading don't mix well (see the README).

1. **No heartbeat.** Set `HEARTBEAT_MS` to `60000`. → Watch Network: a new `room` request every ~11 s. Watch your terminal: `[Bun.serve]: request timed out after 10 seconds`.
2. **No keepalive.** Remove `keepalive: true` from the clock. → The stream closes right after the first tick: the clock freezes, LIVE goes off, and Datastar does **not** reconnect (a normal close isn't an error). Look at your terminal: `Controller is already closed` once a second. The server's timer leaked, because `onAbort` only runs when the *browser* goes away, not when the stream ends normally.
3. **Poll faster.** Change `__duration.2s` to `__duration.200ms`. → Ten requests a second. That's the cost of polling.

## Check yourself

<details>
<summary>How many requests does the push clock make in a minute?</summary>

One. It's opened once by `data-init` and kept open with `keepalive: true`.
</details>

<details>
<summary>How does a click in one tab update another tab?</summary>

The click is a normal POST. The server then writes to every open `/room` stream, and each tab's stream delivers the patch.
</details>

<details>
<summary>Why does an idle stream need a heartbeat?</summary>

Servers and proxies close connections that go quiet (Bun after 10 s). Datastar will reconnect, but you lose anything sent during the gap and churn connections for no reason.
</details>

## Official docs for this lesson

- Reference: [`data-on-interval`](https://data-star.dev/reference/attributes#data-on-interval) · [`data-init`](https://data-star.dev/reference/attributes#data-init) · [`data-indicator`](https://data-star.dev/reference/attributes#data-indicator) · [attribute evaluation order](https://data-star.dev/reference/attributes#attribute-evaluation-order) · [action options, including retries](https://data-star.dev/reference/actions#options)
- SDK: [TypeScript SDK](https://github.com/starfederation/datastar-typescript) (`keepalive`, `onAbort`)
- Runtime: [Bun docs](https://bun.com/docs) (search for `idleTimeout`)
- More reading: [RESOURCES.md](../RESOURCES.md)

---

**Next:** [Lesson 7 — Where Datastar stops](07-islands.md)
