import type { Context } from 'hono';
import type { Child } from 'hono/jsx';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';

/**
 * Render a (synchronous) Hono JSX tree to an HTML string, for `sse.patchElements`.
 * Every component in this lab is synchronous, so `String()` is enough.
 */
export const toHtml = (node: Child): string => String(node);

/** True when the request came from a Datastar action (it sends `Datastar-Request: true`). */
export const isDatastarRequest = (c: Context): boolean => c.req.header('Datastar-Request') === 'true';

/**
 * Navigate the browser after an action (Lesson 4).
 *
 * A Datastar action can't follow a 302 into a new page — fetch follows the redirect
 * silently and Datastar receives the target page's HTML. So the server answers with
 * `text/javascript`, which Datastar executes.
 */
export function dsRedirect(c: Context, url: string): Response {
  return c.body(`window.location.href = ${JSON.stringify(url)};`, 200, {
    'Content-Type': 'text/javascript; charset=utf-8',
  });
}

let toastSeq = 0;

export function Toast({ id, message }: { id: string; message: string }) {
  return (
    <div id={id} class="toast" role="status">
      <span class="toast-icon" aria-hidden="true">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}

/** Hand-rolled busy signals that `dsError` releases (Lesson 4). Indicator signals reset themselves. */
export const KNOWN_BUSY_SIGNALS = ['handledBusy', 'chatBusy'] as const;

/**
 * Show an unexpected error on a Datastar request (Lesson 4).
 *
 * Datastar ignores non-2xx responses, so a 500 would vanish silently. This answers 200
 * with an SSE stream that appends a toast to `#toasts`, releases the known hand-rolled busy
 * signals, then removes its own toast a few seconds later.
 */
export function dsError(message: string): Response {
  const id = `toast-${++toastSeq}`;
  return ServerSentEventGenerator.stream(async (sse) => {
    sse.patchElements(toHtml(<Toast id={id} message={message} />), { selector: '#toasts', mode: 'append' });
    sse.patchSignals(JSON.stringify(Object.fromEntries(KNOWN_BUSY_SIGNALS.map((s) => [s, false]))));
    await new Promise((resolve) => setTimeout(resolve, 5000));
    sse.removeElements(`#${id}`);
  });
}
