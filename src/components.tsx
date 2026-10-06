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

/** A code excerpt shown under a demo. `marks` are exact substrings to highlight. */
export type Snippet = { label: string; code: string; marks?: string[] };

/** Strip the shared indentation (and the first/last blank line) from a template literal. */
export function dedent(text: string): string {
  const lines = text.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Split code into plain parts and <mark>ed parts. JSX escapes every part, so code is never parsed as HTML. */
function highlight(code: string, marks: string[]): Child[] {
  if (!marks.length) return [code];
  for (const m of marks) if (!code.includes(m)) console.warn(`[CodeBits] mark not found in snippet: ${m}`);
  const re = new RegExp(`(${[...marks].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'g');
  return code.split(re).map((part, i) => (i % 2 === 1 ? <mark>{part}</mark> : part));
}

/** "Code" panel: simplified, highlighted excerpts of what makes the demo above work. */
export function CodeBits({ snippets, title = 'Code (simplified excerpt)' }: { snippets: Snippet[]; title?: string }) {
  return (
    <details class="code-bits" open>
      <summary>{title}</summary>
      {snippets.map((s) => (
        <figure class="code">
          <figcaption>{s.label}</figcaption>
          <pre>
            <code>{highlight(dedent(s.code), s.marks ?? [])}</code>
          </pre>
        </figure>
      ))}
    </details>
  );
}

/** One self-contained demo. `shows` is the one-line takeaway; `code` the excerpts that make it work. */
export function Demo({
  id,
  title,
  shows,
  code,
  children,
}: {
  id: string;
  title: string;
  shows: string;
  code?: Snippet[];
  children: Child;
}) {
  return (
    <section class="demo" id={id} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>{title}</h3>
      <p class="demo-note">{shows}</p>
      {children}
      {code && <CodeBits snippets={code} />}
    </section>
  );
}
