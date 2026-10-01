import type { EntityId } from "../simulation";
import {
  composeGroundedLine,
  type ComposedLineBank,
  type ComposedLineResult,
} from "./english-composition";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";

/**
 * A legislator objecting to what a bill costs, worded by the English engine.
 *
 * This beat used to be a bank of whole authored lines, and some of them said
 * things no record held: a vote on "smaller" bills, a "third year" of money,
 * "pilot language" being dropped. Here every part copies a fact from its
 * packet (the bill's designation, what it commits as it now reads, the place
 * the speaker answers to, who is being spoken to), each sourced to the record
 * it comes from. A part with nothing to copy is not written.
 *
 * The speaker's voice, which concern they reach for first, picks the bank;
 * a voice with nothing true to say about cost falls back to the shared one.
 */

export type CostObjectionVoice =
  | "district-advocate"
  | "fiscal-guardian"
  | "implementation-realist"
  | "procedural-institutionalist";

/** The words, each with the records that establish it. */
export interface CostObjectionFacts {
  readonly designation: GroundedEnglishFact;
  readonly listener: GroundedEnglishFact;
  /** What the whole bill commits as it now reads, when it commits money. */
  readonly billAmount: GroundedEnglishFact | null;
  /** The place the speaker answers to, when the bargain names one. */
  readonly place: GroundedEnglishFact | null;
}

export interface CostObjectionInput {
  readonly worldSeed: string;
  /** Stable for this turn, so the same state words the same line. */
  readonly momentKey: string;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonId: EntityId;
  readonly voice: CostObjectionVoice;
  readonly facts: CostObjectionFacts;
}

const VERSION = "1";

const SHARED: ComposedLineBank = {
  key: "legislative.object-on-cost",
  version: VERSION,
  surface: "dialogue",
  act: "complain",
  parts: {
    core: {
      variants: [
        {
          key: "cost-first",
          kind: "template",
          text: "{{listener}}, before I'm with you on {{designation}}, I need to know what it costs and who pays for it.",
        },
        {
          key: "answer-cost",
          kind: "template",
          text: "my question about {{designation}} is the cost, and I'd like that answered before anything else.",
        },
      ],
    },
    reason: {
      variants: [
        {
          key: "reads-now",
          kind: "template",
          text: "As it reads now, it commits {{bill-amount}}.",
        },
      ],
    },
  },
};

const FISCAL_GUARDIAN: ComposedLineBank = {
  key: "legislative.object-on-cost.fiscal-guardian",
  version: VERSION,
  surface: "dialogue",
  act: "complain",
  parts: {
    core: {
      variants: [
        {
          key: "exposure",
          kind: "template",
          text: "as it reads now, {{designation}} commits {{bill-amount}}. Tell me what comes out to make room for it.",
        },
        {
          key: "offset",
          kind: "template",
          text: "{{listener}}, {{designation}} spends {{bill-amount}}. Where's the offset?",
        },
      ],
    },
  },
};

const DISTRICT_ADVOCATE: ComposedLineBank = {
  key: "legislative.object-on-cost.district-advocate",
  version: VERSION,
  surface: "dialogue",
  act: "complain",
  parts: {
    core: {
      variants: [
        {
          key: "share",
          kind: "template",
          text: "I'm not against spending {{bill-amount}}. I want to know how much of it reaches {{place}}.",
        },
        {
          key: "share-plain",
          kind: "template",
          text: "I'm not against spending money on {{designation}}. I want to know how much of it reaches {{place}}.",
        },
      ],
    },
  },
};

const BY_VOICE: Partial<Record<CostObjectionVoice, ComposedLineBank>> = {
  "fiscal-guardian": FISCAL_GUARDIAN,
  "district-advocate": DISTRICT_ADVOCATE,
};

/** Exported for review tooling and tests. */
export const COST_OBJECTION_BANKS = [
  SHARED,
  FISCAL_GUARDIAN,
  DISTRICT_ADVOCATE,
] as const;

/** The packet a cost objection is worded from. */
export function costObjectionPacket(
  input: CostObjectionInput,
): GroundedEnglishPacket {
  const facts: Record<string, GroundedEnglishFact> = {
    designation: input.facts.designation,
    listener: input.facts.listener,
    ...(input.facts.billAmount
      ? { "bill-amount": input.facts.billAmount }
      : {}),
    ...(input.facts.place ? { place: input.facts.place } : {}),
  };
  return {
    surface: "dialogue",
    momentKey: `legislative.object-on-cost:${input.momentKey}`,
    worldSeed: input.worldSeed,
    bankVersion: VERSION,
    stage: "adult",
    sourceRecordIds: [input.speakerPersonId, input.listenerPersonId],
    facts,
    speaker: { personId: input.speakerPersonId, traits: {} },
    viewer: { personId: input.listenerPersonId, traits: {} },
    // The speaker read the bill and is in the room: they know each of these
    // from the same records that establish them.
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: input.speakerPersonId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
}

/**
 * The objection, worded from the packet: the speaker's own concern first,
 * the shared bank when that concern has nothing true to say.
 */
export function composeCostObjection(
  input: CostObjectionInput,
): Extract<ComposedLineResult, { kind: "rendered" }> {
  const packet = costObjectionPacket(input);
  const voiced = BY_VOICE[input.voice];
  const own = voiced ? composeGroundedLine(packet, voiced) : null;
  if (own?.kind === "rendered") return own;
  const shared = composeGroundedLine(packet, SHARED);
  if (shared.kind === "rendered") return shared;
  // The shared core needs only the designation and the listener, which every
  // bargain records; reaching here means the caller sent an unsourced packet.
  throw new Error(
    `A cost objection has no grounded wording: ${shared.reasons.join("; ")}`,
  );
}
