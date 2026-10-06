import type { Child } from 'hono/jsx';
import { jsxRenderer } from 'hono/jsx-renderer';
import { LESSONS } from './demos/index';

type PageProps = { title: string; slug?: string };

declare module 'hono' {
  interface ContextRenderer {
    (content: string | Promise<string>, props: PageProps): Response | Promise<Response>;
  }
}

/**
 * The page shell: lesson nav | lesson content | live signals inspector.
 *
 * Datastar is loaded ONCE here, from a vendored copy served same-origin (no CDN),
 * the same way a production app with a strict Content-Security-Policy would.
 */
export const renderer = jsxRenderer(
  ({ children, title, slug }: { children?: Child } & PageProps) => (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Datastar Lab`}</title>
        <link rel="stylesheet" href="/lab.css" />
        <script type="module" src="/vendor/datastar-1.0.2.js"></script>
      </head>
      <body>
        <div class="shell">
          <nav class="nav" aria-label="Lessons">
            <p class="nav-title">
              <a href="/">Datastar Lab</a>
            </p>
            <ol>
              {LESSONS.map((l) => (
                <li>
                  {l.ready ? (
                    <a href={`/lessons/${l.slug}`} aria-current={l.slug === slug ? 'page' : undefined}>
                      {l.n}. {l.title}
                    </a>
                  ) : (
                    <span aria-disabled="true">
                      {l.n}. {l.title}
                      <span class="soon">soon</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <main class="main">{children}</main>
          <aside class="inspector" aria-label="Signals inspector">
            <h2>Live signals</h2>
            {/* data-json-signals prints every signal on the page as JSON and re-renders on change. */}
            <pre data-json-signals></pre>
          </aside>
        </div>
      </body>
    </html>
  ),
  { docType: true },
);
