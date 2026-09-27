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
}

export interface ComposedPart {
  readonly part: LinePart;
  /** `bank:part:variant`, the key a reviewer's feedback points at. */
  readonly partKey: string;
  readonly variantKey: string;
  readonly text: string;
  readonly usedFactKeys: readonly string[];
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

export function composeGroundedLine(
  packet: GroundedEnglishPacket,
  bank: ComposedLineBank,
  context: CompositionContext = {},
): ComposedLineResult {
  if (!SPEECH_ACTS.includes(bank.act))
    return missing([`Speech act ${bank.act} is not on the list.`]);

  const recent = new Set(context.recentPartKeys ?? []);
  const parts: ComposedPart[] = [];
  const sourceRecordIds = new Set<EntityId>();
  const reasons: string[] = [];

  for (const part of LINE_PARTS) {
    const partBank = bank.parts[part];
    if (!partBank) continue;
    const required = part === "core" || partBank.required === true;

    const conditioned = partBank.variants.filter((variant) => {
      const blocked = conditionProblems(variant, context);
      if (blocked.length > 0)
        reasons.push(`${part}/${variant.key}: ${blocked.join(", ")}`);
      return blocked.length === 0;
    });
    // Prefer parts this speaker has not used with the player lately; fall
    // back to the recent ones rather than refuse a line that can be said.
    const fresh = conditioned.filter(
      (variant) => !recent.has(partKey(bank, part, variant.key)),
    );
    const attempts = fresh.length > 0 ? [fresh, conditioned] : [conditioned];

    let rendered: ReturnType<typeof renderGroundedEnglish> | null = null;
    let chosen: LinePartVariant | null = null;
    for (const variants of attempts) {
      if (variants.length === 0) continue;
      const result = renderGroundedEnglish(
        { ...packet, momentKey: `${packet.momentKey}/${part}` },
        {
          key: `${bank.key}:${part}`,
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
      partKey: partKey(bank, part, rendered.variantKey),
      variantKey: rendered.variantKey,
      text: rendered.text,
      usedFactKeys: rendered.usedFactKeys,
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

function conditionProblems(
  variant: LinePartVariant,
  context: CompositionContext,
): string[] {
  const problems: string[] = [];
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
