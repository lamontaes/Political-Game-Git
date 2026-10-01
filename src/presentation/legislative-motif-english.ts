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
 * Bargaining-room beats worded by the English engine (A160, part 2).
 *
 * These four beats used to be banks of whole authored lines, and their lines
 * stated things no record held: a garage "on a replacement list since before
 * I was elected", "my water bill", "I can hold four of ours", "you've got
 * days, not weeks". Here every part copies a fact from its packet, each fact
 * sourced to the record it comes from. A part with nothing to copy is not
 * written, and a line that cannot be written from the record is not said.
 */

export type EnglishMotifFamily =
  | "district-beneficiary-concern"
  | "reciprocal-support"
  | "leadership-pressure"
  | "timing-warning";

export const ENGLISH_MOTIF_FAMILIES: readonly EnglishMotifFamily[] = [
  "district-beneficiary-concern",
  "reciprocal-support",
  "leadership-pressure",
  "timing-warning",
];

export type MotifVoice =
  | "district-advocate"
  | "fiscal-guardian"
  | "implementation-realist"
  | "procedural-institutionalist";

/**
 * Packet facts. The plain ones are words copied into the line; the last two
 * are states the line may assert ("nothing in it is written for…", "you put
 * it in…"), present only when the record shows them.
 */
export type MotifFactKey =
  | "designation"
  | "listener"
  | "section-label"
  | "chamber"
  | "next-step"
  | "beneficiary"
  | "place"
  | "amount"
  | "stated-ground"
  | "section-absent"
  | "section-adopted";

export interface MotifEnglishInput {
  readonly family: EnglishMotifFamily;
  readonly voice: MotifVoice;
  readonly worldSeed: string;
  /** Stable for this turn, so the same state words the same line. */
  readonly momentKey: string;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonId: EntityId;
  readonly facts: Readonly<Partial<Record<MotifFactKey, GroundedEnglishFact>>>;
}

const VERSION = "1";

function bank(
  key: string,
  act: ComposedLineBank["act"],
  parts: ComposedLineBank["parts"],
): ComposedLineBank {
  return { key, version: VERSION, surface: "dialogue", act, parts };
}

interface FamilyBanks {
  readonly shared: ComposedLineBank;
  readonly byVoice?: Partial<Record<MotifVoice, ComposedLineBank>>;
}

const BANKS: Readonly<Record<EnglishMotifFamily, FamilyBanks>> = {
  "district-beneficiary-concern": {
    shared: bank("legislative.district-beneficiary-concern", "complain", {
      core: {
        variants: [
          {
            key: "here-about",
            kind: "template",
            text: "I'm here about {{section-label}} of {{designation}}, {{listener}}, and who it's written for.",
          },
          {
            key: "want-written",
            kind: "template",
            text: "what I want is simple, {{listener}}: {{section-label}} written for {{beneficiary}}.",
          },
          {
            key: "nothing-written",
            kind: "template",
            text: "I've read {{designation}}. Nothing in it is written for {{place}}, and the people there can read too.",
            requiresFacts: ["section-absent"],
          },
        ],
      },
      reason: {
        variants: [
          { key: "stated-ground", kind: "template", text: "{{stated-ground}}" },
        ],
      },
    }),
    byVoice: {
      "district-advocate": bank(
        "legislative.district-beneficiary-concern.district-advocate",
        "complain",
        {
          core: {
            variants: [
              {
                key: "named-place",
                kind: "template",
                text: "{{place}} is nowhere in {{designation}}. Put {{beneficiary}} in {{section-label}} and that changes.",
                requiresFacts: ["section-absent"],
              },
            ],
          },
          reason: {
            variants: [
              {
                key: "stated-ground",
                kind: "template",
                text: "{{stated-ground}}",
              },
            ],
          },
        },
      ),
    },
  },

  "reciprocal-support": {
    shared: bank("legislative.reciprocal-support", "agree", {
      core: {
        variants: [
          {
            key: "with-you",
            kind: "template",
            text: "all right, {{listener}}. I'll be with you on {{designation}} when it reaches {{next-step}}.",
          },
          {
            key: "kept-word",
            kind: "template",
            text: "you put {{section-label}} in for {{beneficiary}}, so I'm with you on {{designation}} in the {{chamber}}.",
            requiresFacts: ["section-adopted"],
          },
        ],
      },
      closer: {
        variants: [
          {
            key: "remember",
            kind: "template",
            text: "I'd like you to remember who was with you on {{designation}}.",
          },
        ],
      },
    }),
  },

  "leadership-pressure": {
    shared: bank("legislative.leadership-pressure", "persuade", {
      core: {
        variants: [
          {
            key: "before-next-step",
            kind: "template",
            text: "{{designation}} goes to {{next-step}} next in the {{chamber}}. Whatever {{section-label}} is going to say, it has to say it before then.",
          },
          {
            key: "on-the-table",
            kind: "template",
            text: "{{section-label}} at {{amount}} is what's on the table, {{listener}}, and {{next-step}} is next. I'd settle it before the {{chamber}} does.",
          },
        ],
      },
    }),
  },

  "timing-warning": {
    shared: bank("legislative.timing-warning", "tell", {
      core: {
        variants: [
          {
            key: "clock",
            kind: "template",
            text: "whatever you're going to do to {{section-label}}, do it before {{next-step}}.",
          },
          {
            key: "next-step",
            kind: "template",
            text: "{{designation}} is at {{next-step}} next, {{listener}}. If {{section-label}} is changing, it changes before then.",
          },
        ],
      },
    }),
  },
};

/** Exported for review tooling and tests. */
export const MOTIF_ENGLISH_BANKS: readonly ComposedLineBank[] = Object.values(
  BANKS,
).flatMap((family) => [family.shared, ...Object.values(family.byVoice ?? {})]);

export function isEnglishMotifFamily(
  family: string,
): family is EnglishMotifFamily {
  return (ENGLISH_MOTIF_FAMILIES as readonly string[]).includes(family);
}

/** The packet a beat is worded from. */
export function motifEnglishPacket(
  input: MotifEnglishInput,
): GroundedEnglishPacket {
  const facts: Record<string, GroundedEnglishFact> = {};
  for (const [key, fact] of Object.entries(input.facts))
    if (fact) facts[key] = fact;
  return {
    surface: "dialogue",
    momentKey: `legislative.${input.family}:${input.momentKey}`,
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
 * The beat, worded from its packet: the speaker's own concern first, the
 * shared bank when that concern has nothing true to say.
 */
export function composeMotifEnglish(
  input: MotifEnglishInput,
): Extract<ComposedLineResult, { kind: "rendered" }> {
  const packet = motifEnglishPacket(input);
  const family = BANKS[input.family];
  const voiced = family.byVoice?.[input.voice];
  const own = voiced ? composeGroundedLine(packet, voiced) : null;
  if (own?.kind === "rendered") return own;
  const shared = composeGroundedLine(packet, family.shared);
  if (shared.kind === "rendered") return shared;
  // Each shared core has a variant that needs only the bill, the section and
  // the listener, which every bargain records.
  throw new Error(
    `Beat ${input.family} has no grounded wording: ${shared.reasons.join("; ")}`,
  );
}
