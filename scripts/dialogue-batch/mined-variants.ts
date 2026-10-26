/**
 * Real alternatives for a mined part, and the one axis on which each differs.
 * Development tooling for the multi-axis grading batch; it words nothing.
 *
 * A variant is always another real part of the same mined bank
 * (`data/english/parts/<bank>.json`) usable at the same moment: it shares the
 * part's subject and role (or its move, in banks without uses), and every
 * slot it needs is one the line already filled. The text shown is that part
 * with the line's own slot values, so a grader sees the same facts said
 * another way. Nothing is invented.
 *
 * Axes, each with a simple measurable proxy:
 *   length             the word counts differ by 3 or more
 *   sentence structure a question against a statement, or a different count of
 *                      sentences, at about the same length
 *   formality          contractions and greeting/answer words that tilt formal
 *                      or casual (`formalityOf`), at about the same length
 *   word choice        about the same length and structure and tone, but the
 *                      words differ
 *   personality fit    the speaker's sociability against the part's register
 *                      (`registerOf`): a warm, turned-back part for an outgoing
 *                      speaker, a brief one for a reserved speaker. Left out
 *                      when the speaker has no sociability on record or sits
 *                      near the middle.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const AXES = [
  "personality fit",
  "formality",
  "word choice",
  "sentence structure",
  "length",
] as const;
export type Axis = (typeof AXES)[number];

export interface BankPart {
  key: string;
  move: string;
  text: string;
  shippable?: boolean;
  uses?: { subject: string; role: string; choice: string }[];
}

export interface IndexedPart extends BankPart {
  /** The bank file, without the extension. */
  bank: string;
  /** Parts that share this are usable at the same moment. */
  moment: string[];
}

export const PARTS_DIR = "data/english/parts";

let indexed: Map<string, IndexedPart> | undefined;

/** Every shippable mined part, by key. */
export function minedParts(dir = PARTS_DIR): Map<string, IndexedPart> {
  if (indexed && dir === PARTS_DIR) return indexed;
  const parts = new Map<string, IndexedPart>();
  for (const file of readdirSync(dir).filter((name) =>
    name.endsWith(".json"),
  )) {
    const bank = file.replace(/\.json$/, "");
    const json = JSON.parse(readFileSync(join(dir, file), "utf8")) as {
      parts?: BankPart[];
    };
    for (const part of json.parts ?? []) {
      if (part.shippable === false) continue;
      const moment = part.uses?.length
        ? part.uses.map((use) => `${bank}|${use.subject}/${use.role}`)
        : [`${bank}|${part.move}`];
      parts.set(part.key, { ...part, bank, moment });
    }
  }
  if (dir === PARTS_DIR) indexed = parts;
  return parts;
}

/** The director's names for roles and derived subjects, as the mined bank's uses name them. */
const DIRECTOR_ROLE: Record<string, string> = { answers: "answer" };
const DIRECTOR_SUBJECT: Record<string, [string, string]> = {
  "their-school:raise": ["school", "ask"],
  "school-reply:reply": ["school", "answer"],
  "news-reply:reply": ["news", "answer"],
  "lie:reply": ["lie", "doubt"],
};

/** The mined moment a director line was worded in: `conversation:ack:reply` is `conversation|ack/reply`. */
export function minedMoment(bank: string | undefined): string | undefined {
  // A mined moment passes through: `address|campaign/thanks`.
  if (bank?.includes("|")) return bank;
  const [file, kind, role] = bank?.split(":") ?? [];
  if (!file || !kind || !role) return undefined;
  const [subject, use] = DIRECTOR_SUBJECT[`${kind}:${role}`] ?? [
    kind,
    DIRECTOR_ROLE[role] ?? role,
  ];
  return `${file}|${subject}/${use}`;
}

/**
 * The parts usable at the same moment as this one, never itself. When the
 * line's own moment is known, only parts used at that moment: "Okay." as an
 * acknowledgment is varied with other acknowledgments, not with goodbyes.
 */
export function sameMoment(
  part: IndexedPart,
  all: Map<string, IndexedPart>,
  moment?: string,
): IndexedPart[] {
  const mine = new Set(
    moment && part.moment.includes(moment) ? [moment] : part.moment,
  );
  return [...all.values()].filter(
    (other) =>
      other.key !== part.key && other.moment.some((moment) => mine.has(moment)),
  );
}

const SLOT = /\{(\w+)\}/g;

const NUMBER =
  /^(?:about |over |nearly )?\$?[\d,.]+%?$|^(?:one|two|three|four|five|six|seven|eight|nine|ten)$/i;
/** Slots that hold a number, an amount or a proper name: what a value must look like. */
const SLOT_SHAPE: Record<string, RegExp> = {
  age: NUMBER,
  years: NUMBER,
  n: NUMBER,
  count: NUMBER,
  number: NUMBER,
  votes: NUMBER,
  percent: NUMBER,
  amount: NUMBER,
  money: NUMBER,
  fee: NUMBER,
  year: /^\d{4}$/,
  name: /^\p{Lu}/u,
  other: /^\p{Lu}/u,
  opponent: /^\p{Lu}/u,
  relation: /^(?:my|his|her|their|our) \p{L}/iu,
};

function escape(text: string): string {
  return text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

/** The slot values a line's text filled into a part, or null if it is not that part. */
export function slotValues(
  part: Pick<BankPart, "text">,
  said: string,
): { values: Record<string, string>; index: number; length: number } | null {
  const names: string[] = [];
  const pattern = escape(part.text)
    .replace(/\\?\{(\w+)\\?\}/g, (_all, name: string) => {
      names.push(name);
      return "(.+?)";
    })
    .replace(/\{/g, "\\{");
  const match = new RegExp(`(?:^|(?<=[.?!] ))${pattern}(?=\\s|$)`, "i").exec(
    said,
  );
  if (!match) return null;
  const values: Record<string, string> = {};
  names.forEach((name, at) => {
    values[name] = match[at + 1]!;
  });
  // A slot holds the kind of fact it names: "My daughter was born." is not
  // "{relation} was {age}." with the age "born".
  for (const [name, value] of Object.entries(values))
    if (SLOT_SHAPE[name] && !SLOT_SHAPE[name].test(value)) return null;
  return { values, index: match.index, length: match[0].length };
}

/** A part's text with slot values filled; null when a slot has no value. */
export function fill(
  text: string,
  values: Record<string, string>,
): string | null {
  let missing = false;
  const filled = text.replace(SLOT, (_all, name: string) => {
    const value = values[name];
    if (value === undefined) missing = true;
    return value ?? "";
  });
  return missing ? null : filled;
}

const words = (text: string) => text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
const sentences = (text: string) =>
  text.split(/(?<=[.?!])\s+/).filter((piece) => piece.trim().length > 0);

const CONTRACTION =
  /\b\w+(?:n't|'re|'ve|'ll|'m|'d)\b|\b(?:it|that|there|what|who|he|she|here|let)'s\b/gi;
const CASUAL =
  /\b(?:yeah|yep|yup|nope|hey|hi|gonna|wanna|kinda|sorta|okay|ok|sure|really|pretty|guess|stuff|lot)\b/gi;
const FORMAL =
  /\b(?:good (?:morning|afternoon|evening)|hello|yes|certainly|indeed|pleased|however|please|thank you|sir|madam|appreciate|would|could|shall)\b/gi;

/** Higher is more formal; contractions and casual words pull it down. */
export function formalityOf(text: string): number {
  const count = (pattern: RegExp) => (text.match(pattern) ?? []).length;
  return count(FORMAL) - count(CASUAL) - count(CONTRACTION);
}

/** "warm" for a turned-back question, an exclamation or warm word; "brief" for a short plain statement. */
export function registerOf(text: string): "warm" | "brief" | "neutral" {
  if (/!|\b(?:great|glad|nice|love|wonderful|good to see)\b|\?$/i.test(text))
    return "warm";
  return words(text).length <= 3 ? "brief" : "neutral";
}

const jaccard = (a: string[], b: string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  const both = [...left].filter((word) => right.has(word)).length;
  return both / (left.size + right.size - both || 1);
};

/**
 * The one axis on which `variant` differs from `base`, by the proxies above,
 * or null when it differs on none or on several. `sociability` is the
 * speaker's, when on record.
 */
export function axisOf(
  base: string,
  variant: string,
  sociability?: number,
): Axis | null {
  if (base.trim() === variant.trim()) return null;
  const gap = words(variant).length - words(base).length;
  const questionChanged = /\?\s*$/.test(base) !== /\?\s*$/.test(variant);
  const countChanged = sentences(base).length !== sentences(variant).length;
  const toneGap = formalityOf(variant) - formalityOf(base);
  if (Math.abs(gap) >= 3 && !questionChanged && !countChanged) return "length";
  if (Math.abs(gap) > 2) return null;
  if (questionChanged || countChanged) return "sentence structure";
  if (toneGap !== 0) return "formality";
  if (sociability !== undefined && Math.abs(sociability) >= 0.3) {
    const wanted = sociability > 0 ? "warm" : "brief";
    if (registerOf(variant) === wanted && registerOf(base) !== wanted)
      return "personality fit";
  }
  if (jaccard(words(base), words(variant)) < 0.75) return "word choice";
  return null;
}

/** The words of a part that carry its meaning: slots, short words and addresses left out. */
const contentWords = (text: string) =>
  new Set(
    text
      .replace(/\{\w+\}/g, " ")
      .toLowerCase()
      .match(/[a-z']{4,}/g)
      ?.filter((word) => !STOP.has(word)) ?? [],
  );
const STOP = new Set([
  "that",
  "this",
  "with",
  "have",
  "your",
  "will",
  "what",
  "there",
  "from",
  "they",
  "were",
  "been",
  "would",
  "could",
  "chair",
  "madam",
  "speaker",
  "rise",
  "today",
  "briefly",
  "vote",
  "time",
]);

/**
 * Whether another part says the same line. A part whose moment names a
 * specific choice (a fine answer, a how-is question) is the same move by its
 * record; one filed only under a broad role ("run-meeting") must share a
 * meaning word with it (batch 10: "Please state your name for the record"
 * offered as another way to say "The meeting will come to order").
 */
export function saysTheSame(part: BankPart, other: BankPart): boolean {
  const broad = (part.uses ?? []).every(
    (use) => !use.choice || use.choice === use.role,
  );
  if (!broad) {
    // Same record, same choice: "I got married." never retells a birth.
    const choices = new Set(
      (part.uses ?? []).flatMap((use) =>
        use.choice && use.choice !== use.role ? [use.choice] : [],
      ),
    );
    return (other.uses ?? []).some(
      (use) => !!use.choice && choices.has(use.choice),
    );
  }
  const mine = contentWords(part.text);
  if (!mine.size) return true;
  return [...contentWords(other.text)].some((word) => mine.has(word));
}

export interface Variant {
  axis: Axis;
  /** The mined part that says it. */
  partKey: string;
  /** The part's text with the line's slot values. */
  partText: string;
  /** The whole line with this part said instead. */
  text: string;
}

/**
 * For a spoken line made of `partKeys`, up to five real variants, one per axis:
 * the part with the most same-moment alternatives is swapped, and the
 * alternative that differs on exactly one axis and is closest to the line
 * (fewest changed words) is kept for that axis.
 */
export function variantsFor(
  line: string,
  partKeys: readonly string[],
  sociability?: number,
  all = minedParts(),
  moment?: string,
  /** Refuses a part that is the same moment in name but not in meaning. */
  accept?: (other: IndexedPart, base: IndexedPart) => boolean,
): { varied: IndexedPart; variants: Variant[] } | null {
  let best: { varied: IndexedPart; variants: Variant[] } | null = null;
  for (const key of partKeys) {
    const part = all.get(key);
    if (!part) continue;
    const found = slotValues(part, line);
    if (!found) continue;
    const said = line.slice(found.index, found.index + found.length);
    const byAxis = new Map<Axis, Variant & { distance: number }>();
    for (const other of sameMoment(part, all, minedMoment(moment))) {
      if (accept && !accept(other, part)) continue;
      if (!saysTheSame(part, other)) continue;
      // The person addressed stays who they are: "Mr. Speaker" is never
      // varied into "Madam Speaker" (batch 10).
      const honorific = (text: string) =>
        /^(Mr\.|Madam|Ms\.|Mrs\.)/.exec(text)?.[1];
      if (
        honorific(part.text) &&
        honorific(other.text) &&
        honorific(part.text) !== honorific(other.text)
      )
        continue;
      const partText = fill(other.text, found.values);
      if (partText === null) continue;
      const axis = axisOf(said, partText, sociability);
      if (!axis) continue;
      const text = `${line.slice(0, found.index)}${partText}${line.slice(found.index + found.length)}`;
      if (text === line) continue;
      const distance = 1 - jaccard(words(said), words(partText));
      const current = byAxis.get(axis);
      if (
        !current ||
        distance < current.distance ||
        (distance === current.distance && other.key < current.partKey)
      )
        byAxis.set(axis, {
          axis,
          partKey: other.key,
          partText,
          text,
          distance,
        });
    }
    const variants = AXES.flatMap((axis) => {
      const row = byAxis.get(axis);
      return row ? [{ ...row, distance: undefined }] : [];
    }).map(({ axis, partKey, partText, text }) => ({
      axis,
      partKey,
      partText,
      text,
    }));
    // Distinct texts only: two axes never show the same words.
    const seen = new Set<string>();
    const distinct = variants.filter((row) => {
      if (seen.has(row.text)) return false;
      seen.add(row.text);
      return true;
    });
    if (!best || distinct.length > best.variants.length)
      best = { varied: part, variants: distinct };
  }
  return best && best.variants.length ? best : null;
}
