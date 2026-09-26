import { introduceStateWageTaxBill } from "../simulation/state-wage-tax";
import { createWorkItem } from "../simulation/time-work";
import {
  STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS,
  stateTaxServiceProfileForJurisdictionKey,
  stateWageTaxTerms,
} from "../simulation/world-setup/state-tax-service-profiles";
import { assertWorldIntegrity } from "../simulation/world";
import {
  publicGovernmentIdentityForRecord,
  samePublicGovernmentIdentity,
} from "../simulation/public-government-identity";
import { stateWageTaxInForce } from "../simulation/tax-policy";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import type { EntityId, PublicGovernmentIdentity, World } from "../simulation";
import type { TaxTerms } from "../simulation/tax-types";

/**
 * The tax law of the state this person's current office legislates for: its
 * saved profile and the wage-tax terms in force today. Every state answers the
 * same way; there is no per-state route (owner decision 2026-09-26).
 */
export function stateWageTaxForOffice(
  world: World,
  personId: EntityId,
):
  | {
      readonly kind: "available";
      readonly profile: NonNullable<
        ReturnType<typeof stateTaxServiceProfileForJurisdictionKey>
      >;
      readonly inForce: TaxTerms;
    }
  | { readonly kind: "unavailable"; readonly reason: string } {
  const entry = resolveLegislativeFilingEntry(world, personId);
  if (entry.kind !== "available")
    return { kind: "unavailable", reason: entry.reason };
  const profile = stateTaxServiceProfileForJurisdictionKey(
    world,
    entry.seat.jurisdictionKey,
  );
  const inForce = stateWageTaxInForce(
    world,
    entry.seat.jurisdictionKey,
    world.currentDate,
  );
  if (!profile || !inForce)
    return {
      kind: "unavailable",
      reason: "This office's legislature has no state tax law in this save.",
    };
  return { kind: "available", profile, inForce: inForce.terms };
}

/**
 * The player's tax bill: set the state's wage-tax rate. The terms are the
 * state's own wage-tax law at the chosen rate; nothing else is authored.
 */
export function fileStateWageTaxRateFromOffice(
  world: World,
  input: { personId: EntityId; stableKey: string; rateBasisPoints: number },
): { world: World; measureId: EntityId } {
  const office = stateWageTaxForOffice(world, input.personId);
  if (office.kind !== "available") throw new Error(office.reason);
  if (
    !Number.isSafeInteger(input.rateBasisPoints) ||
    input.rateBasisPoints < 0 ||
    input.rateBasisPoints > STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS
  )
    throw new Error(
      `A state tax rate must be between 0% and ${STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS / 100}%.`,
    );
  const jurisdiction = world.jurisdictions[office.profile.jurisdictionId];
  return fileTaxProposalFromOffice(world, {
    personId: input.personId,
    stableKey: input.stableKey,
    terms: stateWageTaxTerms(
      office.profile.jurisdictionKey,
      jurisdiction?.name ?? office.profile.jurisdictionKey,
      input.rateBasisPoints,
    ),
  });
}

/** The current office is re-resolved at the action boundary; a cached panel
 * context, staff title or selected place never grants introduction authority.
 * S opens the returned canonical measure ID using its shared assignment reader.
 */
export function fileTaxProposalFromOffice(
  world: World,
  input: { personId: EntityId; stableKey: string; terms: TaxTerms },
): { world: World; measureId: EntityId } {
  const entry = resolveLegislativeFilingEntry(world, input.personId);
  if (entry.kind !== "available") throw new Error(entry.reason);
  // Every state files under its own saved tax law, Alaska included; Alaska's
  // sourced constitutional record remains its baseline evidence only.
  const alreadyFiled = world.history.taxProposals?.some(
    (row) => row.stableKey === input.stableKey,
  );
  const filed = introduceStateWageTaxBill(world, {
    stableKey: input.stableKey,
    jurisdictionKey: entry.seat.jurisdictionKey,
    rulePackId: entry.seat.legislativeRulePackId,
    originChamberKey: entry.seat.chamberKey,
    sponsorPersonId: input.personId,
    terms: input.terms,
  });
  if (alreadyFiled) return filed;
  const measureId = filed.measureId;
  let next = filed.world;
  next = createWorkItem(next, {
    stableKey: `${input.stableKey}:work`,
    title: `Consider ${next.history.legislativeMeasures!.at(-1)!.designation}`,
    summary:
      "Filed tax bill; it changes nothing until it becomes law and takes effect.",
    jurisdictionId: entry.jurisdictionId,
    sourceEntityIds: [measureId, entry.seat.outcomeEventId],
    focus: {
      kind: "legislative-material",
      targetKey: input.stableKey,
      sourceEntityId: measureId,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [input.personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  assertWorldIntegrity(next);
  return { world: next, measureId };
}

/** Public readers see only actual published general receipts. No payer/base
 * or campaign balance is exposed, and policy enactment is never revenue.
 */
export function readPublicTaxReceipts(
  world: World,
  scope: EntityId | PublicGovernmentIdentity,
) {
  const requestedIdentity =
    typeof scope === "string"
      ? ({ kind: "jurisdiction", jurisdictionId: scope } as const)
      : scope;
  return (world.history.taxCollections ?? [])
    .filter((row) => {
      if (row.status !== "collected") return false;
      const assessment = world.history.taxAssessments!.find(
        (item) => item.id === row.assessmentId,
      );
      const policy = assessment
        ? world.history.taxPolicies!.find(
            (item) => item.id === assessment.policyId,
          )
        : undefined;
      const proposal = policy
        ? world.history.taxProposals!.find(
            (item) => item.id === policy.proposalId,
          )
        : undefined;
      if (!proposal) return false;
      const identity = publicGovernmentIdentityForRecord(proposal);
      const collectionIdentity = row.publicGovernmentIdentity
        ? publicGovernmentIdentityForRecord({
            jurisdictionId: proposal.jurisdictionId,
            publicGovernmentIdentity: row.publicGovernmentIdentity,
          })
        : identity;
      return (
        samePublicGovernmentIdentity(collectionIdentity, requestedIdentity) &&
        world.history.events.some(
          (event) =>
            event.id === row.outcomeEventId &&
            event.visibility === "public" &&
            event.jurisdictionId === requestedIdentity.jurisdictionId,
        )
      );
    })
    .map((row) => {
      const assessment = world.history.taxAssessments!.find(
        (item) => item.id === row.assessmentId,
      )!;
      const policy = world.history.taxPolicies!.find(
        (item) => item.id === assessment.policyId,
      )!;
      const proposal = world.history.taxProposals!.find(
        (item) => item.id === policy.proposalId,
      )!;
      return {
        date: row.recordedAt,
        measureId: proposal.measureId,
        publicOrganizationId: proposal.publicOrganizationId,
        publicGovernmentIdentity: publicGovernmentIdentityForRecord(proposal),
        amount: row.transferredAmount,
        sourceEventId: row.outcomeEventId,
      };
    });
}
