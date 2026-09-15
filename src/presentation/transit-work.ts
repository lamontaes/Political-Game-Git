import {
  fundedServiceRefusal,
  resolveStateFundedServiceCapability,
} from "./funded-service-capability";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { projectTransitCashSnapshot } from "./transit-cash-snapshot";
import {
  fileDraftFromOffice,
  readDocket,
  parseDocketMeasureIdentity,
  type FileDraftResult,
} from "./legislation-docket";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "../simulation/legislation-transit-families";
import { resolveTransitFunding } from "../simulation/transit-funding";
import {
  requestTransitImplementation,
  transitDueState,
  cancelTransitImplementation,
  publishTransitReport,
  TRANSIT_DELIVERY_KEY,
} from "../simulation/transit-service";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import type { EntityId, World } from "../simulation/types";

export function transitOffice(world: World, personId: EntityId) {
  const seat = resolveActiveMemberSeat(world, personId);
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    seat.kind !== "seated"
  )
    return {
      kind: "unavailable" as const,
      reason:
        seat.kind === "unseated"
          ? seat.reason
          : "This is not the controlled character.",
    };
  const capability = resolveStateFundedServiceCapability(
    seat.seat.jurisdictionKey,
    world.currentDate,
  );
  if (!capability.supported)
    return {
      kind: "unavailable" as const,
      reason: fundedServiceRefusal(capability),
    };
  return { kind: "available" as const, seat: seat.seat };
}
export function fileTransitAppropriation(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly amountMinorUnits: number;
    readonly serviceWindow: "weekday" | "weekend";
  },
): FileDraftResult {
  const allowed = transitOffice(world, input.personId);
  if (allowed.kind === "unavailable") throw new Error(allowed.reason);
  const entry = resolveLegislativeFilingEntry(world, input.personId);
  if (entry.kind === "unavailable") throw new Error(entry.reason);
  return fileDraftFromOffice(world, {
    playerPersonId: input.personId,
    scenarioKey: entry.scenarioKey,
    jurisdictionId: entry.seat.governingJurisdictionId,
    familyKey: TRANSIT_FAMILY_KEY,
    variantKey: TRANSIT_VARIANT_KEY,
    authorityKey: TRANSIT_PROGRAM_KEY,
    parameterValues: {
      appropriation: {
        kind: "money",
        minorUnits: input.amountMinorUnits,
        currency: "USD",
      },
      "service-window": { kind: "enumerated", value: input.serviceWindow },
    },
  });
}
export function requestTransitFromOffice(
  world: World,
  input: { readonly personId: EntityId; readonly measureId: EntityId },
) {
  const entry = transitOffice(world, input.personId);
  if (entry.kind === "unavailable") throw new Error(entry.reason);
  const mandate = resolveTransitFunding(world, input.measureId);
  if (mandate.kind === "unavailable") throw new Error(mandate.reason);
  if (mandate.mandate.jurisdictionId !== entry.seat.governingJurisdictionId)
    throw new Error("The active office does not govern this appropriation.");
  return requestTransitImplementation(world, input);
}
export { cancelTransitImplementation, publishTransitReport };
/** Recorded cash in the existing same-jurisdiction public account, or null
 * when no account or balance has been recorded. Reading reserves nothing. */
function publicCashFor(world: World, jurisdictionId: EntityId): number | null {
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
  if (!account) return null;
  return (
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: account.organizationId },
      money(0, "USD").currency,
    )?.liquidBalance.minorUnits ?? null
  );
}
export function projectTransitWork(world: World, personId: EntityId) {
  const office = transitOffice(world, personId);
  const keys = [
    ...new Set(
      (world.history.legislativeDraftLineages ?? [])
        .filter(
          (l) =>
            l.familyKey === TRANSIT_FAMILY_KEY &&
            l.variantKey === TRANSIT_VARIANT_KEY,
        )
        .map((l) => {
          const m = world.history.legislativeMeasures!.find(
            (m) => m.id === l.measureId,
          )!;
          return parseDocketMeasureIdentity(m.stableKey)?.scenarioKey ?? null;
        })
        .filter((key): key is string => key !== null),
    ),
  ];
  const bills = keys
    .flatMap((scenarioKey) =>
      readDocket(world, { scenarioKey, playerPersonId: personId }),
    )
    .filter(
      (b) =>
        b.familyKey === TRANSIT_FAMILY_KEY &&
        b.variantKey === TRANSIT_VARIANT_KEY &&
        b.sponsorPersonId === personId,
    );
  return {
    office,
    bills: bills.map((bill) => ({
      bill,
      funding: resolveTransitFunding(world, bill.measureId),
      // Completed public payments under this appropriation only; a forecast,
      // an appropriation or a refused period adds nothing.
      paidMinorUnits: world.history.resourceFlows.reduce((sum, flow) => {
        if (
          flow.basisReference.kind !== "public-funding" ||
          flow.basisReference.mandate.measureId !== bill.measureId
        )
          return sum;
        const outcome = world.history.resourceTransferOutcomes.find(
          (row) => row.resourceFlowId === flow.id && row.status === "completed",
        );
        return sum + (outcome?.transferredAmount.minorUnits ?? 0);
      }, 0),
      publicCashMinorUnits: publicCashFor(world, bill.jurisdictionId),
      cashSnapshot:
        office.kind === "available"
          ? projectTransitCashSnapshot(world, bill.measureId)
          : { kind: "authority-unavailable" as const, reason: office.reason },
      requested: world.history.events.some(
        (e) => e.stableKey === `transit-request:${bill.measureId}`,
      ),
      periods: world.history.futureDueItems
        .filter(
          (d) =>
            d.transitionKey === TRANSIT_DELIVERY_KEY &&
            d.entityIds.includes(bill.measureId),
        )
        .map((due) => {
          const estimate = world.history.policyEstimates.find((e) =>
            due.entityIds.includes(e.id),
          )!;
          const realization = world.history.policyRealizations.find(
            (r) => r.estimateId === estimate.id,
          );
          return {
            due,
            state: transitDueState(world, due.id),
            forecast: estimate.consequences[0]!.estimatedChange,
            delivered: realization?.consequences[0]?.realizedChange ?? null,
          };
        }),
    })),
    reports: world.history.events
      .filter(
        (e) =>
          [
            "transit.service-period-settled",
            "transit.undelivered-service-cancelled",
          ].includes(e.type) &&
          bills.some((b) => e.involvedEntityIds.includes(b.measureId)),
      )
      .map((event) => ({
        event,
        published: world.history.events.some(
          (e) => e.stableKey === `transit-report:${event.id}`,
        ),
      })),
  };
}
