export type LessonMeta = {
  n: number;
  slug: string;
  title: string;
  ready: boolean;
};

/** The learning path. Flip `ready` when a lesson's file lands in this folder. */
export const LESSONS: LessonMeta[] = [
  { n: 1, slug: 'signals', title: 'Signals (no server)', ready: true },
  { n: 2, slug: 'actions', title: 'Actions + swap by id', ready: true },
  { n: 3, slug: 'server-signals', title: 'Server reads signals', ready: false },
  { n: 4, slug: 'navigation-errors', title: 'Navigation, errors, double-submit', ready: false },
  { n: 5, slug: 'streaming', title: 'Streaming', ready: false },
  { n: 6, slug: 'live', title: 'Live updates', ready: false },
  { n: 7, slug: 'islands', title: 'Where Datastar stops', ready: false },
];

export const lesson = (slug: string): LessonMeta => {
  const found = LESSONS.find((l) => l.slug === slug);
  if (!found) throw new Error(`Unknown lesson: ${slug}`);
  return found;
};
