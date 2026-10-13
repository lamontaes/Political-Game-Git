/**
 * Real speech for the director's lines (M4-02: wording composed from mined
 * speech, not hand-written banks). OPUS-WORDS mines whole sentences American
 * speakers said in public-domain federal transcripts into
 * `data/english/parts/<register>.json`, each filed under the director's own
 * subject, role and choice (or, for the journal, its row and field). A part
 * becomes another wording of the director's choice it is filed under, so the
 * choice and what it means stay the director's, and only its words vary.
 *
 * A part is used only when it fills exactly the slots the director's own
 * template for that choice fills: it can say nothing the records don't.
 */
import conversationParts from "../../data/english/parts/conversation.json" with { type: "json" };
import journalParts from "../../data/english/parts/journal.json" with { type: "json" };
import heldJson from "./data/parts-held.json" with { type: "json" };
import type { Variant } from "./render";

interface PartUse {
  subject?: string;
  role?: string;
  choice?: string;
  stages?: readonly string[];
  journal?: readonly { kindPrefix: string; field: string }[];
}
interface Part {
  key: string;
  text: string;
  shippable?: boolean;
  uses: readonly PartUse[];
}
interface PartsFile {
  parts: readonly Part[];
}

const REGISTERS: Readonly<Record<string, PartsFile>> = {
  conversation: conversationParts as unknown as PartsFile,
  journal: journalParts as unknown as PartsFile,
};

/** A part's slots ("{my_employer}") as the engine's ("{{my-employer}}"). */
export function asTemplate(text: string): string {
  return text.replace(
    /\{([a-z][a-z0-9_]*)\}/g,
    (_all, slot: string) => `{{${slot.replaceAll("_", "-")}}}`,
  );
}

const slotsOf = (template: string) =>
  [...template.matchAll(/\{\{(?<slot>[a-z][a-z0-9-]*)\}\}/g)]
    .map((match) => match.groups!.slot!)
    .sort()
    .join(",");

/** The director's bank field a part's role fills ("answer" fills "answers"). */
const FIELD: Readonly<Record<string, string>> = { answer: "answers" };

/** Parts that say something the records don't, held back with the reason. */
const HELD: ReadonlySet<string> = new Set(Object.keys(heldJson.held));

const index = new Map<string, Map<string, Part[]>>();
function indexOf(register: string): Map<string, Part[]> {
  let held = index.get(register);
  if (held) return held;
  held = new Map();
  for (const part of REGISTERS[register]?.parts ?? []) {
    if (part.shippable === false || HELD.has(part.key)) continue;
    for (const use of part.uses) {
      const keys = use.journal?.length
        ? use.journal.map(
            (row) => `${row.kindPrefix}|${row.field}|${use.choice ?? ""}`,
          )
        : [
            `${use.subject ?? ""}|${FIELD[use.role ?? ""] ?? use.role ?? ""}|${use.choice ?? ""}`,
          ];
      for (const key of keys) held.set(key, [...(held.get(key) ?? []), part]);
    }
  }
  index.set(register, held);
  return held;
}

/**
 * A director choice with its mined wordings added: the choice's own variant
 * first, then each part filed under it that fills the same slots, with the
 * choice's stages.
 */
export function withParts(
  register: string,
  group: string,
  field: string,
  variant: Variant,
): Variant[] {
  const parts = indexOf(register).get(`${group}|${field}|${variant.key}`);
  if (!parts?.length) return [variant];
  const slots = slotsOf(variant.text);
  const out: Variant[] = [variant];
  for (const part of parts) {
    const text = asTemplate(part.text);
    if (slotsOf(text) !== slots || text === variant.text) continue;
    out.push({
      key: `${variant.key}~${part.key}`,
      text,
      ...(variant.stages ? { stages: variant.stages } : {}),
    });
  }
  return out;
}
