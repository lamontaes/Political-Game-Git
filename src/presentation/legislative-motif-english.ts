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
 * Every bargaining beat is worded here now. They used to be banks of whole
 * authored lines picked by a hash of the turn key, and their lines
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
  | "ask-for-commitment"
  | "qualified-commitment"
  | "demand-narrower-scope"
  | "ask-for-evidence"
  | "ask-staff-to-verify"
  | "offer-targeted-provision"
  | "suggest-amendment"
  | "press-visibility-concern"
  | "refuse-quid-pro-quo"
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
  "ask-for-commitment",
  "qualified-commitment",
  "demand-narrower-scope",
  "ask-for-evidence",
  "ask-staff-to-verify",
  "offer-targeted-provision",
  "suggest-amendment",
  "press-visibility-concern",
  "refuse-quid-pro-quo",
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
 * Packet facts. The plain ones are words copied into the line; the last
 * three are states the line may assert ("nothing in it is written for…", "you
 * put it in…", "then write it in": a reply to a hold), present only when the
 * record shows them.
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
  | "reach"
  | "prior-statement"
  | "section-absent"
  | "section-adopted"
  | "answering-a-hold";

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
          {
            key: "settle-it-in",
            kind: "template",
            text: "{{section-label}} still isn't in {{designation}}, {{listener}}, and {{next-step}} is next. If it's going in, it goes in now.",
            requiresFacts: ["section-absent"],
          },
          {
            key: "hold-it",
            kind: "template",
            text: "{{section-label}} is in {{designation}} now, {{listener}}, and {{next-step}} is next. I'd hold it there.",
            requiresFacts: ["section-adopted"],
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
          {
            key: "not-in-yet",
            kind: "template",
            text: "{{section-label}} isn't in the bill yet; whatever you're going to do with it, do it before {{next-step}}.",
            requiresFacts: ["section-absent"],
          },
          {
            key: "in-now",
            kind: "template",
            text: "{{section-label}} is in the bill now. If anything in it is changing, it changes before {{next-step}}.",
            requiresFacts: ["section-adopted"],
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

  "ask-for-commitment": {
    shared: bank("legislative.ask-for-commitment", "ask", {
      core: {
        variants: [
          {
            key: "plain",
            kind: "template",
            text: "I'm going to ask you straight, {{listener}}. When {{designation}} comes up, are you with me or not?",
          },
          {
            key: "counting",
            kind: "template",
            text: "I'd rather hear it now than read it on the board. Where are you on {{designation}}?",
          },
          {
            key: "it-is-in",
            kind: "template",
            text: "{{section-label}} is in the bill now, {{listener}}. Are you with me on {{designation}}?",
            requiresFacts: ["section-adopted"],
          },
        ],
      },
    }),
    byVoice: {
      "district-advocate": bank(
        "legislative.ask-for-commitment.district-advocate",
        "ask",
        {
          core: {
            variants: [
              {
                key: "for-home",
                kind: "template",
                text: "people in {{place}} are going to ask me how you voted on {{designation}}. Can I tell them you were with us?",
              },
            ],
          },
        },
      ),
      "procedural-institutionalist": bank(
        "legislative.ask-for-commitment.procedural-institutionalist",
        "ask",
        {
          core: {
            variants: [
              {
                key: "before-calendar",
                kind: "template",
                text: "before {{designation}} reaches {{next-step}}, I need to know whether I'm carrying you or working around you.",
              },
            ],
          },
        },
      ),
    },
  },

  "qualified-commitment": {
    shared: bank("legislative.qualified-commitment", "offer", {
      core: {
        variants: [
          {
            key: "if-section",
            kind: "template",
            text: "fix {{section-label}} and I'm with you on {{designation}}. Leave it as it is and I'm not, and I'd rather you heard that from me than found out in the {{chamber}}.",
          },
          {
            key: "keep-it",
            kind: "template",
            text: "{{section-label}} is in the bill now. Keep it as it reads and I'm with you on {{designation}}.",
            requiresFacts: ["section-adopted"],
          },
        ],
      },
    }),
    byVoice: {
      "district-advocate": bank(
        "legislative.qualified-commitment.district-advocate",
        "offer",
        {
          core: {
            variants: [
              {
                key: "named",
                kind: "template",
                text: "put {{beneficiary}} in {{section-label}} in language I can read out loud, and you have my vote on {{designation}}.",
              },
              {
                key: "named-place",
                kind: "template",
                text: "if {{section-label}} can reach {{place}}, I'm a yes on {{designation}} and I'll say so publicly.",
              },
            ],
          },
        },
      ),
      "fiscal-guardian": bank(
        "legislative.qualified-commitment.fiscal-guardian",
        "offer",
        {
          core: {
            variants: [
              {
                key: "ceiling",
                kind: "template",
                text: "hold {{section-label}} at {{amount}} and I can be with you on {{designation}}.",
              },
              {
                key: "bill-total",
                kind: "template",
                text: "{{designation}} reads {{bill-amount}} now. Keep it there and I'm a yes.",
              },
            ],
          },
        },
      ),
      "implementation-realist": bank(
        "legislative.qualified-commitment.implementation-realist",
        "offer",
        {
          core: {
            variants: [
              {
                key: "if-deliverable",
                kind: "template",
                text: "if whoever would have to run {{section-label}} tells me it can be stood up, I'm with you on {{designation}}.",
              },
              {
                key: "analyst-says",
                kind: "template",
                text: "if {{analyst}} tells me {{section-label}} can be stood up, I'm with you on {{designation}}.",
              },
            ],
          },
        },
      ),
      "procedural-institutionalist": bank(
        "legislative.qualified-commitment.procedural-institutionalist",
        "offer",
        {
          core: {
            variants: [
              {
                key: "if-in-order",
                kind: "template",
                text: "if {{section-label}} is settled in committee and not tacked on at {{next-step}}, you have me on {{designation}}.",
              },
            ],
          },
        },
      ),
    },
  },

  "demand-narrower-scope": {
    shared: bank("legislative.demand-narrower-scope", "request", {
      core: {
        variants: [
          {
            key: "too-broad",
            kind: "template",
            text: "{{section-label}} is written for everybody, which means it's written for nobody in particular. Narrow it and I can defend {{designation}}.",
          },
        ],
      },
    }),
    byVoice: {
      "fiscal-guardian": bank(
        "legislative.demand-narrower-scope.fiscal-guardian",
        "request",
        {
          core: {
            variants: [
              {
                key: "eligibility",
                kind: "template",
                text: "tighten who's eligible. As drafted, {{section-label}} {{reach}}, and nobody has costed that.",
              },
            ],
          },
        },
      ),
      "implementation-realist": bank(
        "legislative.demand-narrower-scope.implementation-realist",
        "request",
        {
          core: {
            variants: [
              {
                key: "pilot-first",
                kind: "template",
                text: "make {{section-label}} a pilot with a defined population. Open it everywhere on day one and the first thing that breaks is the intake.",
              },
            ],
          },
        },
      ),
    },
  },

  "ask-for-evidence": {
    shared: bank("legislative.ask-for-evidence", "ask", {
      core: {
        variants: [
          {
            key: "who-scored",
            kind: "template",
            text: "has anybody scored {{designation}}, or are we all repeating the sponsor's number back to each other? I'd like to read it before I answer you.",
          },
          {
            key: "show-me",
            kind: "template",
            text: "don't tell me it works. What does {{analyst}}'s analysis say {{section-label}} actually delivers?",
          },
        ],
      },
    }),
  },

  "ask-staff-to-verify": {
    shared: bank("legislative.ask-staff-to-verify", "tell", {
      core: {
        variants: [
          {
            key: "read-it-first",
            kind: "template",
            text: "let me have {{section-label}} read against the law as it stands before I say anything about {{designation}} I'd have to take back.",
          },
          {
            key: "have-staff-check",
            kind: "template",
            text: "let me have {{analyst}} read {{section-label}} before I say anything I'd have to take back.",
          },
        ],
      },
    }),
    byVoice: {
      "procedural-institutionalist": bank(
        "legislative.ask-staff-to-verify.procedural-institutionalist",
        "tell",
        {
          core: {
            variants: [
              {
                key: "in-order",
                kind: "template",
                text: "I want to know whether {{section-label}} is even in order at {{next-step}}. If it isn't, none of the rest of this matters.",
              },
            ],
          },
        },
      ),
    },
  },

  "offer-targeted-provision": {
    shared: bank("legislative.offer-targeted-provision", "request", {
      core: {
        variants: [
          {
            key: "one-section",
            kind: "template",
            text: "there is one section of {{designation}} that would change my answer, and it isn't in the bill. I'd like you to put it there.",
          },
          {
            key: "cold-open",
            kind: "template",
            text: "I'll be straight with you about {{designation}}. There is nothing in it for {{place}}, and one section would fix that: {{section-label}}, naming {{beneficiary}}.",
            requiresFacts: ["section-absent"],
          },
          {
            key: "write-it-in",
            kind: "template",
            text: "then write it in. Name {{beneficiary}} in {{section-label}} and I'll carry the amendment myself.",
            requiresFacts: ["answering-a-hold"],
          },
          {
            key: "carve-out",
            kind: "template",
            text: "give me a section of {{designation}} that reaches {{place}} and I'll stop being your problem on this bill.",
          },
        ],
      },
    }),
    byVoice: {
      "fiscal-guardian": bank(
        "legislative.offer-targeted-provision.fiscal-guardian",
        "request",
        {
          core: {
            variants: [
              {
                key: "capped",
                kind: "template",
                text: "if it's going to name {{beneficiary}}, then cap {{section-label}} at {{amount}} and say so on the page.",
              },
            ],
          },
        },
      ),
    },
  },

  "suggest-amendment": {
    shared: bank("legislative.suggest-amendment", "suggest-another-way", {
      opener: {
        variants: [{ key: "name", kind: "template", text: "{{listener}}," }],
      },
      core: {
        variants: [
          {
            key: "committee-substitute",
            kind: "template",
            text: "bring it as a committee substitute. Same policy, and {{section-label}} reads the way it should have read when it was filed.",
          },
          {
            key: "two-lines",
            kind: "template",
            text: "change {{section-label}}, leave the rest of {{designation}} alone, and half this argument goes away.",
          },
          {
            key: "add-it",
            kind: "template",
            text: "{{section-label}} isn't in the bill yet. Offer it as a committee amendment before {{next-step}} and half this argument goes away.",
            requiresFacts: ["section-absent"],
          },
        ],
      },
    }),
  },

  "press-visibility-concern": {
    shared: bank("legislative.press-visibility-concern", "tell", {
      core: {
        variants: [
          {
            key: "how-it-reads",
            kind: "template",
            text: "understand how this reads. A section naming {{beneficiary}} in {{designation}} is going to be the whole story, whatever the merits are.",
          },
          {
            key: "explain-it",
            kind: "template",
            text: "I can defend {{section-label}} on the merits. I'd just rather do it in committee than in a headline.",
          },
        ],
      },
    }),
  },

  "refuse-quid-pro-quo": {
    shared: bank("legislative.refuse-quid-pro-quo", "decline", {
      opener: {
        variants: [{ key: "name", kind: "template", text: "{{listener}}," }],
      },
      core: {
        variants: [
          {
            key: "not-that",
            kind: "template",
            text: "stop. Ask me for the amendment, ask me for my vote on {{designation}}. Don't ask me for anything that ends with something in my pocket.",
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "the-job",
            kind: "template",
            text: "I'll trade votes with you on {{designation}} all day. That's the job. What you just described isn't.",
          },
        ],
      },
    }),
  },

  "remind-of-commitment": {
    shared: bank("legislative.remind-of-commitment", "tell", {
      core: {
        variants: [
          {
            key: "i-said",
            kind: "template",
            text: "I said this to you, in this room: {{prior-statement}} I meant it then, and I'd like that to count for something on {{designation}}.",
          },
          {
            key: "held-up",
            kind: "template",
            text: "I did what you asked on {{section-label}}. I'd like to think that still counts for something.",
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
            key: "never-arrived",
            kind: "template",
            text: "{{section-label}} is not in {{designation}}. You told me you would carry it. I'm not angry. I'm going to remember it.",
            requiresFacts: ["section-absent"],
          },
          {
            key: "explain-it-to-them",
            kind: "template",
            text: "I have to go back to {{place}} and explain a vote I took on the understanding that {{section-label}} would be in {{designation}}. Tell me what you'd like me to say.",
          },
          {
            key: "you-told-me",
            kind: "template",
            text: "you told me {{section-label}} would be in {{designation}}, {{listener}}. I'd like to hear what happened.",
          },
        ],
      },
    }),
  },

  "defend-broken-commitment": {
    shared: bank("legislative.defend-broken-commitment", "tell", {
      core: {
        variants: [
          {
            key: "bill-changed",
            kind: "template",
            text: "the bill I said yes to isn't the bill that came to {{next-step}}. {{section-label}} changed after we spoke, and my answer went with it.",
          },
          {
            key: "condition",
            kind: "template",
            text: "I told you what I needed in {{section-label}}. I didn't get it. That isn't a broken promise; that's a promise that was never triggered.",
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
  const banks = voiced ? [voiced, family.shared] : [family.shared];
  // A recorded state of the section is said where a part can say it: those
  // wordings first, from the speaker's own concern and then the shared bank.
  for (const bank of banks) {
    const stated = statedBank(bank, packet);
    if (!stated) continue;
    const line = composeGroundedLine(packet, stated);
    if (line.kind === "rendered") return line;
  }
  let reasons: readonly string[] = [];
  for (const bank of banks) {
    const line = composeGroundedLine(packet, bank);
    if (line.kind === "rendered") return line;
    reasons = line.reasons;
  }
  // Each shared core has a variant that needs only the bill, the section and
  // the listener, which every bargain records.
  throw new Error(
    `Beat ${input.family} has no grounded wording: ${reasons.join("; ")}`,
  );
}

/** States of the section a line may assert, when the record shows them. */
export const MOTIF_STATE_FACTS: readonly MotifFactKey[] = [
  "section-absent",
  "section-adopted",
  "answering-a-hold",
];

/**
 * The bank with each part narrowed to the wordings that say a state the
 * packet records, or null when no part has one to say.
 */
function statedBank(
  bank: ComposedLineBank,
  packet: GroundedEnglishPacket,
): ComposedLineBank | null {
  const recorded = MOTIF_STATE_FACTS.filter((key) => packet.facts[key]);
  if (recorded.length === 0) return null;
  let narrowed = false;
  const parts: Record<string, ComposedLineBank["parts"]["core"]> = {};
  for (const [part, partBank] of Object.entries(bank.parts)) {
    const stating = partBank!.variants.filter((variant) =>
      (variant.requiresFacts ?? []).some((key) =>
        recorded.includes(key as MotifFactKey),
      ),
    );
    if (stating.length > 0) narrowed = true;
    parts[part] =
      stating.length > 0 ? { ...partBank!, variants: stating } : partBank!;
  }
  return narrowed
    ? { ...bank, parts: parts as ComposedLineBank["parts"] }
    : null;
}

/**
 * A line names the bill once. A later mention in the same line is "this
 * bill", as a speaker who has just named it would say.
 */
export function nameTheBillOnce(text: string, designation: string): string {
  const first = text.indexOf(designation);
  if (first < 0) return text;
  const pieces = text.slice(first + designation.length).split(designation);
  let out = text.slice(0, first + designation.length) + pieces[0]!;
  for (const piece of pieces.slice(1)) {
    out += /[.?!]\s+$/.test(out) ? "This bill" : "this bill";
    out += piece;
  }
  return out;
}
