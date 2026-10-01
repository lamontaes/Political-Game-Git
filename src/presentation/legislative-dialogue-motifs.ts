import { stableHash } from "../simulation";
import type { ClaimAudience, EntityId } from "../simulation";
import { composeCostObjection } from "./legislative-cost-objection-english";
import {
  ENGLISH_MOTIF_FAMILIES,
  composeMotifEnglish,
  type MotifFactKey,
} from "./legislative-motif-english";
import type { GroundedEnglishFact } from "./grounded-english";

/**
 * What legislators actually say to each other.
 *
 * The point of this file is that a bargaining beat is not one line with the
 * nouns swapped. Two things vary independently: the *family* — what kind of
 * move this is — and the *voice* — which concerns this particular member
 * reaches for first. A fiscal guardian and a district advocate refusing the
 * same amendment do not refuse it the same way, and that difference is most of
 * what makes another legislator legible as a person rather than a vote button.
 *
 * Selection is deterministic. A variant is chosen by hashing the turn's own
 * stable key, so the same state and the same action always produce the same
 * sentence, and no line depends on anything the speaker does not canonically
 * know. Nothing here reads a decision score, and nothing here states a
 * probability: characters speak in the register people speak in.
 */

export type LegislativeMotifFamily =
  | "ask-for-commitment"
  | "qualified-commitment"
  | "refuse-to-commit-yet"
  | "demand-narrower-scope"
  | "object-on-cost"
  | "object-on-implementation"
  | "ask-for-evidence"
  | "ask-staff-to-verify"
  | "district-beneficiary-concern"
  | "offer-targeted-provision"
  | "suggest-amendment"
  | "accept-principle-reject-mechanism"
  | "leadership-pressure"
  | "timing-warning"
  | "press-visibility-concern"
  | "reciprocal-support"
  | "refuse-quid-pro-quo"
  | "remind-of-commitment"
  | "confront-broken-commitment"
  | "defend-broken-commitment";

/**
 * Which concern a member reaches for first.
 *
 * A voice is not an ideology score and carries no mechanical weight. It only
 * decides which true thing about the bill this person says out loud first.
 */
export type LegislativeVoice =
  | "district-advocate"
  | "fiscal-guardian"
  | "implementation-realist"
  | "procedural-institutionalist";

export interface LegislativeMotifFacts {
  /** Short forms of address, as the room would use them. */
  readonly speaker: string;
  readonly listener: string;
  readonly designation: string;
  readonly shortTitle: string;
  /** "Section 4", as the bill prints it. */
  readonly sectionLabel: string;
  readonly sectionHeading: string;
  /** Who the section reaches, in plain language. */
  readonly reach: string;
  readonly beneficiary: string | null;
  readonly place: string | null;
  /** What the section itself commits, when it commits money. */
  readonly amount: string | null;
  /** What the whole bill commits as it now reads. */
  readonly billAmount: string | null;
  /** Whoever would write the fiscal note. */
  readonly analyst: string;
  readonly chamber: string;
  /** The next procedural step, in the words the chamber uses. */
  readonly nextStep: string;
  /** What the speaker said earlier, when a beat refers back to it. */
  readonly priorStatement: string | null;
  /** The ground the requested section states for itself, when it states one. */
  readonly statedGround?: string | null;
}

/**
 * The records the words in a beat's facts come from. A beat the English
 * engine words (`ENGINE_FAMILIES`) cites these; the authored banks below do
 * not yet.
 */
export interface LegislativeMotifGrounding {
  readonly worldSeed: string;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonId: EntityId;
  /** The measure the designation, sections and requested place belong to. */
  readonly measureId: EntityId;
  /** What the bill's current total is read from (its provisions, or the measure). */
  readonly billAmountSourceIds: readonly EntityId[];
  /**
   * Where the speaker's section is the one being requested: whether the bill
   * now holds it (the adopted provision) or not. Null when the speaker is
   * talking about another section.
   */
  readonly requestedSection?: {
    readonly adoptedProvisionId: EntityId | null;
  } | null;
}

export interface LegislativeMotifContext {
  readonly family: LegislativeMotifFamily;
  readonly voice: LegislativeVoice;
  readonly audience: ClaimAudience;
  /** The move this answers, so a reply does not repeat an opener. */
  readonly priorFamily: LegislativeMotifFamily | null;
  /** The turn's own stable key. Identical state and action reuse it. */
  readonly variantSeed: string;
  readonly facts: LegislativeMotifFacts;
  readonly grounding: LegislativeMotifGrounding;
}

/** Beats the English engine words from their fact packet, not a line bank. */
const ENGINE_FAMILIES = ["object-on-cost", ...ENGLISH_MOTIF_FAMILIES] as const;
type EngineFamily = (typeof ENGINE_FAMILIES)[number];
type BankFamily = Exclude<LegislativeMotifFamily, EngineFamily>;

function isEngineFamily(
  family: LegislativeMotifFamily,
): family is EngineFamily {
  return (ENGINE_FAMILIES as readonly string[]).includes(family);
}

interface Variant {
  readonly key: string;
  /** Only offered when the concrete facts this line needs are present. */
  readonly needs?: (facts: LegislativeMotifFacts) => boolean;
  /** Only offered at this audibility, when a line depends on it. */
  readonly audience?: ClaimAudience;
  /** Only offered as a reply to one of these moves. */
  readonly answering?: readonly LegislativeMotifFamily[];
  readonly line: (facts: LegislativeMotifFacts) => string;
}

interface FamilyContent {
  /** Lines any member might say, whatever they care about most. */
  readonly shared: readonly Variant[];
  readonly byVoice?: Partial<Record<LegislativeVoice, readonly Variant[]>>;
}

const hasAmount = (facts: LegislativeMotifFacts) => facts.amount !== null;
const hasBeneficiary = (facts: LegislativeMotifFacts) =>
  facts.beneficiary !== null;
const hasPlace = (facts: LegislativeMotifFacts) => facts.place !== null;
const hasPrior = (facts: LegislativeMotifFacts) =>
  facts.priorStatement !== null;
const hasBillAmount = (facts: LegislativeMotifFacts) =>
  facts.billAmount !== null;

const CONTENT: Readonly<Record<BankFamily, FamilyContent>> = {
  "ask-for-commitment": {
    shared: [
      {
        key: "plain",
        line: (f) =>
          `“I'm going to ask you straight, ${f.listener}. When ${f.designation} comes up, are you with me or not?”`,
      },
      {
        key: "counting",
        line: (f) =>
          `“I'd rather hear it now than read it on the board. Where are you on ${f.designation}?”`,
      },
    ],
    byVoice: {
      "district-advocate": [
        {
          key: "for-home",
          line: (f) =>
            `“I've got people who'll ask me how you voted on this. Can I tell them you were with us on ${f.designation}?”`,
        },
      ],
      "procedural-institutionalist": [
        {
          key: "before-calendar",
          line: (f) =>
            `“Before this hits ${f.nextStep} I need to know whether I'm carrying you or working around you.”`,
        },
      ],
    },
  },

  "qualified-commitment": {
    shared: [
      {
        key: "if-section",
        line: (f) =>
          `“Fix ${f.sectionLabel} and I'm with you. Leave it as it is and I'm not, and I'd rather you heard that from me than found out on the floor.”`,
      },
    ],
    byVoice: {
      "district-advocate": [
        {
          key: "named",
          needs: hasBeneficiary,
          line: (f) =>
            `“Put ${f.beneficiary} in ${f.sectionLabel} in language I can read out loud, and you have my vote. I'm not going to pretend that isn't what I want.”`,
        },
        {
          key: "named-place",
          needs: hasPlace,
          line: (f) =>
            `“If the money can reach ${f.place}, I'm a yes and I'll say so publicly. If it can't, I'm going to have a hard time explaining a yes at home.”`,
        },
      ],
      "fiscal-guardian": [
        {
          key: "ceiling",
          needs: hasAmount,
          line: (f) =>
            `“Hold ${f.sectionLabel} at ${f.amount} and I can be with you. A dollar over that and I'm voting the way I've voted on every bill like it.”`,
        },
        {
          key: "biennium",
          needs: hasBillAmount,
          line: (f) =>
            `“I can carry ${f.billAmount} this session. I said that before I read your bill and I'll say it after. Keep it there and I'm a yes.”`,
        },
      ],
      "implementation-realist": [
        {
          key: "if-deliverable",
          line: (f) =>
            `“If somebody who would have to run ${f.sectionLabel} tells me it can be standing inside a year, I'm with you. I'm not voting for a press release and a waiting list.”`,
        },
      ],
      "procedural-institutionalist": [
        {
          key: "if-germane",
          line: (f) =>
            `“If it's offered as a proper committee substitute and not tacked on at ${f.nextStep}, you have me. I'm not going to help you do it the sloppy way.”`,
        },
      ],
    },
  },

  "refuse-to-commit-yet": {
    shared: [
      {
        key: "not-yet",
        line: (f) =>
          `“I'm not going to tell you yes today. Ask me again when ${f.sectionLabel} says what it's going to say.”`,
      },
      {
        key: "no-promise",
        line: () =>
          `“I've been in rooms where somebody's yes turned into a two-hour argument. I'd rather not give you one I can't keep.”`,
      },
    ],
    byVoice: {
      "fiscal-guardian": [
        {
          key: "want-number",
          line: (f) =>
            `“No. Not until I see what ${f.designation} actually commits us to. I'm not going to be the one who finds out in the second year.”`,
        },
      ],
      "implementation-realist": [
        {
          key: "want-agency",
          line: (f) =>
            `“Not yet. I want to hear from somebody who'd have to run this before I put my name on it. ${f.analyst} can get me that.”`,
        },
      ],
      "procedural-institutionalist": [
        {
          key: "want-posture",
          line: () =>
            `“I'll tell you when I know how this is coming to the floor. Committing before that is how people end up voting twice on the same question.”`,
        },
      ],
    },
  },

  "demand-narrower-scope": {
    shared: [
      {
        key: "too-broad",
        line: (f) =>
          `“${f.sectionLabel} is written for everybody, which means it's written for nobody in particular. Narrow it and I can defend it.”`,
      },
    ],
    byVoice: {
      "fiscal-guardian": [
        {
          key: "eligibility",
          line: (f) =>
            `“Tighten who's eligible. As drafted, ${f.reach.replace(/^language /, "")} — and that's a number nobody in this building has actually costed.”`,
        },
      ],
      "implementation-realist": [
        {
          key: "pilot-first",
          line: (f) =>
            `“Make it a pilot with a defined population. If ${f.sectionLabel} opens statewide on day one, the first thing that breaks is the intake.”`,
        },
      ],
    },
  },

  "object-on-implementation": {
    shared: [
      {
        key: "who-runs-it",
        line: (f) =>
          `“Who administers ${f.sectionLabel}? Because the way it reads, three agencies each think it's one of the others.”`,
      },
    ],
    byVoice: {
      "implementation-realist": [
        {
          key: "staffing",
          line: (f) =>
            `“I've watched this department miss a deadline with twice the staff. ${f.sectionLabel} gives them a new program and no position count.”`,
        },
        {
          key: "rulemaking",
          line: () =>
            `“Even if this passes in March, rulemaking takes the rest of the year. Whatever you're promising people, it isn't happening this year.”`,
        },
      ],
      "procedural-institutionalist": [
        {
          key: "effective-date",
          line: (f) =>
            `“There's no effective date that matches the fiscal year in ${f.sectionLabel}. That alone will bring it back to us.”`,
        },
      ],
    },
  },

  "ask-for-evidence": {
    shared: [
      {
        key: "show-me",
        line: (f) =>
          `“Don't tell me it works. Show me the note. What does ${f.analyst}'s analysis say ${f.sectionLabel} actually delivers?”`,
      },
      {
        key: "who-scored",
        line: (f) =>
          `“Has anybody scored this, or are we all repeating the sponsor's number back to each other? I'd like to read it before I answer you on ${f.designation}.”`,
      },
    ],
  },

  "ask-staff-to-verify": {
    shared: [
      {
        key: "have-staff-check",
        line: (f) =>
          `“Let me have ${f.analyst} read ${f.sectionLabel} against the current program language before I say anything I'd have to take back.”`,
      },
    ],
    byVoice: {
      "procedural-institutionalist": [
        {
          key: "counsel",
          line: (f) =>
            `“I want counsel to look at whether that's even germane at ${f.nextStep}. If it isn't, none of the rest of this matters.”`,
        },
      ],
    },
  },

  "offer-targeted-provision": {
    shared: [
      {
        key: "one-section",
        line: (f) =>
          `“There is one section of ${f.designation} that would change my answer, and it isn't in the bill. I'd like you to put it there.”`,
      },
      {
        key: "cold-open",
        needs: (facts) => hasBeneficiary(facts) && hasPlace(facts),
        line: (f) =>
          `“I'll be straight with you about ${f.designation}. There is nothing in it for ${f.place}, and there is one line that would fix that — a local match section naming ${f.beneficiary}. That's what I'm here about.”`,
      },
      {
        key: "write-it-in",
        needs: hasBeneficiary,
        answering: [
          "ask-for-commitment",
          "refuse-to-commit-yet",
          "object-on-cost",
          "demand-narrower-scope",
          "district-beneficiary-concern",
        ],
        line: (f) =>
          `“Then write it in. Name ${f.beneficiary} in ${f.sectionLabel} and I'll carry the amendment myself.”`,
      },
      {
        key: "carve-out",
        needs: hasPlace,
        line: (f) =>
          `“Give me an eligibility line that reaches ${f.place} and I'll stop being your problem on this bill.”`,
      },
    ],
    byVoice: {
      "fiscal-guardian": [
        {
          key: "capped",
          needs: (facts) => hasAmount(facts) && hasBeneficiary(facts),
          line: (f) =>
            `“If it's going to name ${f.beneficiary}, then cap it at ${f.amount} and say so on the page. I'd rather the number be in the bill than in a press release.”`,
        },
      ],
    },
  },

  "suggest-amendment": {
    shared: [
      {
        key: "committee-substitute",
        line: (f) =>
          `“Bring it as a committee substitute. Same policy, and ${f.sectionLabel} reads the way it should have read when it was filed.”`,
      },
      {
        key: "two-lines",
        line: (f) =>
          `“It's two lines. Change ${f.sectionLabel}, leave the rest of ${f.designation} alone, and half this argument goes away.”`,
      },
    ],
  },

  "accept-principle-reject-mechanism": {
    shared: [
      {
        key: "agree-not-this",
        line: (f) =>
          `“I agree with what you're trying to do. I don't agree that ${f.sectionLabel} is how you do it, and voting for the wrong mechanism doesn't get us the right one.”`,
      },
    ],
    byVoice: {
      "implementation-realist": [
        {
          key: "grant-vs-formula",
          line: () =>
            `“Grants mean somebody has to apply, and the places that need this least apply best. Do it by formula and I'm with you.”`,
        },
      ],
    },
  },

  "press-visibility-concern": {
    shared: [
      {
        key: "how-it-reads",
        needs: hasBeneficiary,
        line: (f) =>
          `“Understand how this reads. A line naming ${f.beneficiary} in a statewide bill is going to be the whole story, whatever the merits are.”`,
      },
      {
        key: "explain-it",
        line: (f) =>
          `“I can defend ${f.sectionLabel} on the merits. I'd just rather do it in committee than in a headline.”`,
      },
    ],
  },

  "refuse-quid-pro-quo": {
    shared: [
      {
        key: "not-that",
        line: (f) =>
          `“Stop. Ask me for the amendment, ask me for my vote, ask me to talk to the chair. Don't ask me anything that ends with something in my pocket, and we'll keep talking about ${f.designation}.”`,
      },
      {
        key: "line",
        line: () =>
          `“I'll trade votes with you all day. That's the job. What you just described isn't, and I'm going to act like you misspoke.”`,
      },
    ],
  },

  "remind-of-commitment": {
    shared: [
      {
        key: "i-said",
        needs: hasPrior,
        line: (f) =>
          `“I said this to you, in this room: ${f.priorStatement} I meant it then and I have not moved since, and I'd like that to count for something.”`,
      },
      {
        key: "held-up",
        line: (f) =>
          `“I did what you asked on ${f.sectionLabel}. I'd like to think that still counts for something.”`,
      },
    ],
  },

  "confront-broken-commitment": {
    shared: [
      {
        key: "never-arrived",
        line: (f) =>
          `“${f.sectionLabel} is not in that bill. You told me you would carry it, and it never reached the floor. I'm not angry. I'm going to remember it.”`,
      },
      {
        key: "explain-it-to-them",
        needs: hasPlace,
        line: (f) =>
          `“I have to go back to ${f.place} and explain a vote I took on the understanding that something would be in this bill. Tell me what you'd like me to say.”`,
      },
    ],
  },

  "defend-broken-commitment": {
    shared: [
      {
        key: "bill-changed",
        line: (f) =>
          `“The bill I said yes to isn't the bill that came to the floor. ${f.sectionLabel} changed after we spoke, and my answer went with it.”`,
      },
      {
        key: "condition",
        line: () =>
          `“I told you what I needed. I didn't get it. That isn't a broken promise; that's a promise that was never triggered, and you knew the difference when you asked.”`,
      },
    ],
  },
};

/**
 * The line this speaker says, for this move, in this state.
 *
 * Eligibility comes first: a variant that names an amount is never offered when
 * the section states none, and a variant written as a reply is never offered as
 * an opener. Among what remains, the choice is a hash of the turn's own key, so
 * replaying the same session produces the same conversation word for word.
 */
export function legislativeMotifLine(context: LegislativeMotifContext): string {
  // Spoken aloud, so quoted like every other line in the room.
  if (isEngineFamily(context.family)) return `“${engineLine(context).text}”`;
  const candidates = eligibleVariants(context);
  const index = Number(
    BigInt(
      `0x${stableHash(`${context.variantSeed}:${context.family}:${context.voice}`)}`,
    ) % BigInt(candidates.length),
  );
  return candidates[index]!.line(context.facts);
}

/** The variant keys a given context could produce, for tests and tooling. */
export function eligibleMotifVariantKeys(
  context: LegislativeMotifContext,
): readonly string[] {
  if (isEngineFamily(context.family))
    return engineLine(context).parts.map((part) => part.partKey);
  return eligibleVariants(context).map((variant) => variant.key);
}

export function motifFamilies(): readonly LegislativeMotifFamily[] {
  return [...(Object.keys(CONTENT) as BankFamily[]), ...ENGINE_FAMILIES];
}

/**
 * A beat worded by the English engine, from facts each sourced to the record
 * that establishes it.
 */
export function engineLine(context: LegislativeMotifContext) {
  const { facts, grounding } = context;
  const measure = [grounding.measureId];
  if (context.family !== "object-on-cost") {
    const word = (text: string | null | undefined, ids = measure) =>
      text ? { text, sourceRecordIds: ids } : undefined;
    const requested = grounding.requestedSection ?? null;
    const packetFacts: Partial<Record<MotifFactKey, GroundedEnglishFact>> = {
      designation: word(facts.designation),
      listener: word(facts.listener, [grounding.listenerPersonId]),
      "section-label": word(facts.sectionLabel),
      chamber: word(facts.chamber),
      "next-step": word(facts.nextStep),
      beneficiary: word(facts.beneficiary),
      place: word(facts.place),
      amount: word(facts.amount),
      "stated-ground": word(facts.statedGround),
      "section-absent":
        requested && requested.adoptedProvisionId === null
          ? word("absent")
          : undefined,
      "section-adopted": requested?.adoptedProvisionId
        ? word("adopted", [requested.adoptedProvisionId])
        : undefined,
    };
    return composeMotifEnglish({
      family: context.family as (typeof ENGLISH_MOTIF_FAMILIES)[number],
      voice: context.voice,
      worldSeed: grounding.worldSeed,
      momentKey: `${context.variantSeed}:${context.voice}`,
      speakerPersonId: grounding.speakerPersonId,
      listenerPersonId: grounding.listenerPersonId,
      facts: packetFacts,
    });
  }
  return composeCostObjection({
    worldSeed: grounding.worldSeed,
    momentKey: `${context.variantSeed}:${context.voice}`,
    speakerPersonId: grounding.speakerPersonId,
    listenerPersonId: grounding.listenerPersonId,
    voice: context.voice,
    facts: {
      designation: { text: facts.designation, sourceRecordIds: measure },
      listener: {
        text: facts.listener,
        sourceRecordIds: [grounding.listenerPersonId],
      },
      billAmount:
        facts.billAmount === null || grounding.billAmountSourceIds.length === 0
          ? null
          : {
              text: facts.billAmount,
              sourceRecordIds: grounding.billAmountSourceIds,
            },
      place:
        facts.place === null
          ? null
          : { text: facts.place, sourceRecordIds: measure },
    },
  });
}

function eligibleVariants(
  context: LegislativeMotifContext,
): readonly Variant[] {
  const content = CONTENT[context.family as BankFamily];
  const voiced = content.byVoice?.[context.voice] ?? [];
  const usable = (variant: Variant) =>
    (variant.needs === undefined || variant.needs(context.facts)) &&
    (variant.audience === undefined || variant.audience === context.audience) &&
    (variant.answering === undefined ||
      (context.priorFamily !== null &&
        variant.answering.includes(context.priorFamily)));

  // A member's own concern speaks first when it has something true to say.
  const preferred = voiced.filter(usable);
  if (preferred.length > 0) return preferred;
  const shared = content.shared.filter(usable);
  if (shared.length > 0) return shared;
  // Every family keeps at least one line that needs nothing but the bill.
  const unconditional = content.shared.filter(
    (variant) => variant.needs === undefined && variant.audience === undefined,
  );
  if (unconditional.length === 0) {
    throw new Error(
      `Motif family '${context.family}' has no line that works from the bill alone.`,
    );
  }
  return unconditional;
}
