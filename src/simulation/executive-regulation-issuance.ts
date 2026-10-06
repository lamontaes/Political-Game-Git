import { decideExecutiveActionAuthority } from "./executive-action-authority";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { issueExecutiveInstrument } from "./legislation";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { lawInForce } from "./governing/law-in-force";
import { recordFiledProvision } from "./legislative-politics";
import type { LawDelegationTerm } from "./law-consequence-types";
import type { EntityId, World } from "./types";
import type {
  GoverningOffice,
  GoverningMatter,
} from "./governing/state-governing";

export interface DelegatedRegulationIssueInput {
  readonly office: GoverningOffice;
  readonly matter: GoverningMatter;
  readonly actorPersonId: EntityId;
  readonly propositionId: EntityId;
  readonly delegation: LawDelegationTerm;
  readonly value: number;
  readonly drafterPersonId: EntityId;
}

export function executiveJurisdictionKeyForOffice(
  office: GoverningOffice,
): string | null {
  if (office.officeKey === "us-president") return "US";
  return office.stateUsps ? `US-${office.stateUsps}` : null;
}

export function delegatedRegulationAuthority(
  world: World,
  input: DelegatedRegulationIssueInput,
) {
  const jurisdictionKey = executiveJurisdictionKeyForOffice(input.office);
  if (!jurisdictionKey)
    return {
      allowed: false,
      reason: "This office has no recorded delegated rulemaking authority.",
      jurisdictionKey: null,
    };
  const delegation = input.delegation as LawDelegationTerm | null;
  if (
    !delegation ||
    typeof delegation.key !== "string" ||
    typeof delegation.questionKey !== "string" ||
    !Array.isArray(delegation.sourceIds) ||
    delegation.sourceIds.some((sourceId) => typeof sourceId !== "string") ||
    (delegation.unit !== null && typeof delegation.unit !== "string") ||
    (delegation.minimum !== null && !Number.isFinite(delegation.minimum)) ||
    (delegation.maximum !== null && !Number.isFinite(delegation.maximum)) ||
    (delegation.minimum === null && delegation.maximum === null) ||
    (delegation.minimum !== null &&
      delegation.maximum !== null &&
      delegation.minimum > delegation.maximum)
  )
    return {
      allowed: false,
      reason:
        "The proposed rule is missing a valid, bounded delegation from the statute.",
      jurisdictionKey,
    };
  const proposition = world.policyCatalog.propositions[input.propositionId];
  const declared = proposition?.consequences?.some((row) =>
    (row.delegations ?? []).some(
      (term) =>
        term.key === delegation.key &&
        term.questionKey === delegation.questionKey &&
        term.minimum === delegation.minimum &&
        term.maximum === delegation.maximum &&
        term.unit === delegation.unit &&
        term.sourceIds.length === delegation.sourceIds.length &&
        term.sourceIds.every(
          (sourceId, index) => sourceId === delegation.sourceIds[index],
        ),
    ),
  );
  const drafterIsRecorded = input.matter.openedEvent.participants.some(
    (participant) =>
      participant.personId === input.drafterPersonId &&
      participant.role === "agency:drafter",
  );
  if (
    input.matter.family !== "regulation" ||
    input.matter.officeKey !== input.office.officeKey ||
    input.matter.holderPersonId !== input.office.holderPersonId ||
    input.actorPersonId !== input.office.holderPersonId ||
    !input.matter.measureId ||
    !delegation.key.trim() ||
    delegation.questionKey !== proposition?.stableKey ||
    !delegation.unit ||
    delegation.sourceIds.length === 0 ||
    !Number.isFinite(input.value) ||
    (delegation.minimum !== null && input.value < delegation.minimum) ||
    (delegation.maximum !== null && input.value > delegation.maximum) ||
    !declared ||
    !world.people[input.drafterPersonId] ||
    !drafterIsRecorded
  )
    return {
      allowed: false,
      reason:
        "The proposed rule is missing its exact recorded delegation, range, or agency-head draft.",
      jurisdictionKey,
    };
  const law = lawInForce(
    world,
    input.office.jurisdictionId,
    input.propositionId,
  );
  const pack = executiveRulePackForJurisdiction(jurisdictionKey);
  return {
    ...decideExecutiveActionAuthority(
      pack,
      {
        kind: "delegated-term",
        propositionId: input.propositionId,
        statuteMeasureId: input.matter.measureId,
        delegation,
        value: input.value,
      },
      law,
    ),
    jurisdictionKey,
  };
}

/** Record the approved delegated value on the canonical measure and provision. */
export function issueDelegatedRegulation(
  world: World,
  input: DelegatedRegulationIssueInput,
): World {
  const authority = delegatedRegulationAuthority(world, input);
  if (!authority.allowed || !authority.jurisdictionKey) return world;
  const delegation = input.delegation;
  const stableKey = `${input.matter.stableKey}:regulation:${delegation.key}:${input.value}`;
  const law = lawInForce(
    world,
    input.office.jurisdictionId,
    input.propositionId,
  );
  if (!law || law.measureId !== input.matter.measureId) return world;
  const enacted = issueExecutiveInstrument(world, {
    stableKey,
    jurisdictionKey: authority.jurisdictionKey,
    jurisdictionId: input.office.jurisdictionId,
    legislativeRulePackId: legislatureProfilePackId(authority.jurisdictionKey),
    instrument: "regulation",
    delegatedFromMeasureId: law.measureId,
    designation: `Regulation ${delegation.key}`,
    shortTitle: input.matter.title,
    summary: `Set ${delegation.key} to ${input.value}${delegation.unit ? ` ${delegation.unit}` : ""} under ${delegation.sourceIds.join(", ")}.`,
    actorLabel: input.office.title,
    actorPersonId: input.actorPersonId,
    rationale: `Approved a draft prepared by the implementing agency head (${input.drafterPersonId}) within the statute's recorded range.`,
    sourceDocumentKey: `session9:regulation:${input.matter.id}:${delegation.key}`,
    publishedAt: world.currentDate,
    effectiveAt: world.currentDate,
    expiresAt: null,
    propositionIds: [input.propositionId],
    propositionAnswers: [
      {
        propositionId: input.propositionId,
        answer: law.answer,
      },
    ],
    authorityChecks: [
      {
        clause: {
          kind: "delegated-term",
          propositionId: input.propositionId,
          statuteMeasureId: law.measureId,
          delegation,
          value: input.value,
        },
      },
    ],
  });
  const measure = enacted.history.legislativeMeasures?.find(
    (record) => record.stableKey === stableKey,
  );
  if (!measure) return world;
  return recordFiledProvision(enacted, {
    stableKey: `${stableKey}:provision:${delegation.key}`,
    measureId: measure.id,
    provisionKey: `delegated:${delegation.key}`,
    sectionNumber: 1,
    heading: delegation.key,
    text: `The implementing agency sets ${delegation.key} to ${input.value}${delegation.unit ? ` ${delegation.unit}` : ""}, as permitted by ${delegation.sourceIds.join(", ")}.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "People and organizations subject to the delegated rule",
    },
    applicationScope: {
      jurisdictionId: input.office.jurisdictionId,
      segmentKey: null,
    },
    lawTerms: [
      {
        questionKey: delegation.questionKey,
        key: delegation.key,
        value: input.value,
        unit: delegation.unit!,
      },
    ],
    answers: { propositionId: input.propositionId, answer: law.answer },
  });
}
