import { reachInSpeech } from "../simulation";
import type { ClaimAudience, EntityId, ProvisionReach } from "../simulation";
import { nameOnce } from "./english-grammar";
import { composeCostObjection } from "./legislative-cost-objection-english";
import {
  ENGLISH_MOTIF_FAMILIES,
  composeMotifEnglish,
  type MotifFactKey,
} from "./legislative-motif-english";
import type { GroundedEnglishFact } from "./grounded-english";

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
  readonly reach: ProvisionReach;
  readonly instrument?: "bill" | "act" | "ordinance";
  readonly beneficiary: string | null;
  readonly place: string | null;
  readonly amount: string | null;
  readonly billAmount: string | null;
  readonly analyst: string;
  readonly chamber: string;
  readonly nextStep: string;
  readonly priorStatement: string | null;
  readonly statedGround?: string | null;
}

export interface LegislativeMotifGrounding {
  readonly worldSeed: string;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonId: EntityId;
  readonly measureId: EntityId;
  readonly billAmountSourceIds: readonly EntityId[];
  readonly analystPersonId?: EntityId;
  readonly requestedSection?: {
    readonly adoptedProvisionId: EntityId | null;
  } | null;
}

export interface LegislativeMotifContext {
  readonly family: LegislativeMotifFamily;
  readonly voice: LegislativeVoice;
  readonly audience: ClaimAudience;
  readonly priorFamily: LegislativeMotifFamily | null;
  readonly variantSeed: string;
  readonly facts: LegislativeMotifFacts;
  readonly grounding: LegislativeMotifGrounding;
}

export function legislativeBargainingLine(
  context: LegislativeMotifContext,
): string {
  const line = composeBargainingEnglish(context);
  const instrument = context.facts.instrument ?? "bill";
  const laterName =
    instrument === "bill"
      ? "this bill"
      : instrument === "act"
        ? "the act"
        : "the ordinance";
  return `“${nameOnce(line.text, context.facts.designation, laterName)}”`;
}

export function eligibleBargainingVariantKeys(
  context: LegislativeMotifContext,
): readonly string[] {
  return composeBargainingEnglish(context).parts.map((part) => part.partKey);
}

export function bargainingEnglishFamilies(): readonly LegislativeMotifFamily[] {
  return ["object-on-cost", ...ENGLISH_MOTIF_FAMILIES];
}

function composeBargainingEnglish(context: LegislativeMotifContext) {
  const { facts, grounding } = context;
  const measure = [grounding.measureId];
  if (context.family === "object-on-cost") {
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
          facts.billAmount === null ||
          grounding.billAmountSourceIds.length === 0
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
    reach: word(reachInSpeech(facts.reach)),
    "prior-statement": word(facts.priorStatement, [grounding.speakerPersonId]),
    "answering-a-hold":
      context.priorFamily !== null &&
      [
        "ask-for-commitment",
        "refuse-to-commit-yet",
        "object-on-cost",
        "demand-narrower-scope",
        "district-beneficiary-concern",
      ].includes(context.priorFamily)
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
