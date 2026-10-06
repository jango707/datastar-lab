import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { toHtml } from '../lib/datastar';
import { lesson } from './index';

/**
 * Lesson 3 — Server reads signals, answers with an SSE stream.
 *
 * Instead of one HTML fragment, the server opens a `text/event-stream` and can send
 * any number of events: `datastar-patch-elements` (HTML) and `datastar-patch-signals`
 * (state). It reads the page's signals to decide what to send.
 * Walkthrough: lessons/03-server-signals.md
 */

const meta = lesson('server-signals');
const BASE = '/lessons/server-signals';

const LANGUAGES = [
  'Ada', 'ALGOL', 'APL', 'BASIC', 'C', 'C#', 'C++', 'Clojure', 'COBOL', 'CoffeeScript', 'Crystal', 'D',
  'Dart', 'Elixir', 'Elm', 'Erlang', 'F#', 'Forth', 'Fortran', 'Gleam', 'Go', 'Groovy', 'Haskell', 'Java',
  'JavaScript', 'Julia', 'Kotlin', 'Lisp', 'Lua', 'ML', 'Nim', 'OCaml', 'Pascal', 'Perl', 'PHP', 'Prolog',
  'PureScript', 'Python', 'R', 'Racket', 'ReScript', 'Ruby', 'Rust', 'Scala', 'Scheme', 'Smalltalk',
  'SQL', 'Swift', 'Tcl', 'TypeScript', 'Zig',
];

const search = (q: string) => {
  const needle = q.trim().toLowerCase();
  return needle ? LANGUAGES.filter((l) => l.toLowerCase().includes(needle)) : LANGUAGES;
};

function Results({ items }: { items: string[] }) {
  return (
    <ul id="search-results" class="results">
      {items.length ? items.map((l) => <li>{l}</li>) : <li class="empty">No matches. Try "script".</li>}
    </ul>
  );
}

const CODE: Record<string, Snippet[]> = {
  search: [
    {
      label: 'HTML',
      code: `
        <input data-bind="q"
               data-on:input__debounce.300ms="@get('/lessons/server-signals/search')"
               data-indicator="searching">
        <span data-text="$searching ? 'Searching…' : $resultCount + ' of 51 languages'"></span>
        <ul id="search-results">…</ul>`,
      marks: ['__debounce.300ms', "@get('/lessons/server-signals/search')", 'id="search-results"', '$resultCount'],
    },
    {
      label: 'Server (Hono) — one response, two events',
      code: `
        const read = await ServerSentEventGenerator.readSignals(c.req.raw); // GET → ?datastar=
        const items = search(String(read.signals.q));
        return ServerSentEventGenerator.stream((sse) => {
          sse.patchElements(toHtml(<Results items={items} />));          // morphs #search-results
          sse.patchSignals(JSON.stringify({ resultCount: items.length })); // merges a signal
        });`,
      marks: ['readSignals', 'ServerSentEventGenerator.stream', 'sse.patchElements', 'sse.patchSignals'],
    },
  ],
  dice: [
    {
      label: 'Server (Hono) — signals only, no HTML',
      code: `
        return ServerSentEventGenerator.stream((sse) => {
          sse.patchSignals(JSON.stringify({ dice: [4, 2, 6, 0, 0], diceCount: 3, rollTotal: 12, rollCount }));
        });`,
      marks: ['sse.patchSignals'],
    },
    {
      label: 'HTML — the page re-renders from the signals',
      code: `
        <div data-signals='{"diceWanted": 3, "dice": [0, 0, 0, 0, 0], "diceCount": 0}'>
          <select data-bind="diceWanted">…</select>
          <span class="die" data-show="$diceCount > 0" data-text="$dice[0]"></span>
          …`,
      marks: ['"dice": [0, 0, 0, 0, 0]', 'data-show="$diceCount > 0"', 'data-text="$dice[0]"'],
    },
  ],
  modes: [
    {
      label: 'Server (Hono) — target a selector, pick a mode',
      code: `
        sse.patchElements('<li>#1 appended</li>',  { selector: '#log', mode: 'append' });
        sse.patchElements('<li>#3 prepended</li>', { selector: '#log', mode: 'prepend' });
        sse.patchElements('<li>#5 replaced</li>',  { selector: '#log', mode: 'inner' });
        sse.removeElements('#log > li:first-child');`,
      marks: ["mode: 'append'", "mode: 'prepend'", "mode: 'inner'", 'removeElements'],
    },
  ],
};

let logSeq = 0;

export const serverSignalsDemo = new Hono();

serverSignalsDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Now the server answers with a stream of events instead of one fragment. One response can patch HTML and signals, as many times as it likes, and the server can read your signals to decide what to send."
        guide="lessons/03-server-signals.md"
      />

      <Demo
        id="search"
        code={CODE.search}
        title="1. Active search"
        shows="Typing (debounced) sends $q to the server. One SSE response patches the results list AND the $resultCount signal."
      >
        <div data-signals={signals({ q: '', resultCount: LANGUAGES.length })}>
          <label>
            Search programming languages
            <input
              data-bind="q"
              // JSX attribute names can't contain a "." — modifiers like __debounce.300ms go through a spread.
              {...{ 'data-on:input__debounce.300ms': `@get('${BASE}/search')` }}
              data-indicator="searching"
              placeholder="try: script"
              autocomplete="off"
            />
          </label>
          <p class="readout" aria-live="polite">
            <span data-text={`$searching ? 'Searching…' : $resultCount + ' of ${LANGUAGES.length} languages'`}>
              {LANGUAGES.length} of {LANGUAGES.length} languages
            </span>
          </p>
          <Results items={LANGUAGES} />
        </div>
      </Demo>

      <Demo
        id="dice"
        code={CODE.dice}
        title="2. The server writes signals"
        shows="The response carries no HTML at all — only a datastar-patch-signals event. The page re-renders from the new signal values."
      >
        {/* dice is seeded with 5 slots, not []: reading $dice[4] on a shorter array would CREATE
            the missing entries as "" (and send them to the server). diceCount says how many are real. */}
        <div data-signals={signals({ diceWanted: 3, dice: [0, 0, 0, 0, 0], diceCount: 0, rollTotal: 0, rollCount: 0 })}>
          <div class="row">
            <label>
              Dice
              <select data-bind="diceWanted">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <button class="primary" data-on:click={`@post('${BASE}/roll')`} data-indicator="rolling" data-attr:disabled="$rolling">
              Roll
            </button>
          </div>
          <div class="dice" aria-live="polite">
            <span data-show="$diceCount === 0" class="readout">Nothing rolled yet.</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <span class="die" data-show={`$diceCount > ${i}`} data-text={`$dice[${i}]`} style="display:none"></span>
            ))}
          </div>
          <p class="readout" data-show="$rollCount > 0" style="display:none">
            Total <strong data-text="$rollTotal"></strong> · the server has rolled <strong data-text="$rollCount"></strong> time(s)
          </p>
        </div>
      </Demo>

      <Demo
        id="modes"
        code={CODE.modes}
        title="3. Patch modes"
        shows="patchElements can target any CSS selector and choose HOW to apply: append, prepend, inner (replace children), or remove."
      >
        <div class="row">
          <button data-on:click={`@post('${BASE}/log/append')`}>Append</button>
          <button data-on:click={`@post('${BASE}/log/prepend')`}>Prepend</button>
          <button data-on:click={`@post('${BASE}/log/inner')`}>Replace all</button>
          <button data-on:click={`@post('${BASE}/log/remove')`}>Remove first</button>
        </div>
        <ol id="log" class="log"></ol>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

// GET: Datastar puts the signals in the `datastar` query parameter; readSignals parses them.
serverSignalsDemo.get('/search', async (c) => {
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const q = read.success ? String(read.signals.q ?? '') : '';
  const items = search(q);
  await sleep(150);
  return ServerSentEventGenerator.stream((sse) => {
    sse.patchElements(toHtml(<Results items={items} />)); // morph by id: #search-results
    sse.patchSignals(JSON.stringify({ resultCount: items.length }));
  });
});

let totalRolls = 0;

serverSignalsDemo.post('/roll', async (c) => {
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const wanted = Math.min(5, Math.max(1, Number(read.success ? read.signals.diceWanted : 1) || 1));
  const dice = Array.from({ length: wanted }, () => 1 + Math.floor(Math.random() * 6));
  totalRolls += 1;
  await sleep(300);
  return ServerSentEventGenerator.stream((sse) => {
    const padded = [...dice, 0, 0, 0, 0, 0].slice(0, 5); // keep all 5 slots (see the comment on data-signals)
    sse.patchSignals(
      JSON.stringify({ dice: padded, diceCount: dice.length, rollTotal: dice.reduce((a, b) => a + b, 0), rollCount: totalRolls }),
    );
  });
});

serverSignalsDemo.post('/log/:mode', (c) => {
  const mode = c.req.param('mode');
  return ServerSentEventGenerator.stream((sse) => {
    const n = ++logSeq;
    if (mode === 'append') {
      sse.patchElements(`<li>#${n} appended</li>`, { selector: '#log', mode: 'append' });
    } else if (mode === 'prepend') {
      sse.patchElements(`<li class="from-prepend">#${n} prepended</li>`, { selector: '#log', mode: 'prepend' });
    } else if (mode === 'inner') {
      sse.patchElements(`<li class="from-inner">#${n} replaced everything</li>`, { selector: '#log', mode: 'inner' });
    } else {
      sse.removeElements('#log > li:first-child');
    }
  });
});
