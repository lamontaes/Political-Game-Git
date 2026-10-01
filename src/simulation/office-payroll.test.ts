import { expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { createOrganization, createWorkRelationship } from "./life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import {
  initializeOfficeSalaryFlows,
  settleOfficeSalaries,
} from "./office-salary";
import { settleTownCompensations } from "./living-world/town-pay";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { createResourcePosition, money } from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { personName } from "./people";
import { withWorldIntegrityDeferred } from "./world";
import type { World, IsoDate } from "./types";

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

it("A37 preserves recorded employer cash over two office pay periods", () => {
  const f = officeFixture(sampled[0]!);
  const employer = {
    kind: "organization" as const,
    organizationId: f.work.organizationId!,
  };
  const currency = money(0, "USD").currency;
  expect(resourcePositionAt(f.world, employer, currency)).toBeUndefined();
  const funded = createResourcePosition(f.world, {
    stableKey: `fixture:a37:cash:${f.work.id}`,
    owner: employer,
    openedAt: f.world.currentDate,
    openingBalance: money(10_000_000, "USD"),
    provenance: {
      kind: "authored",
      note: "Explicit recorded government funding control; not an ordinary generated budget.",
    },
  });
  const before = atControlledDate(funded, addDays(f.flow.startsAt, 14));
  let shared = before;
  for (let week = 0; week < 2; week += 1) {
    const periodStartsAt = addDays(f.flow.startsAt, week * 7);
    const onDate = addDays(periodStartsAt, 7);
    shared = settleTownCompensations(shared, [
      {
        stableKey: `${f.flow.stableKey}:${periodStartsAt}`,
        payFlowId: f.flow.id,
        activityId: f.flow.id,
        periodStartsAt,
        periodEndsAt: addDays(onDate, -1),
        onDate,
        note: "Salary for the week.",
        provenance: f.flow.provenance,
      },
    ]);
  }
  const office = settleOfficeSalaries(before, f.personId);
  expect(serializeWorld(office)).toBe(serializeWorld(shared));
  const paid = office.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === f.flow.id,
  );
  expect(paid).toHaveLength(2);
  const grossMinor = paid.reduce(
    (total, row) => total + row.transferredAmount.minorUnits,
    0,
  );
  expect(
    resourcePositionAt(office, employer, currency)!.liquidBalance.minorUnits,
  ).toBe(10_000_000 - grossMinor);
  expect(settleOfficeSalaries(office, f.personId)).toBe(office);
  expect(
    serializeWorld(
      settleOfficeSalaries(
        deserializeWorld(serializeWorld(before)),
        f.personId,
      ),
    ),
  ).toBe(serializeWorld(office));
});
function officeFixture(placeKey: string) {
  const seed = `office-payroll:${placeKey}`;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = game.world;
  if (opened.control.kind !== "person")
    throw new Error("Actual player required");
  const personId = opened.control.personId;
  let world = ensureNationalElectionJurisdiction(opened);
  // Explicit authored review work, through the canonical saved-work writers.
  // This is not an election or an ordinary appointment proof.
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const provenance = {
    kind: "authored" as const,
    note: "A37 fictional office-work payroll comparison.",
  };
  world = createOrganization(world, {
    stableKey: `fixture:a37:employer:${personId}`,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Review congressional office",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `fixture:a37:office:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:congress-member",
    compensation: "paid",
    authority: "directs-others",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Review member of Congress",
      occupationClassification: "service:us-congress",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  const withoutPay = world;
  world = initializeOfficeSalaryFlows(world, personId);
  const flow = world.history.resourceFlows.find(
    (entry) =>
      entry.basisReference.kind === "work" &&
      entry.basisReference.workRelationshipId === work.id,
  )!;
  expect(flow).toBeDefined();
  expect(flow.startsAt).toBe(withoutPay.currentDate);
  expect(world.history.resourceTransferOutcomes).toEqual(
    withoutPay.history.resourceTransferOutcomes,
  );
  expect(initializeOfficeSalaryFlows(world, personId)).toBe(world);
  return { world, work, flow, personId, seed, placeKey };
}

function atControlledDate(world: World, date: IsoDate): World {
  return withWorldIntegrityDeferred(() => {
    let next = world;
    for (const due of world.history.futureDueItems) {
      const state = futureDueItemStateAt(world, due.id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      });
      if (state?.status === "scheduled" && due.dueAt < date)
        next = cancelFutureDueItem(next, {
          stableKey: `fixture:a37-context:${due.id}`,
          dueItemId: due.id,
          effectiveAt: world.currentDate,
          reasonKey: "fixture:office-payroll-context",
          context:
            "Controlled existing office period parity; not an ordinary clock or election proof.",
        });
    }
    return {
      ...next,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
    };
  });
}

it.each(sampled)(
  "A37 preserves an actual saved review-office period through the one payroll in %s",
  (placeKey) => {
    const f = officeFixture(placeKey);
    const firstDue = addDays(f.flow.startsAt, 7);
    expect(
      settleOfficeSalaries(
        atControlledDate(f.world, addDays(firstDue, -1)),
        f.personId,
      ).history.resourceTransferOutcomes,
    ).toEqual(f.world.history.resourceTransferOutcomes);
    const before = atControlledDate(f.world, firstDue);
    const period = {
      stableKey: `${f.flow.stableKey}:${f.flow.startsAt}`,
      payFlowId: f.flow.id,
      activityId: f.flow.id,
      periodStartsAt: f.flow.startsAt,
      periodEndsAt: addDays(firstDue, -1),
      onDate: firstDue,
      note: "Salary for the week.",
      provenance: f.flow.provenance,
    };
    const office = settleOfficeSalaries(before, f.personId);
    const shared = settleTownCompensations(before, [period]);
    // Execute this on the old office writer before delegation, retaining the
    // same assertion afterwards. The entire canonical save must match.
    expect(serializeWorld(office)).toBe(serializeWorld(shared));
    const outcome = office.history.resourceTransferOutcomes.find(
      (entry) => entry.stableKey === period.stableKey,
    )!;
    expect(outcome.transferredAmount).toEqual(
      resourceFlowTermsAt(before, f.flow.id)!.amount,
    );
    expect(outcome.periodStartsAt).toBe(f.flow.startsAt);
    expect(outcome.periodEndsAt).toBe(addDays(firstDue, -1));
    expect(outcome.occurredAt).toBe(firstDue);
    expect(
      office.history.statutoryTaxLiabilities!.some(
        (entry) => entry.sourceOutcomeId === outcome.id,
      ),
    ).toBe(true);
    expect(settleOfficeSalaries(office, f.personId)).toBe(office);
    expect(settleTownCompensations(office, [period])).toBe(office);
    expect(
      serializeWorld(
        settleOfficeSalaries(
          deserializeWorld(serializeWorld(before)),
          f.personId,
        ),
      ),
    ).toBe(serializeWorld(office));
    const employer = {
      kind: "organization" as const,
      organizationId: f.work.organizationId!,
    };
    console.info("A37_OFFICE_PAYROLL", {
      seed: f.seed,
      placeKey,
      person: personName(office.people[f.personId]!),
      flowId: f.flow.id,
      grossMinor: outcome.transferredAmount.minorUnits,
      employeeBalanceMinor: resourcePositionAt(
        office,
        { kind: "person", personId: f.personId },
        outcome.transferredAmount.currency,
      )?.liquidBalance.minorUnits,
      employerBalanceMinor:
        resourcePositionAt(office, employer, outcome.transferredAmount.currency)
          ?.liquidBalance.minorUnits ?? null,
      fixture:
        "authored congressional work; existing published salary preserved, ordinary appointment not tested",
    });
  },
);
