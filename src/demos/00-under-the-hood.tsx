import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { CodeBits, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { toHtml } from '../lib/datastar';
import { lesson } from './index';

/**
 * Lesson 0 — Under the hood.
 *
 * One full round trip, drawn as four boxes joined by arrows, filled with the REAL data:
 *   ① the browser sends        → what Datastar is about to send (data-json-signals)
 *   ② the server receives      → the request exactly as the handler saw it
 *   ③ the server streams back  → the raw SSE text the SDK wrote, event by event
 *   ④ Datastar applies it      → the element it morphed + the signal patches it merged
 * The lit box/arrow is driven by `_hoodStage`, a local (underscore) signal the server
 * patches as it goes. Slow motion spaces the events out so you can follow them.
 * Walkthrough: lessons/00-under-the-hood.md
 */

const meta = lesson('under-the-hood');
const BASE = '/lessons/under-the-hood';
const SLOW_GAP_MS = 700;

let visits = 0;

/** A pixel-art arrow (12×7 "pixels" of square rects). Points right; CSS rotates it. */
function PixelArrow() {
  return (
    <svg viewBox="0 0 12 7" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">
      <rect x="0" y="3" width="8" height="1" />
      <rect x="8" y="0" width="1" height="7" />
      <rect x="9" y="1" width="1" height="5" />
      <rect x="10" y="2" width="1" height="3" />
      <rect x="11" y="3" width="1" height="1" />
    </svg>
  );
}

function Arrow({ area, label, litAt }: { area: string; label: string; litAt: number }) {
  return (
    <div class={`hood-arrow hood-${area}`} data-class:lit={`$_hoodStage === ${litAt}`}>
      <PixelArrow />
      <span>{label}</span>
    </div>
  );
}

const HOOD_CODE: Snippet[] = [
  {
    label: '① Your page — HTML',
    code: `
      <input data-bind="hoodName">
      <button data-on:click="$_hoodStage = 1; @post('/lessons/under-the-hood/echo')">Send with @post</button>
      <pre data-json-signals="{exclude: /^_/}"></pre>   <!-- what will be sent -->`,
    marks: ['data-bind="hoodName"', "@post('/lessons/under-the-hood/echo')", 'data-json-signals'],
  },
  {
    label: '② The server receives it — Hono handler',
    code: `
      underTheHoodDemo.on(['GET', 'POST'], '/echo', async (c) => {
        const read = await ServerSentEventGenerator.readSignals(c.req.raw); // body (POST) or ?datastar= (GET)
        c.req.header('Datastar-Request');                                   // "true"`,
    marks: ['readSignals(c.req.raw)', "c.req.header('Datastar-Request')"],
  },
  {
    label: '③ The server streams events back',
    code: `
        return ServerSentEventGenerator.stream(async (sse) => {
          sse.patchElements('<div id="hood-greeting">Hello, Ada! …</div>');
          sse.patchSignals(JSON.stringify({ hoodVisits: 1, hoodReply: 'Hello, Ada!' }));
        });`,
    marks: ['ServerSentEventGenerator.stream', 'sse.patchElements', 'sse.patchSignals'],
  },
  {
    label: '④ Datastar applies each event — HTML',
    code: `
      <div id="hood-greeting">…</div>   <!-- morphed in place: same id -->
      <pre data-on-signal-patch="$_hoodLog = [...$_hoodLog, JSON.stringify(patch)]"
           data-on-signal-patch-filter="{include: /^hood(Visits|Reply)$/}"></pre>`,
    marks: ['id="hood-greeting"', 'data-on-signal-patch', 'patch'],
  },
];

const time = () => new Date().toLocaleTimeString('en-GB');

export const underTheHoodDemo = new Hono();

underTheHoodDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Before the details, watch one whole round trip. Press a Send button and follow the lit box: every panel fills with the real data at each step."
        guide="lessons/00-under-the-hood.md"
      />

      <div
        class="hood-wrap"
        data-signals={signals({
          hoodName: 'Ada',
          hoodSlow: true,
          hoodVisits: 0,
          hoodReply: '',
          _hoodStage: 0,
          _hoodLog: [],
          _hoodTotalMs: 0,
        })}
      >
        <div class="hood">
          <section class="hood-box hood-b1" data-class:lit="$_hoodStage === 1" aria-labelledby="hood-1">
            <h3 id="hood-1">
              <span class="hood-step">1</span> Your page sends a request
            </h3>
            <label>
              Your name
              <input data-bind="hoodName" autocomplete="off" />
            </label>
            <label class="hood-check">
              <input type="checkbox" data-bind="hoodSlow" /> Slow motion
            </label>
            <div class="row">
              <button
                class="primary"
                data-on:click={`$_hoodStage = 1; $_hoodLog = []; @post('${BASE}/echo')`}
                data-indicator="hoodSending"
                data-attr:disabled="$hoodSending"
              >
                Send with @post
              </button>
              <button
                data-on:click={`$_hoodStage = 1; $_hoodLog = []; @get('${BASE}/echo')`}
                data-indicator="hoodSendingGet"
                data-attr:disabled="$hoodSendingGet"
              >
                Send with @get
              </button>
            </div>
            <p class="hood-caption">What Datastar will send (every signal not starting with _):</p>
            <pre class="hood-pre" data-json-signals="{exclude: /^_/}"></pre>
          </section>

          <Arrow area="a1" litAt={2} label="fetch() with Datastar-Request: true + your signals" />

          <section class="hood-box hood-b2" data-class:lit="$_hoodStage === 2" aria-labelledby="hood-2">
            <h3 id="hood-2">
              <span class="hood-step">2</span> The server receives it
            </h3>
            <p class="hood-caption">The request exactly as the Hono handler saw it:</p>
            <pre id="hood-request" class="hood-pre">
              Waiting for a request…
            </pre>
          </section>

          <Arrow area="a2" litAt={3} label="readSignals() → handler opens a text/event-stream" />

          <section class="hood-box hood-b3" data-class:lit="$_hoodStage === 3" aria-labelledby="hood-3">
            <h3 id="hood-3">
              <span class="hood-step">3</span> The server streams events back
            </h3>
            <p class="hood-caption">
              The raw text on the wire, event by event (the events that update this diagram itself are left out).
            </p>
            <pre id="hood-wire" class="hood-pre">
              Nothing on the wire yet.
            </pre>
          </section>

          <Arrow area="a3" litAt={4} label="each event is applied the moment it arrives" />

          <section class="hood-box hood-b4" data-class:lit="$_hoodStage === 4" aria-labelledby="hood-4">
            <h3 id="hood-4">
              <span class="hood-step">4</span> Datastar applies each event
            </h3>
            <p class="hood-caption">datastar-patch-elements → finds id="hood-greeting" on this page and morphs it:</p>
            <div id="hood-greeting" class="hood-target">
              Nobody has said hello yet.
            </div>
            <p class="hood-caption">datastar-patch-signals → merged into the store (data-on-signal-patch log):</p>
            <pre
              class="hood-pre"
              data-on-signal-patch="$_hoodLog = [...$_hoodLog, JSON.stringify(patch)].slice(-3)"
              data-on-signal-patch-filter="{include: /^hood(Visits|Reply)$/}"
              data-text="$_hoodLog.length ? $_hoodLog.join('\n') : 'No signal patches yet.'"
            >
              No signal patches yet.
            </pre>
            <p class="readout" data-show="$_hoodStage === 5" style="display:none">
              Round trip complete in <strong data-text="$_hoodTotalMs + 'ms'"></strong>
              <span data-show="$hoodSlow"> (slowed down on purpose)</span>.
            </p>
          </section>
        </div>
      </div>

      <section class="demo" id="hood-code" aria-label="The code behind each box">
        <CodeBits title="The code behind each box (simplified excerpts)" snippets={HOOD_CODE} />
      </section>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

underTheHoodDemo.on(['GET', 'POST'], '/echo', async (c) => {
  const started = Date.now();
  const method = c.req.method;
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const received = read.success ? read.signals : {};
  const name = String(received.hoodName ?? '').trim() || 'stranger';
  const gap = received.hoodSlow === true ? SLOW_GAP_MS : 0;
  const visit = ++visits;

  const url = new URL(c.req.url);
  const requestText = [
    `${method} ${url.pathname}${url.search ? '?datastar=…' : ''}`,
    `Datastar-Request: ${c.req.header('Datastar-Request') ?? '(missing)'}`,
    ...(method === 'GET' ? [] : [`Content-Type: ${c.req.header('Content-Type') ?? '(none)'}`]),
    '',
    `readSignals() found them in ${method === 'GET' ? 'the ?datastar= query parameter' : 'the JSON body'}:`,
    JSON.stringify(received, null, 2),
  ].join('\n');

  return ServerSentEventGenerator.stream(async (sse) => {
    const wire: string[] = [];
    const showWire = () => sse.patchElements(toHtml(<pre id="hood-wire" class="hood-pre">{wire.join('\n')}</pre>));
    const stage = (n: number) => sse.patchSignals(JSON.stringify({ _hoodStage: n }));

    sse.patchElements(toHtml(<pre id="hood-request" class="hood-pre">{requestText}</pre>));
    stage(2);
    await sleep(gap);

    stage(3);
    wire.length = 0;
    wire.push('(handler is building its response…)');
    showWire();
    await sleep(gap);

    // Event 1: HTML. Datastar matches id="hood-greeting" on the page and morphs it.
    stage(4);
    const greeting = toHtml(
      <div id="hood-greeting" class="hood-target">
        Hello, {name}! You are visitor #{visit}. (Morphed in at {time()}.)
      </div>,
    );
    const event1 = sse.patchElements(greeting);
    wire.length = 0;
    wire.push(`+${Date.now() - started}ms\n${event1.join('')}`);
    showWire();
    await sleep(gap);

    // Event 2: signals. Merged into the store; data-on-signal-patch logs it.
    const event2 = sse.patchSignals(JSON.stringify({ hoodVisits: visit, hoodReply: `Hello, ${name}!` }));
    wire.push(`+${Date.now() - started}ms\n${event2.join('')}`);
    showWire();
    await sleep(gap);

    sse.patchSignals(JSON.stringify({ _hoodStage: 5, _hoodTotalMs: Date.now() - started }));
  });
});
