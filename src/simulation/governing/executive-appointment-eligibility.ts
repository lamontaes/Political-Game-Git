import { citizenByBirthSince } from "../candidacy";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../life-queries";
import type { EntityId, World } from "../types";
import { publicPartyOf } from "./chamber-votes";
import { executiveAppointmentPost } from "./executive-appointment-posts";
import {
  latestExecutiveAppointmentSeat,
  appointmentTag,
} from "./executive-appointments";

/** Authority eligibility is private. This result does not give the executive
 * knowledge of the candidate's citizenship or employment records. */
export function executiveAppointmentEligibility(
  world: World,
  postOfficeKey: string,
  candidatePersonId: EntityId,
  jurisdictionId: EntityId,
): "meets" | "fails" | "unverified" {
  const post = executiveAppointmentPost(postOfficeKey);
  const person = world.people[candidatePersonId];
  if (!post || !person) return "unverified";
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === person.id && death.diedAt <= world.currentDate,
    )
  )
    return "fails";
  if (post.citizenshipRequired) {
    // Session 13 owns the current-status reader (#2455). Until admitted, retain
    // its documented positive-birth legacy fallback only for people with no
    // canonical status field. Never override a recorded loss or noncitizenship.
    if (
      "citizenshipStatuses" in person ||
      citizenByBirthSince(world, person.id) === null
    )
      return "unverified";
  }
  if (post.stateEmploymentBarred) {
    for (const work of activeWorkRelationshipsAt(world, person.id)) {
      if (!work.relationship.organizationId) return "unverified";
      const identity = organizationProfileAt(
        world,
        work.relationship.organizationId,
      )?.publicGovernmentIdentity;
      if (
        identity?.kind === "jurisdiction" &&
        identity.jurisdictionId === jurisdictionId
      )
        return "fails";
    }
  }
  const party = publicPartyOf(world, person.id);
  let sameParty = 0;
  for (let seat = 1; seat <= post.seats; seat += 1) {
    const term = latestExecutiveAppointmentSeat(world, post.officeKey, seat);
    if (!term || term.type !== "world.office-tenure") continue;
    const end = appointmentTag(term, "term-end:");
    if (end && end <= world.currentDate) continue;
    const holder = term.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    if (
      !holder ||
      world.history.personDeaths.some(
        (death) =>
          death.personId === holder && death.diedAt <= world.currentDate,
      )
    )
      continue;
    if (holder === person.id) return "fails";
    if (party !== null && publicPartyOf(world, holder) === party)
      sameParty += 1;
  }
  if (
    party !== null &&
    post.samePartyLimit !== null &&
    sameParty >= post.samePartyLimit
  )
    return "fails";
  return "meets";
}
