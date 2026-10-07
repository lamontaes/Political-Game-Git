import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";
import { stateJurisdictionForKey } from "./life-places";
import { workRoleAt } from "./life-queries";
import { recordWorkRole } from "./life";
import { periodsPerYear } from "./law-effects-noticed";
import { resourceFlowTermsAt } from "./resource-queries";
import { recordResourceFlowTerms } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { recordedTeacherSalaryMedian } from "./teacher-salary-floor";
import type { EntityId, World } from "./types";

const seed = `teacher-recorded-hours:${randomUUID()}`;
const place = observerPlace(seed);
const stateId = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
let world: World;
let flowIds: EntityId[];

beforeAll(() => {
  world = advanceObservedWorld(openObserverWorld(observerSetup(seed)).world, 7);
  const salary = recordedTeacherSalaryMedian(world, stateId);
  expect(salary).not.toBeNull();
  flowIds = world.history.resourceFlows
    .filter((flow) => salary!.sourceRecordIds.includes(flow.id))
    .map((flow) => flow.id);
  expect(flowIds.length).toBeGreaterThan(1);
}, 180_000);

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]!
    : Math.round((ordered[middle - 1]! + ordered[middle]!) / 2);
}

function recordedAnnualAmounts(saved: World) {
  return flowIds.map((flowId) => {
    const terms = resourceFlowTermsAt(saved, flowId)!;
    return Math.round(
      terms.amount.minorUnits * periodsPerYear(terms.cadenceKind)!,
    );
  });
}

it("reads actual annual teacher agreements in an ordinary random opening and after reload", () => {
  const salary = recordedTeacherSalaryMedian(world, stateId)!;
  const annual = recordedAnnualAmounts(world);
  expect(salary.minor).toBe(median(annual));
  const reloaded = deserializeWorld(serializeWorld(world));
  expect(recordedTeacherSalaryMedian(reloaded, stateId)).toEqual(salary);
  const records = flowIds.map((flowId) => {
    const flow = world.history.resourceFlows.find((row) => row.id === flowId)!;
    if (flow.basisReference.kind !== "work")
      throw new Error("Expected saved teacher work.");
    const role = workRoleAt(world, flow.basisReference.workRelationshipId)!;
    const terms = resourceFlowTermsAt(world, flowId)!;
    return {
      flowId,
      roleId: role.id,
      termsId: terms.id,
      hours: role.timeDemand.expectedWeekly,
      cadence: terms.cadenceKind,
      periodMinor: terms.amount.minorUnits,
    };
  });
  const receipt = {
    seed,
    place: place.displayName,
    placeKey: place.key,
    date: world.currentDate,
    teacherCount: salary.teacherCount,
    annualMinor: annual,
    medianMinor: salary.minor,
    reloadMedianMinor: recordedTeacherSalaryMedian(reloaded, stateId)!.minor,
    records,
    priorFixedHoursMedianMinor: median(
      records.map((row) =>
        Math.round(
          (row.periodMinor * periodsPerYear(row.cadence)! * 40) /
            ((row.hours.minimumHours + row.hours.maximumHours) / 2),
        ),
      ),
    ),
  };
  writeFileSync(
    "/tmp/teacher-recorded-hours-opening.json",
    JSON.stringify(receipt, null, 2),
  );
  console.info("TEACHER_RECORDED_HOURS_OPENING", JSON.stringify(receipt));
});

function varySavedRoles(varyPay: boolean) {
  let next = world;
  flowIds.forEach((flowId, index) => {
    const flow = next.history.resourceFlows.find((row) => row.id === flowId)!;
    if (flow.basisReference.kind !== "work")
      throw new Error("Expected saved teacher work.");
    const role = workRoleAt(next, flow.basisReference.workRelationshipId)!;
    const fraction = index < Math.ceil(flowIds.length / 2) ? 0.5 : 2;
    // Controlled saved-record regression only; ordinary-opening proof above is untouched.
    next = recordWorkRole(next, {
      ...role,
      stableKey: `teacher-hours-control:${varyPay}:${role.id}`,
      effectiveAt: next.currentDate,
      timeDemand: {
        ...role.timeDemand,
        expectedWeekly: {
          minimumHours: Math.round(
            role.timeDemand.expectedWeekly.minimumHours * fraction,
          ),
          maximumHours: Math.round(
            role.timeDemand.expectedWeekly.maximumHours * fraction,
          ),
        },
      },
      supersedesRoleId: role.id,
      provenance: {
        kind: "authored",
        note: "Controlled variation of an existing saved teacher role for annual-pay regression.",
      },
    });
    if (varyPay) {
      const terms = resourceFlowTermsAt(next, flowId)!;
      next = recordResourceFlowTerms(next, {
        ...terms,
        stableKey: `teacher-pay-control:${terms.id}`,
        effectiveAt: next.currentDate,
        amount: {
          ...terms.amount,
          minorUnits: Math.round(terms.amount.minorUnits * fraction),
        },
        supersedesTermsId: terms.id,
        provenance: {
          kind: "authored",
          note: "Controlled pay variation derived from the saved teacher agreement.",
        },
      });
    }
  });
  return next;
}

it("does not inflate the same saved salary when recorded teacher hours vary", () => {
  const varied = varySavedRoles(false);
  expect(recordedTeacherSalaryMedian(varied, stateId)!.minor).toBe(
    median(recordedAnnualAmounts(world)),
  );
  expect(
    recordedTeacherSalaryMedian(
      deserializeWorld(serializeWorld(varied)),
      stateId,
    ),
  ).toEqual(recordedTeacherSalaryMedian(varied, stateId));
});

it("preserves varied recorded hours and pay instead of converting them to a fixed full-time salary", () => {
  const varied = varySavedRoles(true);
  const annual = recordedAnnualAmounts(varied);
  expect(new Set(annual).size).toBeGreaterThan(1);
  const salary = recordedTeacherSalaryMedian(varied, stateId)!;
  expect(salary.minor).toBe(median(annual));
  expect(salary.minor).not.toBe(
    recordedTeacherSalaryMedian(world, stateId)!.minor,
  );
  expect(
    recordedTeacherSalaryMedian(
      deserializeWorld(serializeWorld(varied)),
      stateId,
    ),
  ).toEqual(salary);
});

it("uses the existing cadence reader for every town pay period and phase", () => {
  for (const [cadence, periods] of Object.entries({
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
  })) {
    expect(periodsPerYear(`schedule:town-${cadence}`)).toBe(periods);
    expect(periodsPerYear(`schedule:town-${cadence}-1`)).toBe(periods);
  }
});
