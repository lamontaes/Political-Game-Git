import { expect, it } from "vitest";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import { endSuppliedSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  fileTransitAppropriation,
  projectTransitWork,
  requestTransitFromOffice,
  cancelTransitImplementation,
  publishTransitReport,
} from "./transit-work";
import { prepareRecordedLegislativeSitting } from "./legislative-authored-sitting";
import {
  applyLegislativeCommand,
  resolveLegislativeAssignmentForMeasure,
  recordedInstitutionalStepRequiresWait,
} from "./legislation-world";
import { passOrdinaryDays } from "./ordinary-life";
import { addDays } from "../simulation/dates";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { assertWorldIntegrity } from "../simulation/world";
import type { World, EntityId } from "../simulation/types";
import type { MeasureStepKey } from "../simulation/legislation";

// Supplied recorded-seat boundary only. Filing and enacted appropriation are
// produced by their ordinary adapters. No public balance or tax law is supplied.
function enacted(chamber: "house" | "senate") {
  const seat = suppliedLegislativeSeat("US-AK", chamber);
  const input = {
    personId: seat.personId,
    amountMinorUnits: chamber === "house" ? 40_010 : 60_025,
    serviceWindow:
      chamber === "house" ? ("weekday" as const) : ("weekend" as const),
  };
  const filed = fileTransitAppropriation(seat.world, input);
  const measureId = filed.bill.measureId;
  let world = prepareRecordedLegislativeSitting(filed.world, {
    measureId,
    playerPersonId: seat.personId,
    playerBallot: "yea",
  });
  function step(action: MeasureStepKey) {
    const assignment = resolveLegislativeAssignmentForMeasure(world, {
      measureId,
      playerPersonId: seat.personId,
    });
    if (assignment.kind !== "available") throw new Error(assignment.reason);
    world = applyLegislativeCommand(world, assignment.assignment, {
      kind: recordedInstitutionalStepRequiresWait(
        world,
        assignment.assignment,
        action,
      )
        ? "await-institutional-record"
        : "take-step",
      step: action,
    }).world;
  }
  for (const other of [false, true]) {
    for (const action of [
      "request-referral",
      "request-committee-hearing",
      "move-committee-report",
      "request-calendar-placement",
      "move-floor-vote",
    ] as const)
      step(action);
    if (!other) step("transmit-to-second-chamber");
  }
  for (const action of [
    "request-enrollment",
    "present-to-executive",
    "await-executive-decision",
    "move-veto-override",
    "record-enactment",
  ] as const)
    step(action);
  return { world, personId: seat.personId, measureId, input };
}
function funding(world: World, personId: EntityId) {
  return projectTransitWork(world, personId).bills[0]!.funding;
}
it.each(["house", "senate"] as const)(
  "ordinary %s transit filing consumes S's recorded sitting and refuses unfunded delivery across reopen",
  (chamber) => {
    const life = enacted(chamber);
    expect(funding(life.world, life.personId).kind).toBe("unavailable");
    expect(() => requestTransitFromOffice(life.world, life)).toThrow(
      /takes effect/,
    );
    const ready = passOrdinaryDays(life.world, 90);
    expect(ready.currentDate).toBe(addDays(life.world.currentDate, 90));
    const mandate = funding(ready, life.personId);
    const beforeInspection = serializeWorld(ready);
    expect(
      projectTransitWork(ready, life.personId).bills[0]!.cashSnapshot.kind,
    ).toBe("account-missing");
    expect(serializeWorld(ready)).toBe(beforeInspection);
    expect(mandate.kind).toBe("available");
    if (mandate.kind === "available") {
      expect(mandate.mandate.amount.minorUnits).toBe(
        life.input.amountMinorUnits,
      );
      expect(mandate.mandate.serviceWindow).toBe(life.input.serviceWindow);
      expect(
        ready.jurisdictions[mandate.mandate.jurisdictionId]!.name,
      ).toContain("Alaska");
    }
    const requested = requestTransitFromOffice(ready, life);
    const baselinePayments = requested.history.resourceTransferOutcomes;
    const stopped = passOrdinaryDays(
      deserializeWorld(serializeWorld(requested)),
      14,
    );
    expect(
      projectTransitWork(stopped, life.personId).bills[0]!.periods.map(
        (p) => p.state.status,
      ),
    ).toEqual(["blocked", "scheduled"]);
    expect(stopped.history.effectActivations).toHaveLength(0);
    expect(stopped.history.resourceTransferOutcomes).toEqual(baselinePayments);
    let cancelled = cancelTransitImplementation(stopped, life);
    const report = projectTransitWork(cancelled, life.personId).reports[0]!
      .event;
    cancelled = publishTransitReport(cancelled, {
      personId: life.personId,
      eventId: report.id,
    });
    const publishedOnce = serializeWorld(cancelled);
    expect(() =>
      publishTransitReport(cancelled, {
        personId: life.personId,
        eventId: report.id,
      }),
    ).toThrow(/already has a report/);
    expect(serializeWorld(cancelled)).toBe(publishedOnce);
    const reopened = passOrdinaryDays(
      deserializeWorld(serializeWorld(cancelled)),
      30,
    );
    expect(
      projectTransitWork(reopened, life.personId).bills[0]!.periods.map(
        (p) => p.state.status,
      ),
    ).toEqual(["blocked", "cancelled"]);
    expect(reopened.history.effectActivations).toHaveLength(0);
    expect(reopened.history.resourceTransferOutcomes).toEqual(baselinePayments);
    expect(
      projectTransitWork(reopened, life.personId).reports.find(
        (r) => r.event.id === report.id,
      )!.published,
    ).toBe(true);
    assertWorldIntegrity(reopened);
  },
);
it("uses each life's actual seat and refuses unsupported or ended office without mutation", () => {
  const house = enacted("house"),
    senate = enacted("senate");
  expect(house.world.id).not.toBe(senate.world.id);
  expect(house.personId).not.toBe(senate.personId);
  expect(projectTransitWork(house.world, house.personId).bills).toHaveLength(1);
  expect(projectTransitWork(senate.world, senate.personId).bills).toHaveLength(
    1,
  );
  for (const world of [
    suppliedLegislativeSeat("US-NE", "legislature").world,
    endSuppliedSeat(house.world),
  ]) {
    const personId =
      world.control.kind === "person" ? world.control.personId : house.personId;
    const before = serializeWorld(world);
    const view = projectTransitWork(world, personId);
    expect(view.office.kind).toBe("unavailable");
    for (const bill of view.bills) {
      expect(bill.cashSnapshot.kind).toBe("authority-unavailable");
      expect(bill.cashSnapshot).not.toHaveProperty("recordedLiquidBalance");
    }
    expect(() =>
      fileTransitAppropriation(world, {
        personId,
        amountMinorUnits: 20_000,
        serviceWindow: "weekday",
      }),
    ).toThrow();
    expect(serializeWorld(world)).toBe(before);
  }
}, 30_000);
