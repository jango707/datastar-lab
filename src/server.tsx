import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { renderer } from './layout';
import { signalsDemo } from './demos/01-signals';
import { actionsDemo } from './demos/02-actions';

const app = new Hono();

app.use('/vendor/*', serveStatic({ root: './public' }));
app.use('/lab.css', serveStatic({ root: './public' }));
app.use(renderer);

app.get('/', (c) => c.redirect('/lessons/signals'));
app.route('/lessons/signals', signalsDemo);
app.route('/lessons/actions', actionsDemo);

const port = Number(process.env.PORT ?? 4321);
console.log(`Datastar Lab → http://localhost:${port}`);

export default { port, fetch: app.fetch };
