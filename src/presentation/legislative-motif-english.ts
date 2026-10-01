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
 * Bargaining-room beats worded by the English engine (A160, parts 2 to 4).
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
  | "timing-warning"
  | "refuse-to-commit-yet"
  | "object-on-implementation"
  | "accept-principle-reject-mechanism"
  | "demand-narrower-scope"
  | "press-visibility-concern"
  | "remind-of-commitment"
  | "confront-broken-commitment"
  | "defend-broken-commitment";

export const ENGLISH_MOTIF_FAMILIES: readonly EnglishMotifFamily[] = [
  "district-beneficiary-concern",
  "reciprocal-support",
  "leadership-pressure",
  "timing-warning",
  "refuse-to-commit-yet",
  "object-on-implementation",
  "accept-principle-reject-mechanism",
  "demand-narrower-scope",
  "press-visibility-concern",
  "remind-of-commitment",
  "confront-broken-commitment",
  "defend-broken-commitment",
];

export type MotifVoice =
  | "district-advocate"
  | "fiscal-guardian"
  | "implementation-realist"
  | "procedural-institutionalist";

/**
 * Packet facts. The plain ones are words copied into the line; the states
 * (section absent or adopted, a commitment honored or departed from) are
 * things the line may assert, present only when the record shows them.
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
  | "section-heading"
  | "analyst"
  | "bill-amount"
  | "section-absent"
  | "section-adopted"
  | "reach"
  | "prior-statement"
  | "unmet-condition"
  | "commitment-honored"
  | "commitment-departed";

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
  "refuse-to-commit-yet": {
    shared: bank("legislative.refuse-to-commit-yet", "undecided", {
      opener: {
        variants: [{ key: "name", kind: "template", text: "{{listener}}," }],
      },
      core: {
        variants: [
          {
            key: "not-today",
            kind: "template",
            text: "I'm not going to tell you yes on {{designation}} today.",
          },
          {
            key: "not-yet",
            kind: "template",
            text: "not yet on {{designation}}.",
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "section-settles",
            kind: "template",
            text: "Ask me again when {{section-label}} says what it's going to say.",
          },
        ],
      },
    }),
    byVoice: {
      "fiscal-guardian": bank(
        "legislative.refuse-to-commit-yet.fiscal-guardian",
        "undecided",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "not-until-number",
                kind: "template",
                text: "not until I know what {{designation}} commits us to.",
              },
            ],
          },
          reason: {
            variants: [
              {
                key: "reads-now",
                kind: "template",
                text: "As it reads now it's {{bill-amount}}, and I want to see that number hold.",
              },
            ],
          },
        },
      ),
      "implementation-realist": bank(
        "legislative.refuse-to-commit-yet.implementation-realist",
        "undecided",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "not-yet",
                kind: "template",
                text: "not yet on {{designation}}.",
              },
            ],
          },
          reason: {
            variants: [
              {
                key: "analyst-first",
                kind: "template",
                text: "I want {{analyst}}'s read on {{section-label}} before I put my name on it.",
              },
            ],
          },
        },
      ),
      "procedural-institutionalist": bank(
        "legislative.refuse-to-commit-yet.procedural-institutionalist",
        "undecided",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "not-yet",
                kind: "template",
                text: "not yet on {{designation}}.",
              },
            ],
          },
          reason: {
            variants: [
              {
                key: "how-it-comes",
                kind: "template",
                text: "I'll answer when I know how it comes to {{next-step}} in the {{chamber}}.",
              },
            ],
          },
        },
      ),
    },
  },

  "object-on-implementation": {
    shared: bank("legislative.object-on-implementation", "complain", {
      core: {
        variants: [
          {
            key: "who-runs-it",
            kind: "template",
            text: "before I'm with you on {{designation}}, {{listener}}, I want to know who runs {{section-label}} and how.",
          },
          {
            key: "heading",
            kind: "template",
            text: "{{section-label}}, {{section-heading}}: tell me who runs it.",
          },
        ],
      },
    }),
    byVoice: {
      "implementation-realist": bank(
        "legislative.object-on-implementation.implementation-realist",
        "complain",
        {
          core: {
            variants: [
              {
                key: "hear-from-runner",
                kind: "template",
                text: "I want to hear from whoever would have to run {{section-label}} before I put my name on {{designation}}.",
              },
              {
                key: "analyst",
                kind: "template",
                text: "{{analyst}} can tell us what it takes to stand up {{section-label}}. I'd like that before {{next-step}}.",
              },
            ],
          },
        },
      ),
      "procedural-institutionalist": bank(
        "legislative.object-on-implementation.procedural-institutionalist",
        "complain",
        {
          core: {
            variants: [
              {
                key: "settle-first",
                kind: "template",
                text: "I'd like {{section-label}} settled before {{next-step}}, not fixed on the floor of the {{chamber}}.",
              },
            ],
          },
        },
      ),
    },
  },

  "accept-principle-reject-mechanism": {
    shared: bank(
      "legislative.accept-principle-reject-mechanism",
      "suggest-another-way",
      {
        opener: {
          variants: [{ key: "name", kind: "template", text: "{{listener}}," }],
        },
        core: {
          variants: [
            {
              key: "agree-not-this",
              kind: "template",
              text: "I agree with what you're trying to do with {{designation}}. I don't agree that {{section-label}} is how you do it.",
            },
          ],
        },
      },
    ),
    byVoice: {
      "implementation-realist": bank(
        "legislative.accept-principle-reject-mechanism.implementation-realist",
        "suggest-another-way",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "goal-not-part",
                kind: "template",
                text: "the goal of {{designation}} I can support. {{section-label}}, {{section-heading}}, is the part I can't.",
              },
            ],
          },
        },
      ),
    },
  },

  "demand-narrower-scope": {
    shared: bank("legislative.demand-narrower-scope", "suggest-another-way", {
      opener: {
        variants: [{ key: "name", kind: "template", text: "{{listener}}," }],
      },
      core: {
        variants: [
          {
            key: "narrow-it",
            kind: "template",
            text: "narrow {{section-label}} and I can defend it.",
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "as-drafted",
            kind: "template",
            text: "As drafted it reaches {{reach}}.",
          },
        ],
      },
    }),
    byVoice: {
      "fiscal-guardian": bank(
        "legislative.demand-narrower-scope.fiscal-guardian",
        "suggest-another-way",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "who-it-reaches",
                kind: "template",
                text: "tighten who {{section-label}} reaches.",
              },
            ],
          },
          reason: {
            variants: [
              {
                key: "reach-and-total",
                kind: "template",
                text: "As drafted it reaches {{reach}}, and {{designation}} reads {{bill-amount}} now.",
              },
            ],
          },
        },
      ),
      "implementation-realist": bank(
        "legislative.demand-narrower-scope.implementation-realist",
        "suggest-another-way",
        {
          opener: {
            variants: [
              { key: "name", kind: "template", text: "{{listener}}," },
            ],
          },
          core: {
            variants: [
              {
                key: "pilot-first",
                kind: "template",
                text: "start {{section-label}} as a pilot before it reaches {{reach}}.",
              },
            ],
          },
        },
      ),
    },
  },

  "press-visibility-concern": {
    shared: bank("legislative.press-visibility-concern", "tell", {
      core: {
        variants: [
          {
            key: "named-line",
            kind: "template",
            text: "a section naming {{beneficiary}} in {{designation}} is the part people will read about.",
          },
          {
            key: "merits",
            kind: "template",
            text: "I can defend {{section-label}} on the merits. I'd rather do it in the {{chamber}} than in a headline.",
          },
        ],
      },
    }),
  },

  // The three commitment beats speak about the member's own recorded words
  // and where they stand. A line says a vote was kept, or was not, only when
  // the commitment's assessment records it; with no commitment the member
  // speaks about the bill and claims nothing.
  "remind-of-commitment": {
    shared: bank("legislative.remind-of-commitment", "tell", {
      core: {
        variants: [
          {
            key: "i-said",
            kind: "template",
            text: "I said this to you: {{prior-statement}}",
          },
          {
            key: "where-we-stand",
            kind: "template",
            text: "let's be clear about where each of us stands on {{designation}}.",
          },
        ],
      },
      // Said whenever the record shows the vote kept the word, and only then.
      reason: {
        variants: [
          {
            key: "kept",
            kind: "template",
            text: "I voted the way I said I would on {{designation}}.",
            requiresFacts: ["commitment-honored"],
          },
        ],
      },
      closer: {
        variants: [
          {
            key: "count",
            kind: "template",
            text: "I'd like that to count for something on {{designation}}.",
            requiresFacts: ["prior-statement"],
          },
        ],
      },
    }),
  },

  "confront-broken-commitment": {
    shared: bank("legislative.confront-broken-commitment", "complain", {
      core: {
        variants: [
          {
            key: "leaves-us",
            kind: "template",
            text: "I'd like to know where {{designation}} leaves the two of us.",
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "not-happened",
            kind: "template",
            text: "What I asked for hasn't happened: {{unmet-condition}}.",
          },
          {
            key: "still-absent",
            kind: "template",
            text: "{{section-label}} is still not in {{designation}}.",
            requiresFacts: ["section-absent"],
          },
        ],
      },
      closer: {
        variants: [
          {
            key: "remember",
            kind: "template",
            text: "I told you {{prior-statement}} I'm going to remember it.",
          },
        ],
      },
    }),
  },

  "defend-broken-commitment": {
    shared: bank("legislative.defend-broken-commitment", "answer", {
      core: {
        variants: [
          {
            key: "own-ground",
            kind: "template",
            text: "I'll answer for where I stand on {{designation}}.",
          },
        ],
      },
      // Which account is honest is the record's: a vote against words whose
      // conditions were all met, or a condition that never came true.
      reason: {
        variants: [
          {
            key: "voted-other-way",
            kind: "template",
            text: "I said {{prior-statement}} I voted the other way, and that's mine to answer for.",
            requiresFacts: ["commitment-departed"],
          },
          {
            key: "condition",
            kind: "template",
            text: "What I said was {{prior-statement}} What I asked for hasn't happened: {{unmet-condition}}.",
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
