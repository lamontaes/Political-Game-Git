import { afterEach, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../dates";
import { cancelFutureDueItem } from "../future-transitions";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "../law-consequence-registry";
import { TOWN_EMPLOYMENT_VERSION } from "../living-world/town-employment";
import { settleTownCompensations } from "../living-world/town-pay";
import { workRoleAt } from "../life-queries";
import { personName } from "../people";
import { recordedPayStubs } from "../resource-income";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { withWorldIntegrityDeferred } from "../world";
import * as lawEffects from "../enacted-law-effects";
import { PAY_REGISTRATION, resolvePayConsequences } from "./pay";
import {
  MINIMUM_WAGE_PAY_ROWS,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./pay-rows";

const registrations = [...LAW_CONSEQUENCE_REGISTRATIONS, PAY_REGISTRATION];
const dispatch = lawEffects.applyLawConsequences;
afterEach(() => vi.restoreAllMocks());

it("pays Alaska's actual dated starting floors and retains the earlier floor for catch-up work", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "0203000",
      seed: "pay-starting-phases:alaska",
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  let world = game.world;
  expect(world.currentDate.slice(0, 7)).toBe("2026-01");
  const work = world.history.workRelationships.find(
    (row) =>
      row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
      row.compensation === "paid" &&
      row.organizationId,
  )!;
  expect(work).toBeDefined();
  const role = workRoleAt(world, work.id)!;
  const hours =
    (role.timeDemand.expectedWeekly.minimumHours +
      role.timeDemand.expectedWeekly.maximumHours) /
    2;
  expect(hours).toBeGreaterThan(0);
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  world = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [question.id]: { ...question, consequences: [row] },
      },
    },
  };
  world = createWorkCompensation(world, {
    stableKey: `fixture:starting-phase:${work.id}`,
    workRelationshipId: work.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "Explicit below-floor contract control; legal values are the sourced canonical Alaska rows.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  const employer = {
    kind: "organization" as const,
    organizationId: work.organizationId!,
  };
  if (!resourcePositionAt(world, employer, money(0, "USD").currency))
    world = createResourcePosition(world, {
      stableKey: `fixture:starting-phase-cash:${work.id}`,
      owner: employer,
      openedAt: world.currentDate,
      openingBalance: money(10_000_000, "USD"),
      provenance: {
        kind: "authored",
        note: "Explicit cash control, not generated employer wealth.",
      },
    });
  vi.spyOn(lawEffects, "applyLawConsequences").mockImplementation(
    (next, context) => dispatch(next, context, registrations),
  );
  const first = world.currentDate;
  const phaseStartsAt = makeIsoDate("2026-07-01");
  const firstNewWeek = addDays(
    first,
    Math.ceil(daysBetween(first, phaseStartsAt) / 7) * 7,
  );
  // Controlled payroll boundaries isolate legal phase selection. This does not
  // simulate the skipped life/calendar activity or claim an ordinary-clock run.
  const cases = [
    { startsAt: first, hourly: 1300 },
    { startsAt: addDays(firstNewWeek, -7), hourly: 1300 },
    { startsAt: firstNewWeek, hourly: 1400 },
  ];
  const gross: number[] = [];
  for (const { startsAt, hourly } of cases) {
    const periodEndsAt = addDays(startsAt, 6);
    const payday = addDays(startsAt, 7);
    world = withWorldIntegrityDeferred(() => {
      let next = world;
      for (const due of world.history.futureDueItems) {
        const state = world.history.futureDueItemStates
          .filter((entry) => entry.dueItemId === due.id)
          .at(-1);
        if (state?.status === "scheduled" && due.dueAt < payday)
          next = cancelFutureDueItem(next, {
            stableKey: `fixture:starting-phase-clock:${due.id}`,
            dueItemId: due.id,
            effectiveAt: world.currentDate,
            reasonKey: "fixture:focused-payroll",
            context:
              "Explicit payroll-date control; ordinary clock not claimed.",
          });
      }
      return {
        ...next,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(next.currentMoment, payday),
      };
    });
    const resolved = resolvePayConsequences(world, row, {
      onDate: startsAt,
      activity: "payroll",
      activityId: flow.id,
      subjectIds: [work.personId],
    })[0]!;
    expect(resolved.law.origin).toBe("in-force-at-start");
    expect(resolved.value).toMatchObject({ value: hourly, unit: "minor/hour" });
    expect(resolved.sourceRecordIds).toContain(resolved.law.measureId);
    const period = {
      stableKey: `fixture:starting-phase-period:${flow.id}:${startsAt}`,
      payFlowId: flow.id,
      activityId: flow.id,
      periodStartsAt: startsAt,
      periodEndsAt,
      onDate: payday,
    };
    const before = world;
    world = settleTownCompensations(before, [period]);
    const stub = recordedPayStubs(world, work.personId).find(
      (entry) => entry.paycheck.stableKey === period.stableKey,
    )!;
    expect(stub.paidGross).toEqual(money(Math.round(hourly * hours), "USD"));
    expect(
      stub.paycheck.lawEffectStamps!.some(
        (stamp) => stamp.governingLawKey === resolved.law.measureId,
      ),
    ).toBe(true);
    expect(stub.assessmentStatus).toBe("recorded");
    expect(settleTownCompensations(world, [period])).toBe(world);
    expect(
      serializeWorld(
        settleTownCompensations(deserializeWorld(serializeWorld(before)), [
          period,
        ]),
      ),
    ).toBe(serializeWorld(world));
    gross.push(stub.paidGross.minorUnits);
  }
  expect(gross[0]).toBe(gross[1]);
  expect(gross[2]).toBeGreaterThan(gross[1]!);
  expect(
    world.history.resourceTransferOutcomes.filter(
      (entry) => entry.resourceFlowId === flow.id,
    ),
  ).toHaveLength(3);
  console.info(
    JSON.stringify({
      name: personName(world.people[work.personId]!),
      placeKey: "0203000",
      seed: world.seed,
      hourlyMinor: cases.map((entry) => entry.hourly),
      grossMinor: gross,
    }),
  );
});
