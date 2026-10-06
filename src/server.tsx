import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { renderer } from './layout';
import { dsError, isDatastarRequest } from './lib/datastar';
import { underTheHoodDemo } from './demos/00-under-the-hood';
import { signalsDemo } from './demos/01-signals';
import { actionsDemo } from './demos/02-actions';
import { serverSignalsDemo } from './demos/03-server-signals';
import { navigationErrorsDemo } from './demos/04-navigation-errors';
import { streamingDemo } from './demos/05-streaming';
import { liveDemo } from './demos/06-live';
import { islandsDemo } from './demos/07-islands';

const app = new Hono();

app.use('/vendor/*', serveStatic({ root: './public' }));
app.use('/lab.css', serveStatic({ root: './public' }));

// Pixel fonts (SIL OFL 1.1), served same-origin from their npm packages — no font CDN.
app.use(
  '/fonts/press-start-2p/*',
  serveStatic({ root: './node_modules/@fontsource/press-start-2p/files', rewriteRequestPath: (p) => p.replace(/^\/fonts\/press-start-2p/, '') }),
);
app.use(
  '/fonts/vt323/*',
  serveStatic({ root: './node_modules/@fontsource/vt323/files', rewriteRequestPath: (p) => p.replace(/^\/fonts\/vt323/, '') }),
);

// Lesson 7: client-side islands are TypeScript in src/islands/, transpiled on request.
const transpiler = new Bun.Transpiler({ loader: 'ts' });
app.get('/islands/:name{[a-z-]+\\.js}', async (c) => {
  const file = Bun.file(`./src/islands/${c.req.param('name').replace(/\.js$/, '.ts')}`);
  if (!(await file.exists())) return c.notFound();
  return c.body(transpiler.transformSync(await file.text()), 200, {
    'Content-Type': 'text/javascript; charset=utf-8',
  });
});

app.use(renderer);

app.get('/', (c) => c.redirect('/lessons/under-the-hood'));
app.route('/lessons/under-the-hood', underTheHoodDemo);
app.route('/lessons/signals', signalsDemo);
app.route('/lessons/actions', actionsDemo);
app.route('/lessons/server-signals', serverSignalsDemo);
app.route('/lessons/navigation-errors', navigationErrorsDemo);
app.route('/lessons/streaming', streamingDemo);
app.route('/lessons/live', liveDemo);
app.route('/lessons/islands', islandsDemo);

// Lesson 4: one error handler for the whole app. Datastar requests get a visible toast
// (as a 200, because Datastar ignores non-2xx); everything else gets a plain 500.
app.onError((err, c) => {
  console.error(err);
  if (isDatastarRequest(c)) return dsError(`Something went wrong: ${err.message}`);
  return c.text('Something went wrong', 500);
});

const port = Number(process.env.PORT ?? 4321);
console.log(`Datastar Lab → http://localhost:${port}`);

export default { port, fetch: app.fetch };
