import type { ProseDomain } from "./types";

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
 * (`ordinary-life:public-meeting`). Preserving the bank's key exactly is
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

/** Slot names a template expects: `{self}`, `{role:colleague}`, `{place}`. */
export function templateSlots(text: string): readonly string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{([^{}]+)\}/g)) {
    const name = match[1];
    if (name !== undefined) found.add(name);
  }
  return [...found].sort();
}
