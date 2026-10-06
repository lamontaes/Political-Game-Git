import { decideExecutiveActionAuthority } from "./executive-action-authority";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import { issueExecutiveInstrument } from "./legislation";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { lawInForce } from "./governing/law-in-force";
import type { EnforcementPriority } from "./executive-enforcement-reader";
import type { EntityId, World } from "./types";
import type {
  GoverningMatter,
  GoverningOffice,
} from "./governing/state-governing";

export { executiveEnforcementPriorityForLaw } from "./executive-enforcement-reader";
export type { EnforcementPriority } from "./executive-enforcement-reader";

export interface EnforcementDirectiveInput {
  readonly office: GoverningOffice;
  readonly matter: GoverningMatter;
  readonly propositionId: EntityId;
  readonly statuteMeasureId: EntityId;
  readonly priority: EnforcementPriority;
}

export function issueExecutiveEnforcementDirective(
  world: World,
  input: EnforcementDirectiveInput,
): World {
  const jurisdictionKey =
    input.office.officeKey === "us-president"
      ? "US"
      : input.office.stateUsps
        ? `US-${input.office.stateUsps}`
        : null;
  if (!jurisdictionKey) return world;
  const law = lawInForce(
    world,
    input.office.jurisdictionId,
    input.propositionId,
  );
  const clause = {
    kind: "enforcement-priority" as const,
    propositionId: input.propositionId,
    statuteMeasureId: input.statuteMeasureId,
    priority: input.priority,
  };
  const pack = executiveRulePackForJurisdiction(jurisdictionKey);
  if (!decideExecutiveActionAuthority(pack, clause, law).allowed) return world;
  const stableKey = `${input.matter.stableKey}:enforcement:${input.priority}`;
  return issueExecutiveInstrument(world, {
    stableKey,
    jurisdictionKey,
    jurisdictionId: input.office.jurisdictionId,
    legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
    instrument: "executive-order",
    designation: `Enforcement Directive ${input.priority}`,
    shortTitle: input.matter.title,
    summary: `Set enforcement of the named statute to ${input.priority} priority.`,
    actorLabel: pack.displayName,
    actorPersonId: input.office.holderPersonId,
    rationale:
      "Set an enforcement sequence while continuing to execute the statute faithfully.",
    sourceDocumentKey: `session38:enforcement:${input.matter.id}`,
    publishedAt: world.currentDate,
    effectiveAt: world.currentDate,
    expiresAt: null,
    propositionIds: [],
    propositionAnswers: [],
    authorityChecks: [{ clause }],
  });
}
