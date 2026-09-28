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
import { workStatusAt } from "../../src/simulation/life-queries";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { World } from "../../src/simulation";

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

  it("uses the town's own metro area before its state", () => {
    const columbus = lifePlaceByKey("3918000")!.context.jurisdiction.id;
    expect(townJobRate("profession:teacher", columbus, 50)!.area).toBe("18140");
    const sanJuan = lifePlaceByKey("7276770")!.context.jurisdiction.id;
    expect(townJobRate("occupation:cashier", sanJuan, 50)!.area).toBe("S72");
  });

  it("places a worker higher in the range the longer they have held the job", () => {
    expect(townPayPercentile(0, 0.5)).toBe(25);
    expect(townPayPercentile(10, 0.5)).toBe(50);
    expect(townPayPercentile(40, 0.5)).toBe(75);
    expect(townPayPercentile(0, 0)).toBe(10);
    expect(townPayPercentile(40, 1)).toBe(90);
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
    world = startTownJobPay(world, player, since);
    const flows = world.history.resourceFlows.filter((flow) =>
      flow.stableKey.startsWith("town-pay-v2:job-pay:"),
    );
    expect(flows.length).toBeGreaterThan(20);
    for (const flow of flows) {
      expect(flow.recipient).not.toEqual({ kind: "person", personId: player });
      expect(flow.source.kind).toBe("organization");
    }

    // A worker who leaves before a payday is not paid for that period.
    const leaver = flows[0]!;
    const leaverWork =
      leaver.basisReference.kind === "work"
        ? leaver.basisReference.workRelationshipId
        : "";
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
    expect(paid.size).toBe(flows.length - 1);
    expect(paid.has(leaver.id)).toBe(false);
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
