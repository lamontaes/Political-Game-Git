import type { EntityId } from "../simulation/types";
import type {
  RelationshipDimension,
  RelationshipStanding,
  StandingBand,
} from "../simulation/relationship-standing";
import {
  renderGroundedEnglish,
  type AuthoredEnglishVariant,
  type EnglishSurface,
  type GroundedEnglishPacket,
} from "./grounded-english";
import {
  REGISTER_CARDS,
  registerAllows,
  type SpeechDevice,
  type SpeechRegister,
} from "./speech-registers";

/**
 * Lines built from reviewed parts.
 *
 * The simulation decides what a person means (the speech act and its facts);
 * this module only words it. A line is an opener, the act's core, a reason and
 * a closer, in that order. Only the core is always present. Every part is a
 * small reviewed bank rendered through `renderGroundedEnglish`, so each part
 * keeps the same grounding, the same stable choice for a saved moment and the
 * same refusal when a fact is missing. Nothing here writes to the world.
 */

/**
 * The speech acts every line the simulation produces is labeled with. The list
 * is Lamontae's (English engine brief, September 26, 2026); it grows only
 * through him.
 */
export const SPEECH_ACTS = [
  "greet",
  "ask",
  "answer",
  "tell",
  "complain",
  "praise",
  "request",
  "offer",
  "agree",
  "suggest-another-way",
  "decline",
  "undecided",
  "persuade",
  "threaten",
  "deflect",
  "lie",
  "apologize",
] as const;

export type SpeechAct = (typeof SPEECH_ACTS)[number];

/** The parts of a line, in the order they are spoken. */
export const LINE_PARTS = ["opener", "core", "reason", "closer"] as const;

export type LinePart = (typeof LINE_PARTS)[number];

/**
 * A condition on how the speaker reads the listener, along one of the five
 * relationship lines. Bands, never numbers, as `relationship-standing.ts`
 * reads them.
 */
export interface RelationshipCondition {
  readonly dimension: RelationshipDimension;
  readonly bands: readonly StandingBand[];
  /** When set, the reading must (or must not) be on the adverse side. */
  readonly adverse?: boolean;
}

export type LinePartVariant = AuthoredEnglishVariant & {
  readonly requiresRelationship?: readonly RelationshipCondition[];
  /** Recorded mood keys this part may be spoken in. */
  readonly requiresMood?: readonly string[];
  /** The settings this part may be spoken in; omitted means any. */
  readonly registers?: readonly SpeechRegister[];
  /**
   * The crafted device this part makes, if any. A device is spoken only where
   * the register admits it, and a disclosure only from the speaker's own
   * recorded life.
   */
  readonly device?: SpeechDevice;
};

export interface LinePartBank {
  /** A required part that cannot be worded refuses the whole line. */
  readonly required?: boolean;
  readonly variants: readonly LinePartVariant[];
}

export interface ComposedLineBank {
  readonly key: string;
  readonly version: string;
  readonly surface: EnglishSurface;
  readonly act: SpeechAct;
  readonly parts: Readonly<Partial<Record<LinePart, LinePartBank>>> & {
    readonly core: LinePartBank;
  };
}

/** A recorded mood. The simulation records none yet, so callers omit it. */
export interface RecordedMood {
  readonly key: string;
  readonly sourceRecordIds: readonly EntityId[];
}

export interface CompositionContext {
  /** How the speaker reads the listener, from `readRelationshipStanding`. */
  readonly relationship?: Pick<RelationshipStanding, "readings">;
  readonly mood?: RecordedMood;
  /**
   * Part keys this speaker used with the player before this moment, read from
   * saved records. Reading them from the record, never from memory, keeps the
   * same moment producing the same line after Save and Continue.
   */
  readonly recentPartKeys?: readonly string[];
  /** Where the line is spoken. Parts limited to a register need one. */
  readonly register?: SpeechRegister;
  /**
   * Records of the speaker's own life: events they took part in and facts
   * about them. A disclosure may copy only facts sourced wholly from these.
   */
  readonly speakerOwnRecordIds?: readonly EntityId[];
}

export interface ComposedPart {
  readonly part: LinePart;
  /** `bank:part:variant`, the key a reviewer's feedback points at. */
  readonly partKey: string;
  readonly variantKey: string;
  readonly text: string;
  readonly usedFactKeys: readonly string[];
  readonly device?: SpeechDevice;
}

export type ComposedLineResult =
  | {
      readonly kind: "rendered";
      readonly act: SpeechAct;
      readonly text: string;
      readonly parts: readonly ComposedPart[];
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly kind: "missing-context";
      /** Internal diagnostics; never expose these to a player. */
      readonly reasons: readonly string[];
    };

export function partKey(
  bank: ComposedLineBank,
  part: LinePart,
  variantKey: string,
): string {
  return `${bank.key}:${part}:${variantKey}`;
}

/** Tag a saved event with the part keys of the line it records. */
export const LINE_PARTS_TAG_PREFIX = "english.line-parts.v1:";

export function linePartsTag(parts: readonly ComposedPart[]): string {
  return `${LINE_PARTS_TAG_PREFIX}${JSON.stringify(parts.map((part) => part.partKey))}`;
}

export function linePartsOf(tags: readonly string[]): readonly string[] | null {
  const tag = tags.find((entry) => entry.startsWith(LINE_PARTS_TAG_PREFIX));
  if (!tag) return null;
  try {
    const keys = JSON.parse(tag.slice(LINE_PARTS_TAG_PREFIX.length));
    return Array.isArray(keys) && keys.every((key) => typeof key === "string")
      ? keys
      : null;
  } catch {
    return null;
  }
}

/**
 * Saying no takes work (Pomerantz 1984; Heritage 1984). Declining and putting
 * off an answer carry a reason, and a speaker who is not at odds with the
 * listener eases into them ("Well, ..."). Agreeing is short: it drops the
 * reason. These are rules of how people talk, not draws: whether a line
 * softens follows the recorded relationship.
 */
export const REASONED_ACTS: readonly SpeechAct[] = ["decline", "undecided"];
export const SOFTENED_ACTS: readonly SpeechAct[] = [
  "decline",
  "undecided",
  "suggest-another-way",
];

/**
 * The engine's own slow openers for a line that eases into a refusal. They
 * start lower case after nothing, so the engine capitalizes the first; each
 * leaves the core to follow in lower case.
 */
export const SLOW_OPENER_BANK: LinePartBank = {
  variants: [
    { key: "well", kind: "template", text: "well," },
    { key: "oh", kind: "template", text: "oh," },
    {
      key: "i-mean",
      kind: "template",
      text: "I mean,",
      stages: ["adult"],
    },
  ],
};
const SLOW_OPENER_KEY = "english.slow-opener";

export function composeGroundedLine(
  packet: GroundedEnglishPacket,
  bank: ComposedLineBank,
  context: CompositionContext = {},
): ComposedLineResult {
  if (!SPEECH_ACTS.includes(bank.act))
    return missing([`Speech act ${bank.act} is not on the list.`]);
  if (REASONED_ACTS.includes(bank.act) && !bank.parts.reason)
    return missing([`A ${bank.act} line needs a reason part.`]);

  const recent = new Set(context.recentPartKeys ?? []);
  const parts: ComposedPart[] = [];
  const sourceRecordIds = new Set<EntityId>();
  const reasons: string[] = [];

  for (const part of LINE_PARTS) {
    // Agreeing is short: it gives no reason.
    if (part === "reason" && bank.act === "agree") continue;
    const own = bank.parts[part];
    const slow =
      part === "opener" &&
      !own &&
      SOFTENED_ACTS.includes(bank.act) &&
      eases(context);
    const partBank = own ?? (slow ? SLOW_OPENER_BANK : undefined);
    if (!partBank) continue;
    const bankKey = own ? bank.key : SLOW_OPENER_KEY;
    const required =
      part === "core" ||
      partBank.required === true ||
      (part === "reason" && REASONED_ACTS.includes(bank.act));

    const conditioned = partBank.variants.filter((variant) => {
      const blocked = conditionProblems(variant, context, packet);
      if (blocked.length > 0)
        reasons.push(`${part}/${variant.key}: ${blocked.join(", ")}`);
      return blocked.length === 0;
    });
    // Prefer parts this speaker has not used with the player lately; fall
    // back to the recent ones rather than refuse a line that can be said.
    const fresh = conditioned.filter(
      (variant) => !recent.has(`${bankKey}:${part}:${variant.key}`),
    );
    const attempts = fresh.length > 0 ? [fresh, conditioned] : [conditioned];

    let rendered: ReturnType<typeof renderGroundedEnglish> | null = null;
    let chosen: LinePartVariant | null = null;
    for (const variants of attempts) {
      if (variants.length === 0) continue;
      const result = renderGroundedEnglish(
        { ...packet, momentKey: `${packet.momentKey}/${part}` },
        {
          key: `${bankKey}:${part}`,
          version: bank.version,
          surface: bank.surface,
          variants,
        },
      );
      if (result.kind === "rendered") {
        rendered = result;
        chosen = variants.find((variant) => variant.key === result.variantKey)!;
        break;
      }
      reasons.push(...result.reasons.map((reason) => `${part}: ${reason}`));
    }

    if (!rendered || rendered.kind !== "rendered" || !chosen) {
      if (required)
        return missing(reasons.length > 0 ? reasons : [`No ${part} exists.`]);
      continue;
    }

    parts.push({
      part,
      partKey: `${bankKey}:${part}:${rendered.variantKey}`,
      variantKey: rendered.variantKey,
      text: rendered.text,
      usedFactKeys: rendered.usedFactKeys,
      ...(chosen.device ? { device: chosen.device } : {}),
    });
    for (const id of rendered.sourceRecordIds) sourceRecordIds.add(id);
    for (const id of conditionSources(chosen, context)) sourceRecordIds.add(id);
  }

  return {
    kind: "rendered",
    act: bank.act,
    text: sentenceStart(parts.map((part) => part.text.trim()).join(" ")),
    parts,
    sourceRecordIds: [...sourceRecordIds],
  };
}

/**
 * Whether the speaker eases into a refusal: yes, unless the recorded
 * relationship says the two are at odds, in which case it comes out flat.
 */
function eases(context: CompositionContext): boolean {
  const tension = context.relationship?.readings.tension;
  return !(
    tension &&
    tension.basis.length > 0 &&
    (tension.band === "marked" || tension.band === "strong")
  );
}

function conditionProblems(
  variant: LinePartVariant,
  context: CompositionContext,
  packet: GroundedEnglishPacket,
): string[] {
  const problems: string[] = [];
  if (variant.registers) {
    if (!context.register) problems.push("no register");
    else if (!variant.registers.includes(context.register))
      problems.push(`register is ${context.register}`);
  }
  if (variant.device) {
    if (!context.register) problems.push("no register for a device");
    else if (!registerAllows(context.register, variant.device))
      problems.push(`${context.register} does not admit ${variant.device}`);
    if (variant.device === "disclosure") {
      const own = new Set(context.speakerOwnRecordIds ?? []);
      const keys = variantFactKeys(variant);
      if (keys.length === 0)
        problems.push("a disclosure must copy a fact from the speaker's life");
      for (const key of keys) {
        const fact = packet.facts[key];
        if (
          fact &&
          (fact.sourceRecordIds.length === 0 ||
            fact.sourceRecordIds.some((id) => !own.has(id)))
        )
          problems.push(`fact ${key} is not from the speaker's own life`);
      }
    }
  }
  for (const condition of variant.requiresRelationship ?? []) {
    const reading = context.relationship?.readings[condition.dimension];
    if (!reading || reading.basis.length === 0) {
      problems.push(`no recorded ${condition.dimension}`);
      continue;
    }
    if (!condition.bands.includes(reading.band))
      problems.push(`${condition.dimension} is ${reading.band}`);
    if (
      condition.adverse !== undefined &&
      condition.adverse !== reading.adverse
    )
      problems.push(
        `${condition.dimension} is ${reading.adverse ? "" : "not "}adverse`,
      );
  }
  if (variant.requiresMood) {
    const mood = context.mood;
    if (!mood || mood.sourceRecordIds.length === 0)
      problems.push("no recorded mood");
    else if (!variant.requiresMood.includes(mood.key))
      problems.push(`mood is ${mood.key}`);
  }
  return problems;
}

const SLOT = /\{\{([a-z][a-z0-9-]*)\}\}/g;

function variantFactKeys(variant: LinePartVariant): string[] {
  const slots =
    variant.kind === "template"
      ? [...variant.text.matchAll(SLOT)].map((match) => match[1]!)
      : [variant.factKey];
  return [...new Set([...slots, ...(variant.requiresFacts ?? [])])];
}

function conditionSources(
  variant: LinePartVariant,
  context: CompositionContext,
): EntityId[] {
  const ids: EntityId[] = [];
  for (const condition of variant.requiresRelationship ?? [])
    ids.push(
      ...(context.relationship?.readings[condition.dimension].basis ?? []),
    );
  if (variant.requiresMood && context.mood)
    ids.push(...context.mood.sourceRecordIds);
  return ids;
}

/**
 * A core written to follow an opener ("Dana, groceries are up…") starts
 * lower case; whichever part is spoken first begins the sentence.
 */
function sentenceStart(text: string): string {
  return text.charAt(0).toLocaleUpperCase("en-US") + text.slice(1);
}

function missing(reasons: readonly string[]): ComposedLineResult {
  return { kind: "missing-context", reasons };
}

/**
 * One move of an address: what the speaker is doing at that point (thanking
 * the room, naming the other candidate, telling something from their own
 * life), worded from its own bank. A move that cannot be worded from the
 * record is left out, unless the address cannot stand without it.
 */
export interface AddressMove {
  readonly key: string;
  readonly bank: ComposedLineBank;
  readonly required?: boolean;
}

export interface ComposedMove {
  readonly move: string;
  readonly text: string;
  readonly parts: readonly ComposedPart[];
  readonly devices: readonly SpeechDevice[];
}

export type ComposedAddressResult =
  | {
      readonly kind: "rendered";
      readonly register: SpeechRegister;
      readonly moves: readonly ComposedMove[];
      readonly text: string;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly kind: "missing-context";
      /** Internal diagnostics; never expose these to a player. */
      readonly reasons: readonly string[];
    };

/**
 * A speech, a eulogy or a turn at a council microphone is a sequence of
 * moves, not one line (Research 2, register cards). Each move is composed
 * with the same grounding and the same stable choice as any line, under the
 * address's register, so devices appear only where that register admits
 * them. Only a public address is composed this way.
 */
export function composeAddress(
  packet: GroundedEnglishPacket,
  register: SpeechRegister,
  moves: readonly AddressMove[],
  context: Omit<CompositionContext, "register"> = {},
): ComposedAddressResult {
  if (REGISTER_CARDS[register].setting !== "public-address")
    return {
      kind: "missing-context",
      reasons: [`${register} is not a public address.`],
    };
  const composed: ComposedMove[] = [];
  const sources = new Set<EntityId>();
  const reasons: string[] = [];
  for (const move of moves) {
    const line = composeGroundedLine(
      { ...packet, momentKey: `${packet.momentKey}/${move.key}` },
      move.bank,
      { ...context, register },
    );
    if (line.kind !== "rendered") {
      reasons.push(...line.reasons.map((reason) => `${move.key}: ${reason}`));
      if (move.required) return { kind: "missing-context", reasons };
      continue;
    }
    composed.push({
      move: move.key,
      text: line.text,
      parts: line.parts,
      devices: line.parts.flatMap((part) => (part.device ? [part.device] : [])),
    });
    for (const id of line.sourceRecordIds) sources.add(id);
  }
  if (composed.length === 0)
    return {
      kind: "missing-context",
      reasons: reasons.length > 0 ? reasons : ["No move exists."],
    };
  return {
    kind: "rendered",
    register,
    moves: composed,
    text: composed.map((move) => move.text).join(" "),
    sourceRecordIds: [...sources],
  };
}
