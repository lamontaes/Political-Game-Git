/** Supplied office checkpoint for receiver/UI review, not a won campaign proof. */
import { suppliedLegislativeSeat } from "./supplied-legislative-seat";
import { hireOfficeStaff } from "./office-onboarding-world";
import {
  openLegislativeWork,
  applyLegislativeCommand,
} from "../../src/presentation/legislation-world";
import { openLegislativeBargaining } from "../../src/presentation/legislative-bargaining-world";
import { resolveActiveMemberSeat } from "../../src/presentation/legislative-member-seat";

export function suppliedStaffBargainingReview() {
  const supplied = suppliedLegislativeSeat("US-KY", "house");
  const seat = resolveActiveMemberSeat(supplied.world, supplied.personId);
  if (seat.kind !== "seated") throw new Error(seat.reason);
  const staffed = hireOfficeStaff(
    supplied.world,
    supplied.personId,
    seat.seat.organizationId,
  );
  const opened = openLegislativeWork(staffed.world, {
    playerPersonId: supplied.personId,
    scenarioKey: "kentucky",
    jurisdictionId: supplied.jurisdictionId,
  });
  let world = opened.world;
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeCommand(world, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  const bargaining = openLegislativeBargaining(world, {
    playerPersonId: supplied.personId,
  });
  if (bargaining.kind !== "available") throw new Error(bargaining.reason);
  return {
    ...supplied,
    world: bargaining.world,
    seat: seat.seat,
    bargaining,
    measureId: opened.assignment.measureId,
  };
}
