import { Hono } from 'hono';
import { Demo, LessonIntro } from '../components';
import { signals } from '../lib/signals';
import { lesson } from './index';

/**
 * Lesson 1 — Signals, no server.
 *
 * Every demo on this page runs entirely in the browser. There are no routes
 * besides the page itself: open DevTools → Network and you'll see nothing
 * fire while you click around. Walkthrough: lessons/01-signals.md
 *
 * Signal names are unique across the page on purpose — every `data-signals`
 * on a page merges into ONE global store (watch the inspector).
 */

const meta = lesson('signals');

export const signalsDemo = new Hono();

signalsDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Signals are Datastar's reactive state. You declare them in HTML, read them in expressions with $name, and the DOM updates itself when they change."
        guide="lessons/01-signals.md"
      />

      <Demo
        id="counter"
        title="1. Counter"
        shows="data-signals declares state; data-on:click changes it; data-text and data-class react to it."
      >
        <div data-signals={signals({ count: 0 })}>
          <p class="big" data-text="$count" data-class:neg="$count < 0">
            0
          </p>
          <div class="row">
            <button data-on:click="$count--">−1</button>
            <button data-on:click="$count++">+1</button>
            <button data-on:click="$count = 0" data-attr:disabled="$count === 0">
              Reset
            </button>
          </div>
        </div>
      </Demo>

      <Demo
        id="toggle"
        title="2. Toggle panel"
        shows={'data-show hides and shows an element. It starts with style="display:none" so it never flashes before Datastar loads.'}
      >
        <div data-signals={signals({ open: false })}>
          <button
            data-on:click="$open = !$open"
            data-attr:aria-expanded="$open ? 'true' : 'false'"
            aria-controls="toggle-panel"
            data-text="$open ? 'Hide details' : 'Show details'"
          >
            Show details
          </button>
          <div id="toggle-panel" class="panel" data-show="$open" style="display:none">
            Hello from inside the panel. Nothing was fetched to show this — it was in the HTML all along.
          </div>
        </div>
      </Demo>

      <Demo
        id="preview"
        title="3. Live preview (two-way binding)"
        shows="data-bind keeps an input and a signal in sync both ways; data-computed derives a read-only signal."
      >
        <div
          class="split"
          data-signals={signals({ name: '', email: '', role: 'learner' })}
          data-computed:email-ok="/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($email)"
        >
          <div class="stack">
            <label>
              Name
              <input data-bind="name" placeholder="Ada Lovelace" autocomplete="off" />
            </label>
            <label>
              Email
              <input data-bind="email" type="email" placeholder="ada@example.com" autocomplete="off" />
            </label>
            <label>
              Role
              <select data-bind="role">
                <option value="learner">Learner</option>
                <option value="manager">Manager</option>
              </select>
            </label>
          </div>
          <div class="preview" aria-live="polite">
            <p>
              Hello, <strong data-text="$name.trim() || 'stranger'">stranger</strong> (
              <span data-text="$role">learner</span>)
            </p>
            <p data-text="`${$name.length} characters typed`">0 characters typed</p>
            <p data-show="$email !== ''" style="display:none">
              <span data-text="$emailOk ? '✓ looks like an email' : '✗ not an email yet'"></span>
            </p>
          </div>
        </div>
      </Demo>

      <Demo
        id="totals"
        title="4. Computed totals"
        shows="A computed signal recalculates whenever a signal it reads changes. No event wiring needed."
      >
        <div data-signals={signals({ qty: 2, price: 15 })} data-computed:subtotal="$qty * $price">
          <div class="split">
            <label>
              Quantity
              <input type="number" min="0" data-bind="qty" />
            </label>
            <label>
              Unit price (£)
              <input type="number" min="0" step="0.01" data-bind="price" />
            </label>
          </div>
          <dl class="totals">
            <dt>Subtotal</dt>
            <dd data-text="'£' + $subtotal.toFixed(2)">£30.00</dd>
            <dt>VAT (20%)</dt>
            <dd data-text="'£' + ($qty * $price * 0.2).toFixed(2)">£6.00</dd>
            <dt>Total</dt>
            <dd data-text="'£' + ($qty * $price * 1.2).toFixed(2)">£36.00</dd>
          </dl>
        </div>
      </Demo>

      <h2 class="section">Gotchas you will hit in real code</h2>

      <Demo
        id="gotcha-case"
        title="5. HTML lowercases attribute names"
        shows="data-bind:userName reaches the browser as data-bind:username, so it binds the WRONG signal. Use the value form."
      >
        <div data-signals={signals({ userName: '' })} class="split">
          <label>
            <span class="label-broken">Broken</span> data-bind:userName
            <input data-bind:userName="" placeholder="type here…" autocomplete="off" />
          </label>
          <label>
            <span class="label-fixed">Fixed</span> data-bind="userName"
            <input data-bind="userName" placeholder="…then here" autocomplete="off" />
          </label>
        </div>
        <p class="readout">
          <code>$userName</code> = <code data-text="JSON.stringify($userName)">""</code> · <code>$username</code> ={' '}
          <code data-text="JSON.stringify($username)">""</code>
        </p>
      </Demo>

      <Demo
        id="gotcha-class"
        title="6. A toggled class doesn't beat a static one"
        shows="When both classes set the same property, the stylesheet order decides — not the signal. Toggle both classes exclusively instead."
      >
        <div data-signals={signals({ gcPicked: false })} class="stack">
          <div class="row">
            <button data-on:click="$gcPicked = !$gcPicked" data-text="$gcPicked ? 'Deselect' : 'Select'">
              Select
            </button>
          </div>
          {/* INTENTIONALLY BROKEN: static gc-muted + toggled gc-accent. gc-muted comes later in lab.css, so it wins. */}
          <div class="swatch gc-muted" data-class:gc-accent="$gcPicked">
            <span class="label-broken">Broken</span> class="gc-muted" + data-class:gc-accent
          </div>
          <div class="swatch" data-class="{'gc-accent': $gcPicked, 'gc-muted': !$gcPicked}">
            <span class="label-fixed">Fixed</span> {"data-class=\"{'gc-accent': $gcPicked, 'gc-muted': !$gcPicked}\""}
          </div>
        </div>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);
