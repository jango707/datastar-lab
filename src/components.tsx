import type { Child } from 'hono/jsx';
import type { LessonMeta } from './demos/index';

/** Lesson heading + a pointer to the step-by-step walkthrough in `lessons/`. */
export function LessonIntro({ meta, intro, guide }: { meta: LessonMeta; intro: string; guide: string }) {
  return (
    <header>
      <p class="eyebrow">Lesson {meta.n}</p>
      <h1>{meta.title}</h1>
      <p class="intro">
        {intro} Follow along with <code>{guide}</code> — it walks through every demo step by step.
      </p>
    </header>
  );
}

/** One self-contained demo. `shows` is the one-line takeaway; the walkthrough has the detail. */
export function Demo({ id, title, shows, children }: { id: string; title: string; shows: string; children: Child }) {
  return (
    <section class="demo" id={id} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{title}</h3>
      <p class="demo-note">{shows}</p>
      {children}
    </section>
  );
}
