import type { ProseDomain, ProseRecord } from "./types";

/**
 * Semantic coordinates, not positions.
 *
 * The old #92 corpus numbered strings globally — S-0001, C-0251 — which meant
 * inserting one line renumbered everything after it, and an owner's mark
 * against S-0417 silently came to refer to a different sentence. Every ID here
 * is built from coordinates the repository already keeps stable: the bank, the
 * item's own key, and the field within it. Adding an unrelated line changes no
 * existing ID, and seed order and page position cannot reach these at all.
 *
 * Array position appears only where a bank genuinely has no key for the part —
 * a stage's `lines` are an ordered list of sentences with no per-sentence key —
 * and there it is scoped inside the stage's stable key rather than global, so
 * the blast radius of an insertion is the one stage that was edited.
 */

const SEGMENT = /^[A-Za-z0-9._\-/]+$/;
/**
 * The stable key and the field may also carry colons.
 *
 * A field is itself compound — `option:speak-up:label` names the option and
 * the part of it — and a bank's own key sometimes carries one already
 * (`ordinary-life:household-errands`). Preserving the bank's key exactly is
 * worth more than a tidy character set: a reviewer searching the source for
 * the key in the ID must find it. Both sit after the head's first two colons,
 * which is where parsing stops splitting, so neither is ambiguous.
 */
const COMPOUND = /^[A-Za-z0-9._\-/:]+$/;

function checkSegment(
  part: string,
  value: string,
  pattern: RegExp = SEGMENT,
): string {
  if (value.length === 0) {
    throw new Error(`A prose ID's ${part} may not be empty.`);
  }
  if (!pattern.test(value)) {
    throw new Error(
      `A prose ID's ${part} may only use letters, digits, dot, dash, underscore, slash${pattern === COMPOUND ? " and colon" : ""}: ${value}`,
    );
  }
  return value;
}

/**
 * `prose:<domain>:<bank>:<stable-key>#<field>`
 *
 * Readable on purpose. An owner reviewing a line should be able to tell from
 * the ID alone which file to open and what to search for in it.
 */
export function proseId(input: {
  readonly domain: ProseDomain;
  readonly bank: string;
  readonly stableKey: string;
  readonly field: string;
}): string {
  const domain = checkSegment("domain", input.domain);
  const bank = checkSegment("bank", input.bank);
  const stableKey = checkSegment("stable key", input.stableKey, COMPOUND);
  const field = checkSegment("field", input.field, COMPOUND);
  return `prose:${domain}:${bank}:${stableKey}#${field}`;
}

export interface ParsedProseId {
  readonly domain: string;
  readonly bank: string;
  readonly stableKey: string;
  readonly field: string;
}

export function parseProseId(id: string): ParsedProseId | null {
  const hash = id.indexOf("#");
  if (!id.startsWith("prose:") || hash < 0) return null;
  const head = id.slice("prose:".length, hash);
  const field = id.slice(hash + 1);
  const firstColon = head.indexOf(":");
  const secondColon = head.indexOf(":", firstColon + 1);
  if (firstColon < 0 || secondColon < 0) return null;
  return {
    domain: head.slice(0, firstColon),
    bank: head.slice(firstColon + 1, secondColon),
    stableKey: head.slice(secondColon + 1),
    field,
  };
}

export interface IdCollision {
  readonly id: string;
  readonly sources: readonly string[];
}

/**
 * Two records may never share an ID. Fails closed.
 *
 * Identical *text* at two semantic locations is fine and expected — two banks
 * can legitimately both say "You could let it go." — and each keeps its own
 * ID. What is never fine is two records claiming the same coordinates, because
 * then an owner's mark is ambiguous and a differential report cannot tell
 * which one changed.
 */
export function findIdCollisions(
  records: readonly ProseRecord[],
): readonly IdCollision[] {
  const byId = new Map<string, string[]>();
  for (const record of records) {
    const where = `${record.sourcePath}:${record.stableKey}#${record.field}`;
    const existing = byId.get(record.id);
    if (existing) existing.push(where);
    else byId.set(record.id, [where]);
  }
  const collisions: IdCollision[] = [];
  for (const [id, sources] of byId) {
    if (sources.length > 1) collisions.push({ id, sources: [...sources] });
  }
  return collisions.sort((left, right) => (left.id < right.id ? -1 : 1));
}

export function assertNoIdCollisions(records: readonly ProseRecord[]): void {
  const collisions = findIdCollisions(records);
  if (collisions.length === 0) return;
  const detail = collisions
    .map((entry) => `  ${entry.id}\n    ${entry.sources.join("\n    ")}`)
    .join("\n");
  throw new Error(
    `${collisions.length} prose ID collision(s). Semantic coordinates must be unique:\n${detail}`,
  );
}

/** Slot names a template expects: `{self}`, `{role:colleague}`, `{place}`. */
export function templateSlots(text: string): readonly string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{([^{}]+)\}/g)) {
    const name = match[1];
    if (name !== undefined) found.add(name);
  }
  return [...found].sort();
}
