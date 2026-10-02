import type { ClaimAudience, EntityId } from "../simulation";
import { composeCostObjection } from "./legislative-cost-objection-english";
import {
  ENGLISH_MOTIF_FAMILIES,
  composeMotifEnglish,
  nameTheBillOnce,
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
 * Every beat is worded by the English engine from its fact packet (A160):
 * each part of a line copies a fact sourced to the record that holds it, a
 * line that needs a fact the record lacks is not said, and the same turn says
 * the same words. Nothing here reads a decision score, and nothing here states
 * a probability: characters speak in the register people speak in.
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
 * The records the words in a beat's facts come from. Every beat the English
 * engine words cites these.
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
  /** Whoever would write the fiscal note, when the bargain names them. */
  readonly analystPersonId?: EntityId;
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

/**
 * The line this speaker says, for this move, in this state.
 *
 * A part that names an amount is never worded when the section states none,
 * and a reply is never worded as an opener: the engine words only what the
 * packet holds.
 */
export function legislativeMotifLine(context: LegislativeMotifContext): string {
  // Spoken aloud, so quoted like every other line in the room.
  return `“${engineLine(context).text}”`;
}

/** The variant keys a given context could produce, for tests and tooling. */
export function eligibleMotifVariantKeys(
  context: LegislativeMotifContext,
): readonly string[] {
  return engineLine(context).parts.map((part) => part.partKey);
}

export function motifFamilies(): readonly LegislativeMotifFamily[] {
  return ["object-on-cost", ...ENGLISH_MOTIF_FAMILIES];
}

/**
 * The moves a "then write it in" answers: a hold or an objection the speaker
 * can meet by naming who the section is for.
 */
const HOLDS: readonly LegislativeMotifFamily[] = [
  "ask-for-commitment",
  "refuse-to-commit-yet",
  "object-on-cost",
  "demand-narrower-scope",
  "district-beneficiary-concern",
];

/**
 * A beat worded by the English engine, from facts each sourced to the record
 * that establishes it.
 */
export function engineLine(context: LegislativeMotifContext) {
  const line = composedLine(context);
  return {
    ...line,
    text: nameTheBillOnce(line.text, context.facts.designation),
  };
}

/**
 * Who a section reaches, as a speaker says it after the section's label:
 * "covers every eligible rider", "is written for the transit authority". The
 * bill's own phrasing ("language reaching …") is how a summary reads, not how
 * a legislator talks.
 */
export function spokenReach(reach: string): string {
  const reaching = /^language reaching (.+)$/.exec(reach);
  if (reaching) return `covers ${reaching[1]}`;
  const writtenFor = /^language written for (.+)$/.exec(reach);
  if (writtenFor) return `is written for ${writtenFor[1]}`;
  return `covers ${reach.replace(/^language /, "")}`;
}

function composedLine(context: LegislativeMotifContext) {
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
      "section-heading": word(facts.sectionHeading),
      analyst: grounding.analystPersonId
        ? word(facts.analyst, [grounding.analystPersonId])
        : undefined,
      "bill-amount":
        grounding.billAmountSourceIds.length > 0
          ? word(facts.billAmount, [...grounding.billAmountSourceIds])
          : undefined,
      "section-absent":
        requested && requested.adoptedProvisionId === null
          ? word("absent")
          : undefined,
      "section-adopted": requested?.adoptedProvisionId
        ? word("adopted", [requested.adoptedProvisionId])
        : undefined,
      reach: word(spokenReach(facts.reach)),
      // The speaker's own earlier words, said to this listener.
      "prior-statement": word(facts.priorStatement, [
        grounding.speakerPersonId,
      ]),
      // The listener's last move was a hold this beat answers.
      "answering-a-hold":
        context.priorFamily !== null && HOLDS.includes(context.priorFamily)
          ? word("answering", [grounding.listenerPersonId])
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
