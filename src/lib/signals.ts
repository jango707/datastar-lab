/**
 * Serialise server data into a `data-signals` attribute.
 *
 * JSON.stringify, plus escaping `<` so the payload can never close a tag.
 * Hono JSX HTML-escapes attribute values for us; the browser unescapes them
 * before Datastar reads the JSON.
 */
export function signals(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
