import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { dsRedirect } from '../lib/datastar';
import { lesson } from './index';

/**
 * Lesson 4 — Navigation, errors, double-submit.
 *
 * Three production problems every Datastar app hits:
 *  1. An action that should navigate (a 302 doesn't do what you think).
 *  2. An error that should be visible (non-2xx responses are ignored).
 *  3. A button clicked twice (the browser cancels the first fetch; the server still runs it).
 * The lab-wide error handler lives in src/server.tsx (app.onError → dsError).
 * Walkthrough: lessons/04-navigation-errors.md
 */

const meta = lesson('navigation-errors');
const BASE = '/lessons/navigation-errors';
const PAGE = `/lessons/navigation-errors`;

let noteSeq = 0;
let emailsSent = 0;

const CODE: Record<string, Snippet[]> = {
  navigate: [
    {
      label: 'Server (Hono) — three answers to "go to another page"',
      code: `
        // ✓ text/javascript: Datastar runs the body
        return c.body('window.location.href = "/lessons/navigation-errors?created=7"', 200,
          { 'Content-Type': 'text/javascript' });

        // ✓ SSE: a script event the browser runs once
        sse.executeScript('window.location.href = "/lessons/navigation-errors?created=7"');

        // ✗ fetch follows the 302 silently; Datastar morphs the target page's HTML in
        return c.redirect('/lessons/navigation-errors?created=7', 302);`,
      marks: ["'Content-Type': 'text/javascript'", 'sse.executeScript', 'c.redirect'],
    },
  ],
  errors: [
    {
      label: 'HTML',
      code: `
        <button data-on:click="$handledBusy = true; @post('/lessons/navigation-errors/explode/handled')"
                data-attr:disabled="$handledBusy">Do risky thing</button>

        <div id="toasts"></div>   <!-- in the shared layout -->`,
      marks: ['$handledBusy = true;', 'id="toasts"'],
    },
    {
      label: 'Server (Hono) — one error handler for the whole app',
      code: `
        app.onError((err, c) => {
          if (c.req.header('Datastar-Request') === 'true') return dsError(err.message); // 200 + toast
          return c.text('Something went wrong', 500);
        });

        // dsError streams: append a <Toast> to #toasts, patch { handledBusy: false },
        // wait 5s, then removeElements('#toast-3')`,
      marks: ['app.onError', "c.req.header('Datastar-Request')", 'dsError'],
    },
  ],
  double: [
    {
      label: 'HTML',
      code: `
        <!-- ✗ every click reaches the server -->
        <button data-on:click="@post('/lessons/navigation-errors/send-email')">Send</button>

        <!-- ✓ disabled while its OWN request is in flight -->
        <button data-on:click="@post('/lessons/navigation-errors/send-email')"
                data-indicator="sendingEmail"
                data-attr:disabled="$sendingEmail">Send</button>`,
      marks: ['data-indicator="sendingEmail"', 'data-attr:disabled="$sendingEmail"'],
    },
  ],
};

export const navigationErrorsDemo = new Hono();

navigationErrorsDemo.get('/', (c) => {
  const created = c.req.query('created');
  const via = c.req.query('via');
  return c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="Three things every real app needs: moving to another page after an action, showing errors people can actually see, and surviving an impatient double-click."
        guide="lessons/04-navigation-errors.md"
      />

      {created && (
        <div id="redirect-banner" class="banner" role="status">
          Created note #{created} (answered with: {via ?? 'unknown'}). Now check: did the address bar change?
        </div>
      )}

      <Demo
        id="navigate"
        code={CODE.navigate}
        title="1. Navigate after an action"
        shows="All three buttons create a note and try to send you to this page with ?created=N. Only two of them actually navigate."
      >
        <div class="stack">
          <div class="row">
            <button class="primary" data-on:click={`@post('${BASE}/create/javascript')`}>
              text/javascript
            </button>
            <button class="primary" data-on:click={`@post('${BASE}/create/execute-script')`}>
              SSE executeScript
            </button>
            <button data-on:click={`@post('${BASE}/create/302')`}>
              <span class="label-broken">Broken</span> 302 redirect
            </button>
          </div>
          {/* Two readouts that should always agree. After a real navigation they do; after the 302
              the server-rendered one is morphed in while the address bar stays put. */}
          <p class="readout">
            Server rendered this page for: <code id="server-url">{c.req.url.replace(/^https?:\/\/[^/]+/, '')}</code>
            <br />
            Your address bar says: <code data-text="location.pathname + location.search">{c.req.path}</code>
          </p>
        </div>
      </Demo>

      <Demo
        id="errors"
        code={CODE.errors}
        title="2. Errors you can see"
        shows="Both buttons hit a route that fails. One answers 500 itself (Datastar ignores it); the other throws, and the app's error handler answers 200 with a toast."
      >
        <div class="split" data-signals={signals({ naiveBusy: false, handledBusy: false })}>
          <div class="stack">
            <span class="label-broken">Broken</span>
            <button
              data-on:click={`$naiveBusy = true; @post('${BASE}/explode/naive')`}
              data-attr:disabled="$naiveBusy"
              data-text="$naiveBusy ? 'Working… forever' : 'Do risky thing'"
            >
              Do risky thing
            </button>
            <button data-show="$naiveBusy" style="display:none" data-on:click="$naiveBusy = false">
              Unstick it
            </button>
          </div>
          <div class="stack">
            <span class="label-fixed">Fixed</span>
            <button
              data-on:click={`$handledBusy = true; @post('${BASE}/explode/handled')`}
              data-attr:disabled="$handledBusy"
              data-text="$handledBusy ? 'Working…' : 'Do risky thing'"
            >
              Do risky thing
            </button>
          </div>
        </div>
      </Demo>

      <Demo
        id="double"
        code={CODE.double}
        title="3. The double-submit"
        shows="Each click 'sends an email' (the server takes 1.5s). Click the unguarded button three times fast, then compare with the guarded one."
      >
        <div class="stack" data-signals={signals({ emailsSent })}>
          <p class="score">
            Emails sent: <span data-text="$emailsSent">{emailsSent}</span>
          </p>
          <div class="row">
            <button data-on:click={`@post('${BASE}/send-email')`}>
              <span class="label-broken">Broken</span> Send (unguarded)
            </button>
            <button
              class="primary"
              data-on:click={`@post('${BASE}/send-email')`}
              data-indicator="sendingEmail"
              data-attr:disabled="$sendingEmail"
            >
              <span data-text="$sendingEmail ? 'Sending…' : 'Send (guarded)'">Send (guarded)</span>
            </button>
            <button data-on:click={`@post('${BASE}/reset-emails')`}>Reset</button>
          </div>
        </div>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  );
});

// 1. Navigation — three ways to answer an action that should move to another page.
navigationErrorsDemo.post('/create/javascript', (c) => {
  const id = ++noteSeq;
  return dsRedirect(c, `${PAGE}?created=${id}&via=text-javascript#navigate`);
});

navigationErrorsDemo.post('/create/execute-script', () => {
  const id = ++noteSeq;
  return ServerSentEventGenerator.stream((sse) => {
    sse.executeScript(`window.location.href = ${JSON.stringify(`${PAGE}?created=${id}&via=execute-script#navigate`)}`);
  });
});

navigationErrorsDemo.post('/create/302', (c) => {
  const id = ++noteSeq;
  return c.redirect(`${PAGE}?created=${id}&via=302`, 302);
});

// 2. Errors — the naive route answers 500 itself; the handled one just throws and lets
// app.onError (src/server.tsx) turn it into a visible toast.
navigationErrorsDemo.post('/explode/naive', async (c) => {
  await sleep(400);
  return c.json({ error: 'The risky thing failed' }, 500);
});

navigationErrorsDemo.post('/explode/handled', async (c) => { // c unused; kept so Break it #2 can `return c.json(…)`
  await sleep(400);
  throw new Error('the risky thing failed');
});

// 3. Double-submit — slow on purpose, and counts every request that reaches the server.
navigationErrorsDemo.post('/send-email', async () => {
  await sleep(1500);
  emailsSent += 1;
  return ServerSentEventGenerator.stream((sse) => {
    sse.patchSignals(JSON.stringify({ emailsSent }));
  });
});

navigationErrorsDemo.post('/reset-emails', () => {
  emailsSent = 0;
  return ServerSentEventGenerator.stream((sse) => {
    sse.patchSignals(JSON.stringify({ emailsSent }));
  });
});
