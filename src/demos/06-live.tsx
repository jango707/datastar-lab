import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals } from '../lib/signals';
import { lesson } from './index';

/**
 * Lesson 6 — Live updates.
 *
 * Two ways to keep a page fresh: the browser asks again and again (polling), or the
 * browser opens one stream and the server pushes whenever something changes. The shared
 * room shows push across tabs; its heartbeat keeps Bun's idle timeout from killing it.
 * Walkthrough: lessons/06-live.md
 */

const meta = lesson('live');
const BASE = '/lessons/live';

/** Bun closes a connection that sends nothing for 10s (Bun.serve's default idleTimeout). */
const HEARTBEAT_MS = 5000;

const timeNow = () => new Date().toLocaleTimeString('en-GB');

// ---------- Shared room: an in-memory pub/sub, one subscriber per open stream ----------

type Subscriber = (payload: string) => void;
const roomSubscribers = new Set<Subscriber>();
let roomCount = 0;

function broadcastRoom() {
  const payload = JSON.stringify({ roomCount, roomViewers: roomSubscribers.size });
  for (const send of roomSubscribers) {
    try {
      send(payload);
    } catch {
      roomSubscribers.delete(send); // that browser is gone
    }
  }
}

const CODE: Record<string, Snippet[]> = {
  poll: [
    {
      label: 'HTML — a new request every 2 seconds',
      code: `
        <div data-signals='{"polling": true, "pollCount": 0}'
             data-on-interval__duration.2s="$polling && @get('/lessons/live/poll')">`,
      marks: ['data-on-interval__duration.2s', '$polling &&'],
    },
  ],
  push: [
    {
      label: 'HTML — one request, opened on load',
      code: `
        <div data-indicator="clockLive" data-init="@get('/lessons/live/clock')">
          <div id="clock">--:--:--</div>
          <span data-text="$clockLive ? 'LIVE' : 'OFFLINE'"></span>`,
      marks: ['data-indicator="clockLive"', 'data-init'],
    },
    {
      label: 'Server (Hono) — keep the stream open, clean up on abort',
      code: `
        return ServerSentEventGenerator.stream((sse) => {
          timer = setInterval(() => sse.patchElements('<div id="clock">' + now() + '</div>'), 1000);
        }, { keepalive: true, onAbort: () => clearInterval(timer) });`,
      marks: ['keepalive: true', 'onAbort'],
    },
  ],
  room: [
    {
      label: 'Server (Hono)',
      code: `
        // GET /room — every tab opens one stream and subscribes to it
        roomSubscribers.add((payload) => sse.patchSignals(payload));
        heartbeat = setInterval(() => sse.patchSignals('{"_heartbeat": 1}'), 5000); // beat Bun's 10s idle timeout

        // POST /room/bump — from any tab
        roomCount += 1;
        broadcastRoom();              // → patchSignals on EVERY open stream
        return c.body(null, 204);     // nothing to patch in this response`,
      marks: ['roomSubscribers.add', 'heartbeat', 'broadcastRoom()', 'c.body(null, 204)'],
    },
  ],
};

export const liveDemo = new Hono();

liveDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Two ways to keep a page fresh: ask the server over and over (polling), or open one stream and let the server push when something changes."
        guide="lessons/06-live.md"
      />

      <Demo
        id="poll"
        code={CODE.poll}
        title="1. Polling"
        shows="data-on-interval fires an action every 2 seconds. Each tick is a brand-new request — watch them pile up in the Network tab."
      >
        <div
          data-signals={signals({ polling: true, pollCount: 0, pollTime: '--:--:--' })}
          // JSX attribute names can't contain a "." — modifiers like __duration.2s go through a spread.
          {...{ 'data-on-interval__duration.2s': `$polling && @get('${BASE}/poll')` }}
        >
          <p class="clock" data-text="$pollTime">--:--:--</p>
          <p class="readout">
            <span class="status" data-class="{'on': $polling}" data-text="$polling ? 'POLLING' : 'PAUSED'">POLLING</span>{' '}
            requests so far: <strong data-text="$pollCount">0</strong>
          </p>
          <div class="row">
            <button data-on:click="$polling = !$polling" data-text="$polling ? 'Pause' : 'Resume'">
              Pause
            </button>
          </div>
        </div>
      </Demo>

      <Demo
        id="push"
        code={CODE.push}
        title="2. Push: one stream, many updates"
        shows="data-init opens ONE request when the page loads. The server keeps it open and pushes the time every second."
      >
        {/* data-indicator comes BEFORE data-init: attributes run in order, and the indicator
            must exist before the fetch starts. */}
        <div data-signals={signals({ clockSeconds: 0 })} data-indicator="clockLive" data-init={`@get('${BASE}/clock')`}>
          <div id="clock" class="clock">
            --:--:--
          </div>
          <p class="readout">
            <span class="status" data-class="{'on': $clockLive}" data-text="$clockLive ? 'LIVE' : 'OFFLINE'">OFFLINE</span>{' '}
            connected for <strong data-text="$clockSeconds">0</strong>s on one request
          </p>
        </div>
      </Demo>

      <Demo
        id="room"
        code={CODE.room}
        title="3. A room shared by every tab"
        shows="Open this page in a second tab. +1 in either tab updates both: the click is a normal @post, the update arrives through each tab's open stream."
      >
        <div
          data-signals={signals({ roomCount, roomViewers: 0 })}
          data-indicator="roomLive"
          data-init={`@get('${BASE}/room')`}
        >
          <div class="room">
            <span class="room-count" data-text="$roomCount">
              {roomCount}
            </span>
            <button class="primary" data-on:click={`@post('${BASE}/room/bump')`}>
              +1
            </button>
          </div>
          <p class="readout">
            <span class="status" data-class="{'on': $roomLive}" data-text="$roomLive ? 'LIVE' : 'OFFLINE'">OFFLINE</span>{' '}
            tabs connected: <strong data-text="$roomViewers">0</strong>
          </p>
        </div>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

// 1. Polling — a short request per tick. The page's own count comes back incremented.
liveDemo.get('/poll', async (c) => {
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const pollCount = Number(read.success ? read.signals.pollCount : 0) + 1;
  return ServerSentEventGenerator.stream((sse) => {
    sse.patchSignals(JSON.stringify({ pollCount, pollTime: timeNow() }));
  });
});

// 2. Push — keepalive keeps the response open after the start callback returns;
// onAbort is where the timer gets cleaned up when the tab goes away.
liveDemo.get('/clock', () => {
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(timer);
  return ServerSentEventGenerator.stream(
    (sse) => {
      let seconds = 0;
      const tick = () => {
        sse.patchElements(`<div id="clock" class="clock">${timeNow()}</div>`);
        sse.patchSignals(JSON.stringify({ clockSeconds: seconds++ }));
      };
      tick();
      timer = setInterval(tick, 1000);
    },
    { keepalive: true, onAbort: stop, onError: stop },
  );
});

// 3. Shared room — each open stream subscribes; any +1 is broadcast to all of them.
liveDemo.get('/room', () => {
  let send: Subscriber | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const leave = () => {
    clearInterval(heartbeat);
    if (send) roomSubscribers.delete(send);
    broadcastRoom();
  };
  return ServerSentEventGenerator.stream(
    (sse) => {
      send = (payload) => sse.patchSignals(payload);
      roomSubscribers.add(send);
      broadcastRoom();
      // The room is quiet most of the time. Without this, Bun drops the idle connection after 10s.
      // Underscore signals stay in the browser, so the heartbeat never echoes back to the server.
      heartbeat = setInterval(() => sse.patchSignals(JSON.stringify({ _heartbeat: Date.now() })), HEARTBEAT_MS);
    },
    { keepalive: true, onAbort: leave, onError: leave },
  );
});

liveDemo.post('/room/bump', (c) => {
  roomCount += 1;
  broadcastRoom();
  return c.body(null, 204); // nothing to patch here — the update travels through the open streams
});
