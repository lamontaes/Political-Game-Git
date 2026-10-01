import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { annualPovertyLineMinor } from "./crisis/health-coverage";
import { addDays, makeIsoDate } from "./dates";
import {
  ensureHouseholdPovertySchedule,
  recordHouseholdPoverty,
  HOUSEHOLD_POVERTY_TRANSITION_KEY,
  personPovertyStatusAt,
  recordedPovertyShare,
} from "./household-poverty";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { OUTCOME_MEASURES } from "./outcome-web";
import { SeededRng } from "./rng";
import { assertWorldIntegrityFully, deserializeWorld, serializeWorld } from ".";
import {
  createHousehold,
  createOrganization,
  createWorkRelationship,
  startHouseholdMembership,
} from "./life";
import {
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "./resources";
import type { EntityId, World } from "./types";

/**
 * Slice 1, "Your money": each household's month measured against the federal
 * poverty guideline, from what its members were actually paid.
 */

const DOLLARS = (cents: number) => cents / 100;

describe("the HHS 2026 poverty guideline (91 FR 1797)", () => {
  // The three published tables, sizes 1 to 8, read from the notice.
  const TABLES: Readonly<Record<string, readonly number[]>> = {
    "US-OH": [15960, 21640, 27320, 33000, 38680, 44360, 50040, 55720],
    "US-AK": [19950, 27050, 34150, 41250, 48350, 55450, 62550, 69650],
    "US-HI": [18360, 24890, 31420, 37950, 44480, 51010, 57540, 64070],
  };

  it("matches every published figure for the 48 states and D.C., Alaska and Hawaii", () => {
    for (const [stateKey, amounts] of Object.entries(TABLES))
      amounts.forEach((amount, index) =>
        expect(
          DOLLARS(
            annualPovertyLineMinor(
              stateKey,
              index + 1,
              makeIsoDate("2026-06-01"),
            ),
          ),
          `${stateKey}, ${index + 1} people`,
        ).toBe(amount),
      );
    // Past eight, each added person adds the published increment.
    expect(
      DOLLARS(annualPovertyLineMinor("US-HI", 9, makeIsoDate("2026-06-01"))),
    ).toBe(64070 + 6530);
    expect(
      DOLLARS(annualPovertyLineMinor("US-AK", 9, makeIsoDate("2026-06-01"))),
    ).toBe(69650 + 7100);
  });

  it("applies one rule to every place: the territories read the 48-state table", () => {
    for (const { jurisdictionKey } of lifePlaceStateIdentities()) {
      const line = annualPovertyLineMinor(
        jurisdictionKey,
        3,
        makeIsoDate("2026-06-01"),
      );
      const name = stateJurisdictionForKey(jurisdictionKey)?.name;
      const expected =
        name === "Alaska" ? 34150 : name === "Hawaii" ? 31420 : 27320;
      expect(DOLLARS(line), jurisdictionKey).toBe(expected);
    }
  });

  it("takes effect on January 13, 2026; the 2025 guideline holds before it", () => {
    expect(
      DOLLARS(annualPovertyLineMinor("US-OH", 1, makeIsoDate("2026-01-12"))),
    ).toBe(15650);
    expect(
      DOLLARS(annualPovertyLineMinor("US-OH", 1, makeIsoDate("2026-01-13"))),
    ).toBe(15960);
  });
});

/**
 * A small world in a state drawn by a named seed from all 56, played on the real
 * clock across two month boundaries: recorded compensation pays workers, and each first of
 * the month saves every household's status for the month before.
 */
const DRAW_SEED = "slice1:household-poverty:1";

describe("each household's month, saved on the clock", () => {
  const states = lifePlaceStateIdentities();
  const state = states[new SeededRng(DRAW_SEED).integer(0, states.length)]!;
  const label = `${state.name} (seed ${DRAW_SEED})`;
  const fixture = smallWorld({
    place: state.usps,
    seed: DRAW_SEED,
  });
  const personId = fixture.personId;
  const provenance = {
    kind: "authored",
    note: "Small-world poverty fixture: recorded employment and actual compensation.",
  } as const;
  let initial = fixture.world;
  initial = createOrganization(initial, {
    stableKey: "poverty:employer",
    formedAt: initial.currentDate,
    provenance,
    initialProfile: {
      name: "Fixture employer",
      classification: "custom:fixture-employer",
      locationJurisdictionId: fixture.jurisdictionId,
    },
  });
  const employer = initial.history.organizations.at(-1)!.id;
  const jobs: EntityId[] = [];
  for (const [index, id] of initial.personOrder.entries()) {
    initial = createHousehold(initial, {
      stableKey: `poverty:household:${index}`,
      formedAt: initial.currentDate,
      label: `Fixture household ${index + 1}`,
      provenance,
    });
    initial = startHouseholdMembership(initial, {
      stableKey: `poverty:member:${index}`,
      personId: id,
      householdId: initial.history.households.at(-1)!.id,
      startedAt: initial.currentDate,
      residenceRole: "primary",
      kind: "resident:household-member",
      provenance,
    });
    if (index === 3) continue;
    initial = createWorkRelationship(initial, {
      stableKey: `poverty:job:${index}`,
      personId: id,
      organizationId: employer,
      startedAt: initial.currentDate,
      kind: "employment:fixture",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Fixture worker",
        occupationClassification: "custom:fixture-worker",
        locationJurisdictionId: fixture.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: fixture.jurisdictionId,
        },
      },
    });
    const job = initial.history.workRelationships.at(-1)!;
    initial = createWorkCompensation(initial, {
      stableKey: `poverty:pay:${index}`,
      workRelationshipId: job.id,
      startsAt: initial.currentDate,
      amount: money(index === 0 ? 100_000 : 500_000, "USD"),
      cadenceKind: "custom:four-week",
      restrictionKind: null,
      jurisdictionId: fixture.jurisdictionId,
      provenance,
    });
    if (index < 2) jobs.push(job.id);
  }
  const opened = ensureHouseholdPovertySchedule(initial);
  function settle(at: World, month: string): World {
    let next = at;
    for (const job of jobs)
      next = resolveWorkCompensationPeriod(next, {
        stableKey: `poverty:paid:${job}:${month}`,
        workRelationshipId: job,
        periodStartsAt:
          month === opened.currentDate.slice(0, 7)
            ? opened.currentDate
            : `${month}-01`,
        periodEndsAt: `${month}-28`,
        occurredAt: next.currentDate,
        status: "completed",
        reasonKind: null,
        note: "Fixture compensation paid through the canonical writer.",
        provenance,
      });
    return next;
  }
  // Actual compensation writers settle two pay periods. The production clock
  // then reaches each month's due item through its composed handlers.
  const firstMonth = opened.currentDate.slice(0, 7);
  const firstPayDate = makeIsoDate(`${firstMonth}-28`);
  const daysToFirstPay =
    (Date.parse(firstPayDate) - Date.parse(opened.currentDate)) / 86_400_000;
  const firstPaid = settle(
    passOrdinaryDays(opened, daysToFirstPay),
    firstMonth,
  );
  const nextMonthStart =
    addDays(makeIsoDate(`${firstMonth}-01`), 32).slice(0, 7) + "-01";
  const daysToNextMonth =
    (Date.parse(nextMonthStart) - Date.parse(firstPayDate)) / 86_400_000;
  const secondOpening = passOrdinaryDays(firstPaid, daysToNextMonth);
  const secondMonth = secondOpening.currentDate.slice(0, 7);
  const secondPaid = settle(passOrdinaryDays(secondOpening, 27), secondMonth);
  const secondPass = makeIsoDate(
    addDays(makeIsoDate(`${secondMonth}-01`), 32).slice(0, 7) + "-02",
  );
  const world = passOrdinaryDays(
    secondPaid,
    (Date.parse(secondPass) - Date.parse(secondPaid.currentDate)) / 86_400_000,
  );
  const rows = world.history.householdPoverty ?? [];
  const months = [...new Set(rows.map((row) => row.month))].sort();

  it(`schedules itself at the opening and records two months (${label})`, () => {
    expect(
      opened.history.futureDueItems.some(
        (item) => item.transitionKey === HOUSEHOLD_POVERTY_TRANSITION_KEY,
      ),
    ).toBe(true);
    expect(months).toHaveLength(2);
    expect(months[0]).toBe(opened.currentDate.slice(0, 7));
    // Every household with living members has a row in each month, once.
    for (const month of months) {
      const ids = rows
        .filter((row) => row.month === month)
        .map((row) => row.householdId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  it(`reads recorded pay: statuses follow the paychecks, unknown is never zero (${label})`, () => {
    const second = rows.filter((row) => row.month === months[1]);
    const known = second.filter((row) => row.status !== "pay-unrecorded");
    // Two households have completed payments; one has no employment.
    expect(known).toHaveLength(3);
    expect(second.map((row) => row.status)).toEqual([
      "below",
      "at-or-above",
      "pay-unrecorded",
      "below",
    ]);
    expect(second[0]!.monthlyPayMinor).toBe(
      Math.round((100_000 * (365.25 / 12)) / 28),
    );
    expect(second[1]!.monthlyPayMinor).toBe(
      Math.round((500_000 * (365.25 / 12)) / 28),
    );
    expect(second.some((row) => (row.monthlyPayMinor ?? 0) > 0)).toBe(true);
    for (const row of rows) {
      if (row.status === "pay-unrecorded")
        expect(row.monthlyPayMinor).toBeNull();
      else
        expect(row.status).toBe(
          row.monthlyPayMinor! < row.monthlyGuidelineMinor
            ? "below"
            : "at-or-above",
        );
      // The guideline is the published one for this size and state, a month's share.
      expect(row.monthlyGuidelineMinor).toBe(
        Math.round(
          annualPovertyLineMinor(
            row.stateKey,
            row.memberIds.length,
            addDays(makeIsoDate(`${row.month}-01`), 27),
          ) / 12,
        ),
      );
    }
  });

  it(`is readable by the outcome web and the opinion code (${label})`, () => {
    const measure = OUTCOME_MEASURES["household.recorded-poverty-share"];
    expect(measure).toBeDefined();
    const stateId = stateJurisdictionForKey(state.jurisdictionKey)!.id;
    const share = measure!.read(world, stateId, world.currentDate);
    expect(share).not.toBeNull();
    expect(share).toBeGreaterThanOrEqual(0);
    expect(share).toBeLessThanOrEqual(1);
    expect(share).toBe(recordedPovertyShare(world, stateId, world.currentDate));
    // Before the first month is saved, unknown, never zero.
    expect(measure!.read(opened, stateId, opened.currentDate)).toBeNull();
    expect(personPovertyStatusAt(world, personId)).toMatch(
      /^(below|at-or-above|pay-unrecorded)$/,
    );
  });

  it(`survives integrity and a save and reload unchanged (${label})`, () => {
    expect(() => assertWorldIntegrityFully(world)).not.toThrow();
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(reloaded.history.householdPoverty).toEqual(rows);
    expect(
      recordHouseholdPoverty(
        reloaded,
        addDays(makeIsoDate(`${months[1]}-01`), 27),
      ),
    ).toBe(reloaded);
    expect(ensureHouseholdPovertySchedule(reloaded)).toBe(reloaded);
  });
});
