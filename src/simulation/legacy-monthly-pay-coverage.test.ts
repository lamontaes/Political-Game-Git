import { expect, it } from "vitest";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { createOrganization } from "./life";
import { requireLifePlace } from "./life-places";
import { legacyMonthlyPayCoverage } from "./monthly-work-pay";
import { createLightweightPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { serializeWorld } from "./serialization";
import { createWorld, createWorldId } from "./world";

const provenance = {
  kind: "authored" as const,
  note: "Read-only Ruling20 query control, not historical save admission.",
};
function savedPoint(
  date: string,
  cadenceKind: "schedule:monthly" | "schedule:weekly" = "schedule:monthly",
) {
  const place = requireLifePlace("2836000");
  const seed = `legacy-monthly-query:${date}:${cadenceKind}`;
  const currentDate = makeIsoDate(date);
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  let world = createWorld({
    seed,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      place.context.initialMoment,
      currentDate,
    ),
    people: [person],
    jurisdictions: [place.context.jurisdiction],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createOrganization(world, {
    stableKey: "local-business:legacy-query",
    formedAt: makeIsoDate("2025-12-01"),
    provenance,
    initialProfile: {
      name: "Saved monthly employer",
      classification: "sector:private",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const employer = world.history.organizations.at(-1)!;
  world = createResourceFlow(world, {
    stableKey: "local-business:legacy-query:worker:1:wages",
    source: { kind: "organization", organizationId: employer.id },
    recipient: { kind: "person", personId: person.id },
    startsAt: makeIsoDate("2025-12-01"),
    amount: money(500000, "USD"),
    cadenceKind,
    basisKind: "compensation:wages",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: place.context.jurisdiction.id,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = recordResourceTransferOutcome(world, {
    stableKey: `${flow.stableKey}:${date}`,
    resourceFlowId: flow.id,
    periodStartsAt: currentDate,
    periodEndsAt: currentDate,
    occurredAt: currentDate,
    status: "completed",
    attemptedAmount: money(500000, "USD"),
    transferredAmount: money(500000, "USD"),
    reasonKind: null,
    note: null,
    provenance,
  });
  return {
    world,
    flow,
    outcome: world.history.resourceTransferOutcomes.at(-1)!,
  };
}

it("A37 Ruling20 reads the preceding month without changing the saved point, money or history", () => {
  const { world, flow, outcome } = savedPoint("2026-02-01");
  const before = serializeWorld(world);
  expect(legacyMonthlyPayCoverage(world, outcome.id)).toEqual({
    outcomeId: outcome.id,
    resourceFlowId: flow.id,
    termsId: world.history.resourceFlowTerms[0]!.id,
    periodStartsAt: "2026-01-01",
    periodEndsAt: "2026-01-31",
    nextPeriodStartsAt: "2026-02-01",
    gross: money(500000, "USD"),
  });
  expect(serializeWorld(world)).toBe(before);
  expect(outcome.periodStartsAt).toBe("2026-02-01");
});
it("A37 Ruling20 keeps the year boundary and next strict interval contiguous", () => {
  const { world, outcome } = savedPoint("2026-01-01");
  expect(legacyMonthlyPayCoverage(world, outcome.id)).toMatchObject({
    periodStartsAt: "2025-12-01",
    periodEndsAt: "2025-12-31",
    nextPeriodStartsAt: "2026-01-01",
  });
});
it("A37 Ruling20 does not admit the retained January20 point", () => {
  const { world, outcome } = savedPoint("2026-01-20");
  expect(legacyMonthlyPayCoverage(world, outcome.id)).toBeNull();
});
it("A37 Ruling20 refuses weekly terms and a reference to a record outside saved outcomes", () => {
  const { world, flow, outcome } = savedPoint("2026-02-01", "schedule:weekly");
  expect(legacyMonthlyPayCoverage(world, outcome.id)).toBeNull();
  expect(legacyMonthlyPayCoverage(world, flow.id)).toBeNull();
});
