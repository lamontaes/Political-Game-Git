import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import { TOWN_JOB_END_REASONS } from "../../src/simulation/living-world/town-labor-market";
import { TOWN_WORKPLACES } from "../../src/simulation/living-world/town-employment";
import { TOWN_JOB_SOC } from "../../src/simulation/living-world/town-job-soc";
import {
  nextPaydayDate,
  payPeriodEndingOn,
  payTownPaydays,
  startTownJobPay,
  townJobRate,
  townMinimumHourly,
  townPayPercentile,
} from "../../src/simulation/living-world/town-pay";
import { recordWorkStatus } from "../../src/simulation/life";
import { recordPersonDeath } from "../../src/simulation/vitality";
import { workStatusAt } from "../../src/simulation/life-queries";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation";

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly [string, string][] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.entries()]
    .map(([state, [key]]) => [state, key] as [string, string])
    .sort((a, b) => a[1].localeCompare(b[1]));
}

const NOT_IN_OEWS = new Set(["US-AS", "US-MP"]);

describe("one pay rule for every state, D.C. and territory", () => {
  it("every place pays a cashier from BLS wages, at or above its minimum, or says UNKNOWN", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    let paid = 0;
    for (const [, key] of places) {
      const place = lifePlaceByKey(key)!;
      const jurisdiction = place.context.jurisdiction.id;
      const state = place.stateJurisdictionKey!;
      const rate = townJobRate("occupation:cashier", jurisdiction, 50);
      if (NOT_IN_OEWS.has(state)) {
        // BLS publishes no wages there: unknown, never zero.
        expect(rate, key).toBeNull();
        continue;
      }
      expect(rate, key).not.toBeNull();
      paid += 1;
      const minimum = townMinimumHourly(jurisdiction);
      expect(minimum, key).not.toBeNull();
      expect(rate!.hourlyMinor, key).toBeGreaterThanOrEqual(
        Math.round(minimum! * 100),
      );
      // The lowest pay a cashier can draw still meets the minimum.
      const low = townJobRate("occupation:cashier", jurisdiction, 10)!;
      expect(low.hourlyMinor, key).toBeGreaterThanOrEqual(
        Math.round(minimum! * 100),
      );
    }
    expect(paid).toBe(54);
  });

  it("every kind of town job is paid as a published occupation", () => {
    for (const workplace of TOWN_WORKPLACES)
      for (const role of workplace.roles)
        expect(TOWN_JOB_SOC[role.occupation], role.title).toMatch(
          /^\d{2}-\d{4}$/,
        );
  });

  it("uses the town's own metro area before its state", () => {
    const columbus = lifePlaceByKey("3918000")!.context.jurisdiction.id;
    expect(townJobRate("profession:teacher", columbus, 50)!.area).toBe("18140");
    const sanJuan = lifePlaceByKey("7276770")!.context.jurisdiction.id;
    expect(townJobRate("occupation:cashier", sanJuan, 50)!.area).toBe("S72");
  });

  it("places a worker higher in the range the longer they have held the job", () => {
    expect(townPayPercentile(0)).toBe(25);
    expect(townPayPercentile(10)).toBe(50);
    expect(townPayPercentile(40)).toBe(75);
    expect(townPayPercentile(-1)).toBe(25);
    expect(townPayPercentile(100)).toBe(75);
  });
});

describe("paydays", () => {
  it("fall on Fridays, the 15th and the last day of the month", () => {
    const friday = makeIsoDate("2026-01-09");
    expect(payPeriodEndingOn("weekly", friday, 0)).toEqual({
      startsAt: "2026-01-03",
      endsAt: "2026-01-09",
    });
    expect(
      payPeriodEndingOn("weekly", makeIsoDate("2026-01-08"), 0),
    ).toBeNull();
    // Every two weeks: one Friday in two, by the employer's phase.
    const [a, b] = [0, 1].map((phase) =>
      payPeriodEndingOn("biweekly", friday, phase),
    );
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(
      payPeriodEndingOn("semimonthly", makeIsoDate("2026-02-15"), 0),
    ).toEqual({ startsAt: "2026-02-01", endsAt: "2026-02-15" });
    expect(
      payPeriodEndingOn("semimonthly", makeIsoDate("2026-02-28"), 0),
    ).toEqual({ startsAt: "2026-02-16", endsAt: "2026-02-28" });
    expect(
      payPeriodEndingOn("monthly", makeIsoDate("2026-02-15"), 0),
    ).toBeNull();
    expect(nextPaydayDate(makeIsoDate("2026-01-05"))).toBe("2026-01-09");
    expect(nextPaydayDate(makeIsoDate("2026-01-12"))).toBe("2026-01-15");
  });
});

describe("the town is paid", { timeout: 600_000 }, () => {
  it("a payday's taxes written together match the same paychecks taxed one by one", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "town-pay-batch",
        placeKey: "3918000",
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const since = game.world.currentDate;
    const started = startTownJobPay(game.world, game.playerPersonId, since);
    const date = addDays(since, 31);
    const payday = (oneByOne: boolean): World => {
      const flag = globalThis as { __civicPaycheckTaxesOneByOne?: boolean };
      flag.__civicPaycheckTaxesOneByOne = oneByOne;
      try {
        return withWorldIntegrityDeferred(() =>
          payTownPaydays(
            {
              ...started,
              currentDate: date,
              currentMoment: simulationMomentOnLocalDate(
                started.currentMoment,
                date,
              ),
            },
            since,
            game.playerPersonId,
          ),
        );
      } finally {
        delete flag.__civicPaycheckTaxesOneByOne;
      }
    };
    const together = payday(false);
    const oneByOne = payday(true);
    expect(
      together.history.statutoryTaxLiabilities!.length -
        (started.history.statutoryTaxLiabilities ?? []).length,
    ).toBeGreaterThan(40);
    expect(together.history).toEqual(oneByOne.history);
    // Taxing the next payday on top of the batch finds every earlier row.
    const next = addDays(date, 31);
    const later = withWorldIntegrityDeferred(() =>
      payTownPaydays(
        {
          ...together,
          currentDate: next,
          currentMoment: simulationMomentOnLocalDate(
            together.currentMoment,
            next,
          ),
        },
        date,
        game.playerPersonId,
      ),
    );
    const keys = later.history.statutoryTaxLiabilities!.map(
      (row) => row.stableKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("Columbus: everyone with a town job is paid by the employer, and payroll taxes are assessed", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "town-pay-columbus",
        placeKey: "3918000",
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const player = game.playerPersonId;
    let world: World = game.world;
    const since = world.currentDate;
    const unpaid = world;
    world = startTownJobPay(world, player, since);
    const flows = world.history.resourceFlows.filter((flow) =>
      flow.stableKey.startsWith("town-pay-v2:job-pay:"),
    );
    const cadence = (on: World, id: EntityId) =>
      resourceFlowTermsAt(on, id)!.cadenceKind;

    // A worker whose pay starts on a later payday gets the employer's payday.
    const byEmployer = new Map<string, typeof flows>();
    for (const flow of flows)
      if (flow.source.kind === "organization")
        byEmployer.set(flow.source.organizationId, [
          ...(byEmployer.get(flow.source.organizationId) ?? []),
          flow,
        ]);
    for (const group of [...byEmployer.values()].filter((g) => g.length > 1)) {
      const late = group[0]!;
      expect(late.recipient.kind).toBe("person");
      if (late.recipient.kind !== "person")
        throw new Error("Expected the actual wage recipient.");
      const lateId = late.recipient.personId;
      const later = startTownJobPay(
        startTownJobPay(unpaid, lateId, since),
        player,
        since,
      );
      const lateFlow = later.history.resourceFlows.find(
        (flow) => flow.stableKey === late.stableKey,
      )!;
      expect(cadence(later, lateFlow.id)).toBe(cadence(world, group[1]!.id));
    }

    // A worker who dies is not paid for any period after the death.
    const dies = flows[1]!;
    expect(dies.recipient.kind).toBe("person");
    if (dies.recipient.kind !== "person")
      throw new Error("Expected the actual wage recipient.");
    const diesId = dies.recipient.personId;
    world = recordPersonDeath(world, {
      stableKey: "town-pay-test:death",
      personId: diesId,
      diedAt: since,
      causeKey: "cause:town-pay-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Town pay fixture." },
    });
    expect(flows.length).toBeGreaterThan(20);
    for (const flow of flows) {
      expect(flow.recipient).not.toEqual({ kind: "person", personId: player });
      expect(flow.source.kind).toBe("organization");
    }

    // A worker who leaves before a payday is not paid for that period.
    const leaver = flows[0]!;
    expect(leaver.basisReference.kind).toBe("work");
    if (leaver.basisReference.kind !== "work")
      throw new Error("Expected the actual wage work relationship.");
    const leaverWork = leaver.basisReference.workRelationshipId;
    world = recordWorkStatus(world, {
      stableKey: "test:leaves",
      workRelationshipId: leaverWork,
      effectiveAt: since,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.quit,
      supersedesStatusId: workStatusAt(world, leaverWork)!.id,
      provenance: { kind: "authored", note: "Test: leaves on the first day." },
    });

    withWorldIntegrityDeferred(() => {
      const date = addDays(since, 62);
      world = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      world = payTownPaydays(world, since, player);
    });

    const paychecks = world.history.resourceTransferOutcomes.filter((outcome) =>
      flows.some((flow) => flow.id === outcome.resourceFlowId),
    );
    // Two months holds at least 2 paychecks for anyone paid monthly.
    const paid = new Set(paychecks.map((outcome) => outcome.resourceFlowId));
    expect(paid.size).toBe(flows.length - 2);
    expect(paid.has(leaver.id)).toBe(false);
    expect(paid.has(dies.id)).toBe(false);
    for (const outcome of paychecks) {
      const flow = flows.find((row) => row.id === outcome.resourceFlowId)!;
      const terms = resourceFlowTermsAt(world, flow.id)!;
      expect(outcome.transferredAmount).toEqual(terms.amount);
      // Paid on a payday for a whole period that ended that day.
      expect(outcome.periodEndsAt).toBe(outcome.occurredAt);
      // Social Security and Medicare are assessed on every paycheck.
      expect(
        (world.history.statutoryTaxLiabilities ?? []).filter(
          (row) => row.sourceOutcomeId === outcome.id,
        ).length,
      ).toBeGreaterThan(0);
    }
    // Governments pay every two weeks.
    for (const flow of flows) {
      if (flow.source.kind !== "organization") continue;
      const classification =
        organizationProfileAt(world, flow.source.organizationId)
          ?.classification ?? "";
      if (/^sector:|^service:(fire|police|school)$/.test(classification))
        expect(resourceFlowTermsAt(world, flow.id)!.cadenceKind).toMatch(
          /^schedule:town-biweekly-\d$/,
        );
    }
    // Paying the same days again writes nothing.
    expect(payTownPaydays(world, since, player)).toBe(world);
  });
});
