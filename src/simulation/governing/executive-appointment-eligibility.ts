import { citizenByBirthSince } from "../candidacy";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../life-queries";
import type { EntityId, World } from "../types";
import { publicPartyAffiliation } from "../living-world/congress";
import { partyUnit, partyUnitStatusAt } from "../living-world/party-registry";
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
  // This requires positive civilian-life and complete regular commissioned
  // service/grade/relief evidence. Generic work rows and their absence cannot
  // establish that fact. Keep the seam explicit until its canonical producer
  // is supplied; never create a qualification transition here.
  if (post.specialQualification === "defense-civilian-service-history")
    return "unverified";
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
  const party = nationalPartyIdentity(world, person.id);
  let sameParty = 0;
  let unknownParty = 0;
  let incumbents = 0;
  for (let seat = 1; seat <= post.seats; seat += 1) {
    const term = latestExecutiveAppointmentSeat(world, post.officeKey, seat);
    if (!term) {
      // Missing opening evidence cannot establish an empty seat.
      unknownParty += 1;
      incumbents += 1;
      continue;
    }
    if (term.type !== "world.office-tenure") continue;
    const end = appointmentTag(term, "term-end:");
    if (end && end <= world.currentDate) continue;
    const holder = term.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    if (!holder) {
      unknownParty += 1;
      incumbents += 1;
      continue;
    }
    if (
      world.history.personDeaths.some(
        (death) =>
          death.personId === holder && death.diedAt <= world.currentDate,
      )
    )
      continue;
    if (holder === person.id) return "fails";
    incumbents += 1;
    const incumbentParty = nationalPartyIdentity(world, holder);
    if (incumbentParty === null) unknownParty += 1;
    else if (party !== null && incumbentParty === party) sameParty += 1;
  }
  if (
    party !== null &&
    post.samePartyLimit !== null &&
    sameParty >= post.samePartyLimit
  )
    return "fails";
  if (
    post.samePartyLimit !== null &&
    (party === null ? incumbents : sameParty + unknownParty) >=
      post.samePartyLimit
  )
    return "unverified";
  return "meets";
}

/** Resolve existing public affiliation to the actual party's root unit.
 * A chapter is not a separate party, and missing identity is not unaffiliated. */
function nationalPartyIdentity(
  world: World,
  personId: EntityId,
): EntityId | null {
  let organizationId = publicPartyAffiliation(world, personId);
  const seen = new Set<EntityId>();
  while (organizationId) {
    if (seen.has(organizationId)) return null;
    seen.add(organizationId);
    const unit = partyUnit(world, organizationId);
    if (!unit || partyUnitStatusAt(world, organizationId).kind !== "active")
      return null;
    if (unit.parentOrganizationId) {
      organizationId = unit.parentOrganizationId;
      continue;
    }
    return unit.level === "national" ? unit.organizationId : null;
  }
  return null;
}
