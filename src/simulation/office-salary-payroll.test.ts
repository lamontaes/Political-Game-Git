import { expect, it } from "vitest";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createScenarioWorld } from "./demo";
import { applyLawConsequences } from "./enacted-law-effects";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import {
  settleTownCompensations,
  type TownCompensationPeriod,
} from "./living-world/town-pay";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { settleOfficeSalaries } from "./office-salary";
import { createProductionPolicyCatalog } from "./production-catalog";
import { recordedPayStubs } from "./resource-income";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld } from "./world";
import { personName } from "./people";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";

// Preserve the existing payroll sample, drawn from all 56 jurisdictions.
const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);
const provenance = {
  kind: "authored" as const,
  note: "A37 controlled saved office work, contract and employer cash; not an election or opening proof.",
};

function fixture(
  placeKey: string,
  weeks = 2,
  amountMinor = 10000,
  cadenceKind: "schedule:weekly" | "schedule:town-weekly" = "schedule:weekly",
) {
  const place = requireLifePlace(placeKey);
  const seed = `a37-office-payroll:${placeKey}`;
  // Only reuse generated people; the production catalog precedes all saved work.
  const identities = createScenarioWorld(seed, place.context, {
    peopleCount: 3,
  });
  const personId = identities.personOrder[0]!;
  // The town's recorded weekly cadence starts Saturday; use the same actual
  // interval for both contracts instead of changing either payday calendar.
  const startsAt = addDays(
    identities.currentDate,
    (6 - new Date(`${identities.currentDate}T00:00:00Z`).getUTCDay() + 7) % 7,
  );
  let world = createWorld({
    seed,
    currentDate: startsAt,
    currentMoment: simulationMomentOnLocalDate(
      identities.currentMoment,
      startsAt,
    ),
    people: Object.values(identities.people),
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
    control: { kind: "person", personId },
  });
  world = createOrganization(world, {
    stableKey: "fixture:a37:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled public employer",
      classification: "sector:government",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "fixture:a37:office",
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:civil-service",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Controlled appointed clerk",
      occupationClassification: "occupation:office-clerk",
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
  world = createWorkCompensation(world, {
    stableKey: `office-salary:${work.id}`,
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(amountMinor, "USD"),
    cadenceKind,
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = createResourcePosition(world, {
    stableKey: "fixture:a37:employer-cash",
    owner: { kind: "organization", organizationId },
    openedAt: world.currentDate,
    openingBalance: money(1_000_000_000, "USD"),
    provenance,
  });
  const date = addDays(world.currentDate, weeks * 7);
  world = {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
  const periods: TownCompensationPeriod[] = Array.from(
    { length: weeks },
    (_, index) => {
      const periodStartsAt = addDays(flow.startsAt, index * 7);
      const onDate = addDays(periodStartsAt, 7);
      return {
        stableKey: `${flow.stableKey}:${periodStartsAt}`,
        payFlowId: flow.id,
        activityId: flow.id,
        periodStartsAt,
        periodEndsAt: addDays(onDate, -1),
        onDate,
        note: "Salary for the week.",
        provenance: flow.provenance,
      };
    },
  );
  return { world, work, flow, personId, organizationId, periods, seed };
}

it.each(sampled)(
  "A37 routes %s's named office worker through the common payroll, withholding and legal floor",
  (placeKey) => {
    const f = fixture(placeKey);
    const shared = settleTownCompensations(f.world, f.periods);
    const office = settleOfficeSalaries(f.world, f.personId);
    expect(serializeWorld(office)).toBe(serializeWorld(shared));
    const townFixture = fixture(placeKey, 2, 10000, "schedule:town-weekly");
    const town = settleTownCompensations(
      townFixture.world,
      townFixture.periods,
    );
    const paid = office.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === f.flow.id,
    );
    expect(paid).toHaveLength(2);
    const stubs = recordedPayStubs(office, f.personId);
    expect(stubs).toHaveLength(2);
    const financialLines = (stub: (typeof stubs)[number]) => ({
      gross: stub.paidGross,
      withheld: stub.withheld,
      net: stub.netPaid,
      taxes: stub.taxes.map((tax) => ({
        key: tax.liability.taxKey,
        amount: tax.withheld,
      })),
      laws: stub.laws.map((law) => ({
        governingLawKey: law.stamp.governingLawKey,
        questionKey: law.stamp.questionKey,
        jurisdictionId: law.stamp.jurisdictionId,
      })),
    });
    expect(stubs.map(financialLines)).toEqual(
      recordedPayStubs(town, townFixture.personId).map(financialLines),
    );
    for (const stub of stubs) {
      expect(stub.paidGross.minorUnits).toBeGreaterThan(10000);
      expect(stub.assessmentStatus).toBe("recorded");
      expect(stub.taxes.length).toBeGreaterThan(0);
      expect(stub.withheld.minorUnits).toBeGreaterThan(0);
      expect(stub.netPaid.minorUnits).toBe(
        stub.paidGross.minorUnits - stub.withheld.minorUnits,
      );
      expect(stub.laws.length).toBeGreaterThan(0);
    }
    const gross = paid.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    expect(
      resourcePositionAt(
        office,
        { kind: "organization", organizationId: f.organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(1_000_000_000 - gross);
    expect(
      resourcePositionAt(
        town,
        { kind: "organization", organizationId: townFixture.organizationId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits,
    ).toBe(1_000_000_000 - gross);
    expect(settleOfficeSalaries(office, f.personId)).toBe(office);
    expect(
      serializeWorld(
        settleOfficeSalaries(
          deserializeWorld(serializeWorld(f.world)),
          f.personId,
        ),
      ),
    ).toBe(serializeWorld(office));
    expect(
      serializeWorld(
        settleOfficeSalaries(
          deserializeWorld(serializeWorld(office)),
          f.personId,
        ),
      ),
    ).toBe(serializeWorld(office));
    console.log(
      `A37 ${placeKey} ${f.seed}: ${personName(office.people[f.personId]!)} gross=${gross}, withholding=${stubs.reduce((sum, stub) => sum + stub.withheld.minorUnits, 0)}`,
    );
  },
);

it("A37 pays every due office period beyond the former 520-week cap without a second call", () => {
  const f = fixture(sampled[0]!, 521, 200000);
  const office = settleOfficeSalaries(f.world, f.personId);
  expect(
    office.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === f.flow.id,
    ),
  ).toHaveLength(521);
  expect(settleOfficeSalaries(office, f.personId)).toBe(office);
});

it("A37 stops at the first week not fully held and preserves an already stronger contract", () => {
  const f = fixture(sampled[0]!, 2, 200000);
  const status = f.world.history.workStatuses.find(
    (row) => row.workRelationshipId === f.work.id,
  )!;
  const ended = recordWorkStatus(f.world, {
    stableKey: "fixture:a37:ended",
    workRelationshipId: f.work.id,
    effectiveAt: addDays(f.flow.startsAt, 8),
    status: "ended",
    reason: "Controlled actual appointment ended.",
    provenance,
    supersedesStatusId: status.id,
  });
  const paid = settleOfficeSalaries(ended, f.personId);
  const rows = paid.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === f.flow.id,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]!.transferredAmount.minorUnits).toBe(200000);
});

it("A37 refuses a weekly floor revision between the actual contract's period boundaries", () => {
  const f = fixture(sampled[0]!);
  expect(() =>
    applyLawConsequences(f.world, {
      onDate: addDays(f.flow.startsAt, 1),
      activity: "payroll",
      activityId: f.flow.id,
      subjectIds: [f.personId],
    }),
  ).toThrow("pay.period.starts-on-effective-date");
  expect(f.world.history.resourceTransferOutcomes).toHaveLength(0);
});
