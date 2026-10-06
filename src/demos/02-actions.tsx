import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { lesson } from './index';

/**
 * Lesson 2 — Actions + swap by id.
 *
 * The browser asks the server for HTML with @get / @post. The server answers
 * with a plain `text/html` fragment whose top-level element carries an `id`;
 * Datastar finds the element with that id on the page and morphs it in place.
 * No SSE, no JSON API, no client-side templates. Walkthrough: lessons/02-actions.md
 *
 * The contact and validate POST handlers sleep SLOW_MS so you can SEE the in-flight state.
 */

const meta = lesson('actions');
const BASE = '/lessons/actions';
const SLOW_MS = 600;

type Contact = { name: string; email: string };
let contact: Contact = { name: 'Ada Lovelace', email: 'ada@example.com' };

// ---------- Fragments: every one has the SAME top-level id, so each replaces the last ----------

function ContactView({ value }: { value: Contact }) {
  return (
    <div id="contact" class="contact">
      <dl>
        <dt>Name</dt>
        <dd>{value.name}</dd>
        <dt>Email</dt>
        <dd>{value.email}</dd>
      </dl>
      <button data-on:click={`@get('${BASE}/contact/edit')`}>Edit</button>
    </div>
  );
}

function ContactEdit({ value, error }: { value: Contact; error?: string }) {
  return (
    <div id="contact" class="contact">
      {/* contentType: 'form' posts the <form>'s fields (name=…&email=…) instead of the signals.
          data-indicator lives on the FORM because the form's data-on:submit is what fires the fetch. */}
      <form
        class="stack"
        data-on:submit={`@post('${BASE}/contact', {contentType: 'form'})`}
        data-indicator="contactSaving"
      >
        <label>
          Name
          <input name="name" value={value.name} autocomplete="off" />
        </label>
        <label>
          Email
          <input name="email" value={value.email} autocomplete="off" />
        </label>
        {error && <div class="result error">{error}</div>}
        <div class="row">
          <button type="submit" class="primary" data-attr:disabled="$contactSaving">
            <span data-text="$contactSaving ? 'Saving…' : 'Save'">Save</span>
          </button>
          <button type="button" data-on:click={`@get('${BASE}/contact')`}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ValidateResult({ errors, received }: { errors: string[]; received: Record<string, unknown> }) {
  return (
    <div id="validate-result" class={errors.length ? 'result error' : 'result ok'}>
      {errors.length ? (
        <>
          <strong>Please fix:</strong>
          <ul>
            {errors.map((e) => (
              <li>{e}</li>
            ))}
          </ul>
        </>
      ) : (
        <strong>Looks good — you're signed up (not really).</strong>
      )}
      <pre>{`The server received:\n${JSON.stringify(received, null, 2)}`}</pre>
    </div>
  );
}

/**
 * ATTRIBUTE ORDER IS THE LESSON. `chain-early` reads `$chainDoubled` but is declared
 * BEFORE `chain-doubled`. On a first page load Datastar 1.0.2 copes; when the same markup
 * arrives later in a patch, `chain-early` never subscribes and stays stuck.
 */
function ChainCalculator() {
  return (
    <div id="chain-slot" class="result">
      <div
        data-signals={signals({ chainBase: 10 })}
        data-computed:chain-early="$chainDoubled * 2"
        data-computed:chain-doubled="$chainBase * 2"
        data-computed:chain-ordered="$chainDoubled * 2"
        data-computed:chain-inline="$chainBase * 4"
      >
        <div class="row">
          <button data-on:click="$chainBase++">base + 1</button>
        </div>
        <dl class="totals">
          <dt>$chainBase</dt>
          <dd data-text="$chainBase">10</dd>
          <dt>$chainDoubled</dt>
          <dd data-text="$chainDoubled">20</dd>
          <dt>
            <span class="label-broken">Broken</span> $chainEarly (declared first)
          </dt>
          <dd data-text="$chainEarly">?</dd>
          <dt>
            <span class="label-fixed">Fixed</span> $chainOrdered (declared after)
          </dt>
          <dd data-text="$chainOrdered">?</dd>
          <dt>
            <span class="label-fixed">Fixed</span> $chainInline (base only)
          </dt>
          <dd data-text="$chainInline">?</dd>
        </dl>
      </div>
    </div>
  );
}

function StatusResult({ status }: { status: number }) {
  return (
    <div id="status-result" class="result ok">
      Patched by a <strong>{status}</strong> response at {new Date().toLocaleTimeString('en-GB')}.
    </div>
  );
}

const CODE: Record<string, Snippet[]> = {
  click_to_edit: [
    {
      label: 'HTML on the page',
      code: `
        <div id="contact">
          <dl>…Ada Lovelace…</dl>
          <button data-on:click="@get('/lessons/actions/contact/edit')">Edit</button>
        </div>`,
      marks: ['id="contact"', "@get('/lessons/actions/contact/edit')"],
    },
    {
      label: 'Server (Hono) — every version of the fragment keeps id="contact"',
      code: `
        actionsDemo.get('/contact/edit', (c) => c.html(<ContactEdit value={contact} />));

        // <ContactEdit> renders:
        // <div id="contact">
        //   <form data-on:submit="@post('/lessons/actions/contact', {contentType: 'form'})"
        //         data-indicator="contactSaving"> …
        //     <button type="submit" data-attr:disabled="$contactSaving">Save</button>`,
      marks: ['c.html', 'id="contact"', "{contentType: 'form'}", 'data-indicator="contactSaving"'],
    },
  ],
  validation: [
    {
      label: 'HTML',
      code: `
        <form data-signals='{"signupName": "", "signupEmail": ""}'
              data-on:submit="@post('/lessons/actions/validate')"
              data-indicator="validateSending">
          <input data-bind="signupName"> <input data-bind="signupEmail">
          <button type="submit" data-attr:disabled="$validateSending">Sign up</button>
        </form>
        <div id="validate-result"></div>`,
      marks: ["@post('/lessons/actions/validate')", 'data-indicator="validateSending"', 'id="validate-result"'],
    },
    {
      label: 'Server (Hono)',
      code: `
        const read = await ServerSentEventGenerator.readSignals(c.req.raw); // the JSON body
        const errors = validate(read.signals);
        return c.html(<ValidateResult errors={errors} />);   // <div id="validate-result">, status 200`,
      marks: ['readSignals(c.req.raw)', 'c.html'],
    },
  ],
  status: [
    {
      label: 'Server (Hono)',
      code: `
        actionsDemo.post('/status/:code', (c) => {
          const status = c.req.param('code') === '422' ? 422 : 200;
          return c.html(<StatusResult status={status} />, status); // same fragment, different status
        });`,
      marks: ['422 : 200', ', status)'],
    },
  ],
  chain: [
    {
      label: 'HTML the server sends (attribute ORDER is the bug)',
      code: `
        <div data-signals='{"chainBase": 10}'
             data-computed:chain-early="$chainDoubled * 2"     ← reads a computed declared below
             data-computed:chain-doubled="$chainBase * 2"
             data-computed:chain-ordered="$chainDoubled * 2"   ← declared after: fine
             data-computed:chain-inline="$chainBase * 4">      ← base signals only: always fine`,
      marks: ['data-computed:chain-early', 'data-computed:chain-doubled', 'data-computed:chain-inline'],
    },
  ],
};

// ---------- Page ----------

export const actionsDemo = new Hono();

actionsDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Now the server joins in. An action like @post sends a request; the server replies with an HTML fragment; Datastar swaps it into the element with the same id."
        guide="lessons/02-actions.md"
      />

      <Demo
        id="click-to-edit"
        code={CODE.click_to_edit}
        title="1. Click to edit"
        shows={'Edit, Save and Cancel each fetch a fragment with id="contact". The page never navigates.'}
      >
        <ContactView value={contact} />
      </Demo>

      <Demo
        id="validation"
        code={CODE.validation}
        title="2. Inline validation"
        shows="@post sends the page's signals as JSON. The server validates and replies with a fragment for #validate-result."
      >
        <form
          class="stack"
          data-signals={signals({ signupName: '', signupEmail: '' })}
          data-on:submit={`@post('${BASE}/validate')`}
          data-indicator="validateSending"
        >
          <div class="split">
            <label>
              Name
              <input data-bind="signupName" autocomplete="off" />
            </label>
            <label>
              Email
              <input data-bind="signupEmail" autocomplete="off" />
            </label>
          </div>
          <div class="row">
            <button type="submit" class="primary" data-attr:disabled="$validateSending">
              <span data-text="$validateSending ? 'Checking…' : 'Sign up'">Sign up</span>
            </button>
          </div>
        </form>
        <div id="validate-result"></div>
      </Demo>

      <Demo
        id="status"
        code={CODE.status}
        title="3. Break it: 200 vs 422"
        shows="Both buttons get the same fragment back (same id, same component). Only the status code differs."
      >
        <div class="row">
          <button data-on:click={`@post('${BASE}/status/200')`}>Respond 200</button>
          <button data-on:click={`@post('${BASE}/status/422')`}>Respond 422</button>
        </div>
        <div id="status-result" class="result">
          Nothing patched yet.
        </div>
      </Demo>

      <Demo
        id="chain"
        code={CODE.chain}
        title="4. Gotcha: computed order in patched HTML"
        shows="A computed that reads a computed declared AFTER it gets stuck — but only when the HTML arrives in a patch. Fine on first load, broken here."
      >
        <div class="row">
          <button data-on:click={`@get('${BASE}/chain')`}>Load the calculator from the server</button>
        </div>
        <div id="chain-slot" class="result">
          Nothing loaded yet.
        </div>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

// ---------- Actions ----------

actionsDemo.get('/contact', (c) => c.html(<ContactView value={contact} />));

actionsDemo.get('/contact/edit', (c) => c.html(<ContactEdit value={contact} />));

actionsDemo.post('/contact', async (c) => {
  await sleep(SLOW_MS);
  const body = await c.req.parseBody();
  const next = { name: String(body.name ?? '').trim(), email: String(body.email ?? '').trim() };
  if (!next.name || !next.email.includes('@')) {
    // Still a 200: Datastar only applies 2xx responses (demo 3 proves it).
    return c.html(<ContactEdit value={next} error="Name is required and the email needs an @." />);
  }
  contact = next;
  return c.html(<ContactView value={contact} />);
});

actionsDemo.post('/validate', async (c) => {
  await sleep(SLOW_MS);
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const received = read.success ? read.signals : {};
  const name = String(received.signupName ?? '').trim();
  const email = String(received.signupEmail ?? '').trim();
  const errors = [
    ...(name.length < 2 ? ['Name needs at least 2 characters.'] : []),
    ...(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? ['Email doesn’t look like an email.'] : []),
  ];
  return c.html(<ValidateResult errors={errors} received={received} />);
});

actionsDemo.get('/chain', (c) => c.html(<ChainCalculator />));

actionsDemo.post('/status/:code', (c) => {
  const status = c.req.param('code') === '422' ? 422 : 200;
  return c.html(<StatusResult status={status} />, status);
});
