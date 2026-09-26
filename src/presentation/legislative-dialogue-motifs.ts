import type { ClaimAudience, EntityId } from "../simulation";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishFact,
  type GroundedEnglishPacket,
} from "./grounded-english";

/** Distinguishes newly rendered speech from older saved scenario wording. */
export const GENERATED_LEGISLATIVE_DIALOGUE_TAG =
  "english-bank:legislative-dialogue-v1";

/** A conversational move, separate from its wording and consequences. */
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

/** The saved bargaining role affects which eligible sentence is spoken. */
export type LegislativeVoice =
  | "district-advocate"
  | "fiscal-guardian"
  | "implementation-realist"
  | "procedural-institutionalist";

export interface LegislativeMotifFacts {
  readonly speaker: string;
  readonly listener: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly sectionLabel: string;
  readonly sectionHeading: string;
  readonly reach: string;
  readonly beneficiary: string | null;
  readonly place: string | null;
  readonly amount: string | null;
  readonly billAmount: string | null;
  readonly analyst: string;
  readonly chamber: string;
  readonly nextStep: string;
  readonly priorStatement: string | null;
}

export interface LegislativeMotifContext {
  readonly family: LegislativeMotifFamily;
  readonly voice: LegislativeVoice;
  readonly audience: ClaimAudience;
  readonly priorFamily: LegislativeMotifFamily | null;
  readonly variantSeed: string;
  readonly worldSeed: string;
  readonly speakerPersonId: EntityId;
  /** Saved bill, provision and any earlier commitment supporting this beat. */
  readonly sourceRecordIds: readonly EntityId[];
  readonly facts: LegislativeMotifFacts;
}

interface Line {
  readonly key: string;
  readonly text: string;
  readonly voice?: LegislativeVoice;
  readonly audience?: ClaimAudience;
}

/**
 * Fresh first-pass speech banks. A line is eligible only when every named
 * fact has a saved source. The old 600-line scenario bank is gone; none of its
 * unrecorded anecdotes, predicted outcomes or invented leadership positions
 * can become a character's words.
 */
const LINES: Readonly<Record<LegislativeMotifFamily, readonly Line[]>> = {
  "ask-for-commitment": [
    { key: "count-on-you", text: "Can I count on you for {{designation}}?" },
    { key: "where-are-you", text: "Where are you on {{designation}}?" },
  ],
  "qualified-commitment": [
    {
      key: "district-condition",
      voice: "district-advocate",
      text: "Put {{beneficiary}} in {{section}} and I can support {{designation}}.",
    },
    {
      key: "fiscal-condition",
      voice: "fiscal-guardian",
      text: "Keep {{section}} at {{amount}} and I can support {{designation}}.",
    },
    {
      key: "section-condition",
      text: "If {{section}} is in the bill, I can support {{designation}}.",
    },
  ],
  "refuse-to-commit-yet": [
    {
      key: "no-answer",
      text: "I can't give you an answer on {{designation}} yet.",
    },
    { key: "not-ready", text: "I'm not ready to commit to {{designation}}." },
  ],
  "demand-narrower-scope": [
    { key: "narrow", text: "Can you narrow {{section}}?" },
    {
      key: "cap",
      voice: "fiscal-guardian",
      text: "Can you cap {{section}} at {{amount}}?",
    },
  ],
  "object-on-cost": [
    { key: "cost", text: "I want to see what {{section}} costs." },
    {
      key: "bill-total",
      voice: "fiscal-guardian",
      text: "The bill's estimate is {{bill-amount}}. What is {{section}}'s share?",
    },
  ],
  "object-on-implementation": [
    { key: "who-runs-it", text: "Who would run {{section}}?" },
    { key: "how-it-works", text: "How would {{section}} work in practice?" },
  ],
  "ask-for-evidence": [
    { key: "analysis", text: "Do we have an analysis of {{section}}?" },
  ],
  "ask-staff-to-verify": [
    { key: "check", text: "I want {{analyst}} to check {{section}} first." },
  ],
  "district-beneficiary-concern": [
    {
      key: "place",
      voice: "district-advocate",
      text: "I want {{place}} in on this.",
    },
    { key: "who-reached", text: "Who does {{section}} reach?" },
  ],
  "offer-targeted-provision": [
    {
      key: "local-match",
      text: "Can you add a local match for {{beneficiary}} in {{section}}?",
    },
    {
      key: "name-beneficiary",
      text: "I want {{beneficiary}} named in {{section}}. Can you do that?",
    },
    {
      key: "section",
      text: "Can you add {{section}} to {{designation}}?",
    },
  ],
  "suggest-amendment": [
    { key: "amend", text: "We could amend {{section}}." },
    {
      key: "change-section",
      text: "Can we change {{section}} before the vote?",
    },
  ],
  "accept-principle-reject-mechanism": [
    { key: "as-written", text: "I can't support {{section}} as written." },
  ],
  "leadership-pressure": [
    {
      key: "ask-leadership",
      text: "Have you talked to leadership about {{designation}}?",
    },
  ],
  "timing-warning": [
    {
      key: "next-step",
      text: "We need to settle {{section}} before {{next-step}}.",
    },
  ],
  "press-visibility-concern": [
    {
      key: "public-explanation",
      text: "How are you going to explain {{section}} publicly?",
    },
  ],
  "reciprocal-support": [
    {
      key: "section-stays",
      text: "If {{section}} stays in, I'm with you on {{designation}}.",
    },
  ],
  "refuse-quid-pro-quo": [
    {
      key: "refuse",
      text: "No. I'm not taking a personal benefit for my vote.",
    },
  ],
  "remind-of-commitment": [
    {
      key: "saved-words",
      text: "I meant what I said: {{prior-statement}}",
    },
    {
      key: "meant-it",
      text: "I meant what I said about {{designation}}.",
    },
  ],
  "confront-broken-commitment": [
    {
      key: "missing-section",
      text: "I needed {{section}} in the bill. It isn't there.",
    },
  ],
  "defend-broken-commitment": [
    {
      key: "check-conditions",
      text: "That commitment had conditions. We should check them against {{designation}}.",
    },
  ],
};

const SLOT = /\{\{([a-z][a-z0-9-]*)\}\}/g;

function factsFor(
  context: LegislativeMotifContext,
): GroundedEnglishPacket["facts"] {
  const sourceRecordIds = context.sourceRecordIds;
  const fact = (text: string | null): GroundedEnglishFact | undefined =>
    text?.trim() ? { text, sourceRecordIds } : undefined;
  return {
    designation: fact(context.facts.designation),
    section: fact(context.facts.sectionLabel),
    beneficiary: fact(context.facts.beneficiary),
    place: fact(context.facts.place),
    amount: fact(context.facts.amount),
    "bill-amount": fact(context.facts.billAmount),
    analyst: fact(context.facts.analyst),
    "next-step": fact(context.facts.nextStep),
    "prior-statement": fact(context.facts.priorStatement),
  };
}

function eligibleLines(context: LegislativeMotifContext): readonly Line[] {
  const facts = factsFor(context);
  const supported = LINES[context.family].filter(
    (line) =>
      (!line.audience || line.audience === context.audience) &&
      [...line.text.matchAll(SLOT)].every((match) => facts[match[1]!]?.text),
  );
  const voiced = supported.filter((line) => line.voice === context.voice);
  return voiced.length > 0 ? voiced : supported.filter((line) => !line.voice);
}

/** Return exactly the spoken line whose facts are in the current packet. */
export function legislativeMotifLine(context: LegislativeMotifContext): string {
  const candidates = eligibleLines(context);
  const facts = factsFor(context);
  const bank: AuthoredEnglishBank = {
    key: `legislative-dialogue:${context.family}`,
    version: "1",
    surface: "dialogue",
    variants: candidates.map((line) => ({
      kind: "template",
      key: line.key,
      text: line.text,
    })),
  };
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: context.variantSeed,
    worldSeed: context.worldSeed,
    bankVersion: bank.version,
    stage: context.family,
    sourceRecordIds: context.sourceRecordIds,
    facts,
    speaker: { personId: context.speakerPersonId, traits: {} },
    knowledge: Object.entries(facts).flatMap(([factKey, value]) =>
      value
        ? [
            {
              personId: context.speakerPersonId,
              factKey,
              sourceRecordIds: value.sourceRecordIds,
            },
          ]
        : [],
    ),
  };
  const result = renderGroundedEnglish(packet, bank);
  if (result.kind === "missing-context") {
    throw new Error(
      `No grounded legislative line for ${context.family}: ${result.reasons.join("; ")}`,
    );
  }
  return result.text;
}

export function eligibleMotifVariantKeys(
  context: LegislativeMotifContext,
): readonly string[] {
  return eligibleLines(context).map((line) => line.key);
}

export function motifFamilies(): readonly LegislativeMotifFamily[] {
  return Object.keys(LINES) as LegislativeMotifFamily[];
}
