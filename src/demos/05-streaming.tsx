import { Hono } from 'hono';
import { ServerSentEventGenerator } from '@starfederation/datastar-sdk/web';
import { Demo, LessonIntro, type Snippet } from '../components';
import { signals, sleep } from '../lib/signals';
import { toHtml } from '../lib/datastar';
import { lesson } from './index';

/**
 * Lesson 5 — Streaming.
 *
 * One request, a response that stays open while the server keeps sending patches.
 * The chat bot is fake (canned replies streamed word by word) so the lesson is about
 * the transport, not AI. The assistant bubble is re-sent WHOLE on every token and
 * morphed by id — "fat" patches, not deltas.
 * Walkthrough: lessons/05-streaming.md
 */

const meta = lesson('streaming');
const BASE = '/lessons/streaming';

const REPLIES: [RegExp, string][] = [
  [/signal/i, 'Signals are named values in one page-wide store. Attributes read them with $name and re-run when they change. The server can read them (readSignals) and write them (patchSignals).'],
  [/sse|stream|event/i, 'This reply IS a stream: one POST, one open response, and a datastar-patch-elements event for every word. Open DevTools → Network → this request → EventStream to watch them arrive.'],
  [/morph|patch|id/i, 'Every word re-sends my whole bubble with the same id, and Datastar morphs it in place. Fat patches keep the server simple: it always sends the full truth, never a diff.'],
  [/hello|hi|hey/i, 'Hello! Ask me about signals, streams or morphing. Or type the word fail to see a mid-stream error.'],
];
const FALLBACK = 'Good question. I am a very small robot that only knows about signals, streams and morphing. Try one of those words.';

const replyFor = (message: string) => REPLIES.find(([re]) => re.test(message))?.[1] ?? FALLBACK;

let turnSeq = 0;
let jobsStarted = 0;
let jobsAborted = 0;

function UserBubble({ text }: { text: string }) {
  return (
    <div class="bubble user">
      <span class="who">You</span>
      {text}
    </div>
  );
}

function BotBubble({ id, text }: { id: string; text: string }) {
  return (
    <div id={id} class="bubble bot">
      <span class="who">Bot</span>
      {text}
    </div>
  );
}

const CODE: Record<string, Snippet[]> = {
  chat: [
    {
      label: 'HTML',
      code: `
        <div id="chat-messages">…</div>
        <form data-on:submit="$message.trim() && !$chatBusy && ($chatBusy = true, @post('/lessons/streaming/chat'))">
          <input data-bind="message" data-attr:disabled="$chatBusy">`,
      marks: ['$chatBusy = true', 'id="chat-messages"'],
    },
    {
      label: 'Server (Hono) — one response, a patch per word',
      code: `
        return ServerSentEventGenerator.stream(async (sse) => {
          sse.patchElements(userBubble, { selector: '#chat-messages', mode: 'append' });
          for (const word of words) {
            text += ' ' + word;
            sse.patchElements('<div id="asst-3" class="bubble bot">' + text + '</div>'); // same id → morphed
            await sleep(70);
          }
          sse.patchSignals(JSON.stringify({ chatBusy: false }));
        });`,
      marks: ["mode: 'append'", 'id="asst-3"', 'await sleep(70)', '{ chatBusy: false }'],
    },
  ],
  progress: [
    {
      label: 'HTML',
      code: `
        <div class="bar-fill" data-style:width="$progress + '%'"></div>
        <button data-on:click="@post('/lessons/streaming/job')">Start job</button>`,
      marks: ["data-style:width=\"$progress + '%'\""],
    },
    {
      label: 'Server (Hono)',
      code: `
        return ServerSentEventGenerator.stream(async (sse) => {
          for (let p = 5; p <= 100; p += 5) {
            await sleep(150);
            if (aborted) return;                       // the browser left: stop working
            sse.patchSignals(JSON.stringify({ progress: p }));
          }
        }, {
          onAbort: () => { aborted = true; jobsAborted += 1; },
          onError: () => {},
        });`,
      marks: ['if (aborted) return;', 'onAbort'],
    },
  ],
};

export const streamingDemo = new Hono();

streamingDemo.get('/', (c) =>
  c.render(
    <>
      <LessonIntro
        meta={meta}
        intro="A streaming response stays open while the server keeps sending patches. That's how chat replies appear word by word, and how progress bars fill without polling."
        guide="lessons/05-streaming.md"
      />

      <Demo
        id="chat"
        code={CODE.chat}
        title="1. A streamed chat reply"
        shows="One POST per message. The server appends your bubble, shows a typing indicator, then streams the reply word by word into ONE bubble it morphs by id."
      >
        <div data-signals={signals({ message: '', chatBusy: false })}>
          <div id="chat-messages" class="chat" aria-live="polite">
            <BotBubble id="asst-welcome" text="Hi! Ask me about signals, streams or morphing. Type fail to see a mid-stream error." />
          </div>
          <form
            class="chat-form"
            data-on:submit={`$message.trim() && !$chatBusy && ($chatBusy = true, @post('${BASE}/chat'))`}
          >
            <label>
              Message
              <input data-bind="message" data-attr:disabled="$chatBusy" placeholder="ask about streams…" autocomplete="off" />
            </label>
            <button type="submit" class="primary" data-attr:disabled="$chatBusy || !$message.trim()">
              Send
            </button>
          </form>
        </div>
      </Demo>

      <Demo
        id="progress"
        code={CODE.progress}
        title="2. A progress stream (signals only)"
        shows="The job streams nothing but datastar-patch-signals events. A data-style binding turns $progress into the bar's width."
      >
        <div data-signals={signals({ progress: 0, jobStatus: 'Idle', jobsStarted, jobsAborted })}>
          <div class="bar" role="progressbar" aria-label="Job progress" data-attr:aria-valuenow="$progress" aria-valuemin="0" aria-valuemax="100">
            <div class="bar-fill" data-style:width="$progress + '%'"></div>
          </div>
          <p class="readout" data-text="$jobStatus">Idle</p>
          <div class="row">
            <button class="primary" data-on:click={`@post('${BASE}/job')`}>
              <span data-text="$progress > 0 && $progress < 100 ? 'Restart job' : 'Start job'">Start job</span>
            </button>
          </div>
          <p class="readout">
            Jobs started: <strong data-text="$jobsStarted">{jobsStarted}</strong> · streams the server saw
            aborted: <strong data-text="$jobsAborted">{jobsAborted}</strong>
          </p>
        </div>
      </Demo>
    </>,
    { title: meta.title, slug: meta.slug },
  ),
);

streamingDemo.post('/chat', async (c) => {
  const read = await ServerSentEventGenerator.readSignals(c.req.raw);
  const message = read.success ? String(read.signals.message ?? '').trim() : '';
  const turn = ++turnSeq;
  const botId = `asst-${turn}`;
  const typingId = `typing-${turn}`;

  return ServerSentEventGenerator.stream(async (sse) => {
    sse.patchElements(toHtml(<UserBubble text={message} />), { selector: '#chat-messages', mode: 'append' });
    sse.patchSignals(JSON.stringify({ message: '' }));
    sse.patchElements(`<div id="${typingId}" class="typing">Bot is typing…</div>`, {
      selector: '#chat-messages',
      mode: 'append',
    });
    await sleep(600);

    const words = replyFor(message).split(' ');
    const failAt = /fail/i.test(message) ? 6 : -1;
    let text = '';

    for (const [i, word] of words.entries()) {
      if (i === failAt) {
        // A stream is already committed to 200 + its own events: the global error handler
        // can't help mid-stream. Show the error in the thread and release the busy flag.
        sse.patchElements(`<div class="bubble error">Something broke mid-stream. Try again.</div>`, {
          selector: '#chat-messages',
          mode: 'append',
        });
        sse.patchSignals(JSON.stringify({ chatBusy: false }));
        return;
      }
      text += (i ? ' ' : '') + word;
      if (i === 0) {
        sse.removeElements(`#${typingId}`);
        sse.patchElements(toHtml(<BotBubble id={botId} text={text} />), { selector: '#chat-messages', mode: 'append' });
      } else {
        sse.patchElements(toHtml(<BotBubble id={botId} text={text} />)); // morph the same bubble by id
      }
      await sleep(70);
    }
    sse.patchSignals(JSON.stringify({ chatBusy: false }));
  });
});

streamingDemo.post('/job', () => {
  jobsStarted += 1;
  let aborted = false;
  return ServerSentEventGenerator.stream(
    async (sse) => {
      sse.patchSignals(JSON.stringify({ jobsStarted, progress: 0, jobStatus: 'Starting…' }));
      for (let p = 5; p <= 100; p += 5) {
        await sleep(150);
        if (aborted) return; // nobody is listening any more: stop working
        // jobsAborted rides along, so a restart shows the count the previous stream's onAbort bumped.
        sse.patchSignals(JSON.stringify({ progress: p, jobStatus: p < 100 ? `Working… ${p}%` : 'Done!', jobsAborted }));
      }
    },
    {
      // Called when the browser goes away mid-stream (e.g. a restart cancels this request).
      onAbort: () => {
        if (aborted) return;
        aborted = true;
        jobsAborted += 1;
      },
      // Writing to a stream the browser already closed throws; there's nothing left to do.
      onError: () => {},
    },
  );
});
