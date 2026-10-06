import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { lesson } from './index';

/**
 * Lesson 7 — Where Datastar stops.
 *
 * Rule: attributes hold EXPRESSIONS, never PROGRAMS. First check for a Datastar plugin;
 * when you genuinely need a browser API Datastar doesn't cover (here: canvas + pointer
 * events), write a small "island" in src/islands/ and connect it with two one-way wires:
 *   signals → data-* attributes → island      (Datastar talks to the island)
 *   island  → CustomEvent       → data-on:*   (the island talks to Datastar)
 * Walkthrough: lessons/07-islands.md
 */

const meta = lesson('islands');
const BASE = '/lessons/islands';

const PALETTE: [string, string][] = [
  ['Ink', '#2a2140'],
  ['Pink', '#ff4f9a'],
  ['Sunshine', '#ffc93c'],
  ['Mint', '#12b886'],
  ['Sky', '#3b82f6'],
  ['Violet', '#7c3aed'],
  ['Eraser (white)', '#ffffff'],
];

const CODE: Record<string, Snippet[]> = {
  stopwatch: [
    {
      label: 'HTML',
      code: `
        <!-- ✗ a program hiding in an attribute: timers, cleanup, a timer id in a signal -->
        <button data-on:click="$swRunning ? (clearInterval($swTimer), $swRunning = false)
                                          : ($swTimer = setInterval(() => …, 100), $swRunning = true)">

        <!-- ✓ a Datastar plugin + a one-line expression -->
        <div data-on-interval__duration.100ms="$sw2Running && ($sw2Elapsed += 0.1)">
          <button data-on:click="$sw2Running = !$sw2Running">Start</button>`,
      marks: ['setInterval', 'clearInterval', 'data-on-interval__duration.100ms'],
    },
  ],
  paint: [
    {
      label: 'HTML — signals → attributes → island, island → event → signals',
      code: `
        <canvas data-island="paint"
                data-attr:data-pen-color="$penColor"
                data-attr:data-clear-token="$clearToken"
                data-on:paint-change="$strokeCount = evt.detail.strokes"></canvas>
        <script type="module" src="/islands/paint.js"></script>`,
      marks: ['data-attr:data-pen-color', 'data-attr:data-clear-token', 'data-on:paint-change', 'evt.detail'],
    },
    {
      label: 'Island (src/islands/paint.ts)',
      code: `
        ctx.fillStyle = canvas.dataset.penColor;                 // read what Datastar wrote
        canvas.dispatchEvent(new CustomEvent('paint-change',     // tell Datastar what happened
          { detail: { strokes, pixels } }));
        new MutationObserver(clear).observe(canvas,              // react to Clear
          { attributes: true, attributeFilter: ['data-clear-token'] });`,
      marks: ['canvas.dataset.penColor', "new CustomEvent('paint-change'", "attributeFilter: ['data-clear-token']"],
    },
  ],
};

export const islandsDemo = new Hono();

islandsDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Datastar covers almost everything with expressions. This lesson is about the rest: how to tell when you've hit its edge, and how to plug in a small piece of plain TypeScript without making a mess."
        guide="lessons/07-islands.md"
      />

      <Demo
        id="stopwatch"
        code={CODE.stopwatch}
        title="1. Expressions, not programs"
        shows="Both stopwatches work. One hides a timer program inside an attribute; the other uses a Datastar plugin and stays a one-line expression."
      >
        <div class="split">
          <div data-signals={signals({ swElapsed: 0, swRunning: false, swTimer: 0 })}>
            <span class="label-broken">Broken</span>
            <p class="stopwatch" data-text="$swElapsed.toFixed(1) + 's'">
              0.0s
            </p>
            {/* INTENTIONALLY BROKEN: a program (setInterval + clearInterval + a timer id in a
                signal) living inside an attribute. It works, which is the trap. */}
            <button
              data-on:click="$swRunning ? (clearInterval($swTimer), $swRunning = false) : ($swTimer = setInterval(() => $swElapsed = Math.round($swElapsed * 10 + 1) / 10, 100), $swRunning = true)"
              data-text="$swRunning ? 'Stop' : 'Start'"
            >
              Start
            </button>
          </div>
          <div
            data-signals={signals({ sw2Elapsed: 0, sw2Running: false })}
            // JSX attribute names can't contain a "." — modifiers like __duration.100ms go through a spread.
            {...{ 'data-on-interval__duration.100ms': '$sw2Running && ($sw2Elapsed = Math.round($sw2Elapsed * 10 + 1) / 10)' }}
          >
            <span class="label-fixed">Fixed</span>
            <p class="stopwatch" data-text="$sw2Elapsed.toFixed(1) + 's'">
              0.0s
            </p>
            <div class="row">
              <button data-on:click="$sw2Running = !$sw2Running" data-text="$sw2Running ? 'Stop' : 'Start'">
                Start
              </button>
              <button data-on:click="$sw2Running = false; $sw2Elapsed = 0">Reset</button>
            </div>
          </div>
        </div>
      </Demo>

      <Demo
        id="paint"
        code={CODE.paint}
        title="2. An island: pixel paint"
        shows="Drawing needs canvas and pointer events, so a 60-line island owns the canvas. Datastar owns everything else: colour, brush size, clear, save."
      >
        <div
          class="paint"
          data-signals={signals({ penColor: '#2a2140', penSize: 1, strokeCount: 0, pixelCount: 0, clearToken: 0 })}
        >
          <div class="paint-colors" role="group" aria-label="Colour">
            {PALETTE.map(([name, color]) => (
              <button
                class="paint-color"
                style={`background:${color}`}
                aria-label={name}
                aria-pressed="false"
                data-on:click={`$penColor = '${color}'`}
                data-attr:aria-pressed={`$penColor === '${color}' ? 'true' : 'false'`}
              ></button>
            ))}
          </div>
          <label>
            Brush size: <span data-text="$penSize + '×' + $penSize">1×1</span>
            <input type="range" min="1" max="4" data-bind="penSize" />
          </label>
          {/* signals → attributes → island, and island → paint-change event → signals */}
          <canvas
            width="32"
            height="20"
            tabindex={0}
            aria-label="Pixel paint canvas, 32 by 20 pixels"
            data-island="paint"
            data-attr:data-pen-color="$penColor"
            data-attr:data-pen-size="$penSize"
            data-attr:data-clear-token="$clearToken"
            data-on:paint-change="$strokeCount = evt.detail.strokes; $pixelCount = evt.detail.pixels"
          ></canvas>
          <p class="readout">
            Strokes: <strong data-text="$strokeCount">0</strong> · pixels painted:{' '}
            <strong data-text="$pixelCount">0</strong>
          </p>
          <div class="row">
            <button data-on:click="$clearToken++">Clear</button>
            <button
              class="primary"
              data-on:click={`@post('${BASE}/save')`}
              data-indicator="savingSketch"
              data-attr:disabled="$savingSketch || $pixelCount === 0"
            >
              Save
            </button>
          </div>
          <div id="save-result"></div>
        </div>
      </Demo>

      {/* Islands load only on the page that needs them. src/islands/paint.ts, transpiled by src/server.tsx. */}
      <script type="module" src="/islands/paint.js"></script>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

islandsDemo.post('/save', async (c) => {
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const s = read.success ? read.signals : {};
  await sleep(400);
  return c.html(
    <div id="save-result" class="result ok">
      Saved (not really)! The server received {String(s.strokeCount)} stroke(s) and {String(s.pixelCount)} painted
      pixel(s) as plain signals. The picture itself never left the island.
    </div>,
  );
});
