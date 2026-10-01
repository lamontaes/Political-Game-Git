import { expect, it } from "vitest";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { createOrganization, createWorkRelationship } from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { settleJobPay } from "./job-market";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { createLightweightPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { recordedPayStubs } from "./resource-income";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { createResourceFlow, createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld, createWorld, createWorldId } from "./world";

const authored = {
  kind: "authored" as const,
  note: "Explicit under-floor weekly contract and cash control; not an actual wage estimate.",
};
function weeklyWorker(placeKey: string) {
  const place = requireLifePlace(placeKey);
  const seed = `a38-weekly:${placeKey}`;
  const currentDate = makeIsoDate("2026-01-16");
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
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createOrganization(world, {
    stableKey: "fixture:weekly:employer",
    formedAt: currentDate,
    provenance: authored,
    initialProfile: {
      name: "Recorded weekly employer",
      classification: "sector:private",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const employer = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: "fixture:weekly:work",
    personId: person.id,
    organizationId: employer.id,
    startedAt: currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Recorded weekly worker",
      occupationClassification: "occupation:retail-salesperson",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = createResourceFlow(world, {
    stableKey: `job-pay:${work.id}`,
    source: { kind: "organization", organizationId: employer.id },
    recipient: { kind: "person", personId: person.id },
    startsAt: currentDate,
    basisKind: "compensation:wages",
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    amount: money(10000, "USD"),
    cadenceKind: "schedule:weekly",
    jurisdictionId: place.context.jurisdiction.id,
    provenance: authored,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  for (const [owner, balance] of [
    [{ kind: "organization" as const, organizationId: employer.id }, 1000000],
    [{ kind: "person" as const, personId: person.id }, 0],
  ] as const)
    world = createResourcePosition(world, {
      stableKey: `fixture:weekly:cash:${owner.kind}`,
      owner,
      openedAt: currentDate,
      openingBalance: money(balance, "USD"),
      provenance: authored,
    });
  return { world, person, work, employer, flow };
}

// Jan16 standard rates from the canonical sourced starting-law phases.
it.each([
  ["1150000", 1795],
  ["2836000", 725],
  ["5363000", 1713],
  ["2938000", 1500],
  ["3451000", 1592],
] as const)(
  "A38 %s weekly job consumer preserves canonical floor authority on terms and pay",
  (placeKey, hourlyMinor) => {
    const f = weeklyWorker(placeKey);
    const due = advanceWorld(
      f.world,
      7,
      createFutureTransitionHandlerRegistry([]),
    );
    const paid = settleJobPay(due, f.person.id);
    const terms = resourceFlowTermsAt(paid, f.flow.id)!;
    expect(terms.amount).toEqual(money(hourlyMinor * 40, "USD"));
    expect(terms.lawEffectStamps).toEqual(
      expect.arrayContaining([expect.objectContaining({ effectKind: "pay" })]),
    );
    const outcomes = paid.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === f.flow.id,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      periodStartsAt: "2026-01-16",
      periodEndsAt: "2026-01-22",
      occurredAt: "2026-01-23",
      attemptedAmount: terms.amount,
      transferredAmount: terms.amount,
    });
    expect(outcomes[0]!.lawEffectStamps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectKind: "pay",
          governingLawKey: terms.lawEffectStamps![0]!.governingLawKey,
          sourceRecordIds: expect.arrayContaining([
            f.flow.id,
            f.work.id,
            terms.id,
            outcomes[0]!.id,
          ]),
        }),
      ]),
    );
    const stub = recordedPayStubs(paid, f.person.id).find(
      (row) => row.paycheck.id === outcomes[0]!.id,
    )!;
    expect(stub.assessmentStatus).toBe("recorded");
    expect(stub.withheld.minorUnits).toBeGreaterThan(0);
    expect(stub.netPaid.minorUnits).toBe(
      stub.paidGross.minorUnits - stub.withheld.minorUnits,
    );
    expect(
      resourcePositionAt(paid, f.flow.source, money(0, "USD").currency)!
        .liquidBalance,
    ).toEqual(
      money(1000000 - outcomes[0]!.transferredAmount.minorUnits, "USD"),
    );
    expect(settleJobPay(paid, f.person.id)).toBe(paid);
    expect(
      serializeWorld(
        settleJobPay(deserializeWorld(serializeWorld(paid)), f.person.id),
      ),
    ).toBe(serializeWorld(paid));
  },
);
