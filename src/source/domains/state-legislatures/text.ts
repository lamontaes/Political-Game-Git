/**
 * Turning a retrieved page into text a citation can be checked against.
 *
 * Every fact in this domain is a transcription: a compiled record says KNOWN
 * only when the excerpt it quotes is literally present in the bytes the lock
 * pins. That check needs one normalization both sides agree on, and it has to
 * be the dullest possible one — a normalizer that rewrote words could make a
 * quotation "match" a page that does not contain it, which is the failure this
 * whole design exists to prevent.
 *
 * So: script and style blocks go, tags become spaces, a fixed entity table is
 * decoded, and runs of whitespace collapse. Nothing is lowercased, nothing is
 * stemmed, no punctuation is rewritten and no word is touched. A publisher who
 * changes "thirty-five" to "35" breaks the match, and that is correct — the
 * sentence this repository read is no longer the sentence on the page.
 */

const ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
  ["ndash", "–"],
  ["mdash", "—"],
  ["lsquo", "‘"],
  ["rsquo", "’"],
  ["ldquo", "“"],
  ["rdquo", "”"],
  ["sect", "§"],
  ["para", "¶"],
  ["hellip", "…"],
]);

function decodeEntity(entity: string): string {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const code = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  if (entity.startsWith("#")) {
    const code = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  return ENTITIES.get(entity) ?? `&${entity};`;
}

/**
 * The normalized text of a retrieved page.
 *
 * Deliberately total: an artifact this substrate cannot decode still produces a
 * string, and the excerpt check then simply fails to find its quotation. A
 * throw here would turn "this page is not what we thought" into a build crash
 * rather than a missing fact.
 */
export function normalizeRetrievedText(bytes: Uint8Array): string {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const withoutScripts = raw
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withoutTags = withoutScripts.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(
    /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g,
    (_match, entity: string) => decodeEntity(entity),
  );
  return decoded.replace(/[\s\u00a0\u2007\u202f]+/g, " ").trim();
}

/** Whether a normalized page contains an excerpt, after the same collapsing. */
export function containsExcerpt(pageText: string, excerpt: string): boolean {
  const wanted = excerpt.replace(/[\s\u00a0]+/g, " ").trim();
  if (wanted === "") return false;
  return pageText.includes(wanted);
}
