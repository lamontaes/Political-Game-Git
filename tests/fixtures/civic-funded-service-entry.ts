import { districtIdentityCatalog } from "../../src/districts/catalog";
import { districtMembershipFromCanonicalHome } from "../../src/districts/query";
import {
  candidacyPackForJurisdiction,
  campaignForCandidate,
  compareSimulationMoments,
  electionContestResult,
  searchLifePlaces,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import { makeIsoDate } from "../../src/simulation/dates";
import { scheduledActivityState } from "../../src/simulation/time-work";
import { playCalendarActivity } from "../../src/presentation/calendar-time-control";
import {
  fileForOffice,
  projectCampaign,
} from "../../src/presentation/campaign-projection";
import {
  adultLifeAt,
  passUntil,
  runToElection,
  suppliedWin,
} from "./state-executive-entry";

export const CIVIC_FUNDED_SERVICE_START = makeIsoDate("2027-02-01");

/** Passes scheduled floor-vote reminders without making a vote choice. */
function passAsMember(world: World, personId: EntityId, date: string): World {
  let next = world;
  for (let step = 0; step < 400 && next.currentDate < date; step += 1) {
    let moved: World;
    try {
      moved = passUntil(next, date);
    } catch (error) {
      const conflictId =
        error instanceof Error
          ? /scheduled-activity_[a-z0-9]+/.exec(error.message)?.[0]
          : undefined;
      const conflict = conflictId
        ? next.history.scheduledActivities.find(
            (item) => item.id === conflictId,
          )
        : undefined;
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}; at ${next.currentDate}, target ${date}; existing activity ${JSON.stringify(
          conflict
            ? {
                id: conflict.id,
                stableKey: conflict.stableKey,
                title: conflict.title,
                start: scheduledActivityState(next, conflict.id).start,
                end: scheduledActivityState(next, conflict.id).end,
                state: scheduledActivityState(next, conflict.id),
              }
            : null,
        )}`,
      );
    }
    if (moved.currentDate !== next.currentDate) {
      next = moved;
      continue;
    }
    const due = moved.history.scheduledActivities.find(
      (activity) =>
        activity.stableKey.includes(":member-vote:") &&
        activity.participantPersonIds.includes(personId) &&
        scheduledActivityState(moved, activity.id).status === "scheduled" &&
        compareSimulationMoments(
          scheduledActivityState(moved, activity.id).start,
          moved.currentMoment,
        ) === 0,
    );
    if (!due) return moved;
    next = playCalendarActivity(moved, personId, due.id).world;
  }
  return next;
}

/**
 * Starts from a normally generated Alaska life, binds the candidate to the
 * recorded home district, files in the Alaska House's own election, and seats
 * the recorded winner on the term's actual start date. Only the election
 * outcome is deterministic test input; no office or member relationship is
 * injected. The caller owns the service journey after this entry point.
 */
export function ordinaryAlaskaHouseMember() {
  const place = searchLifePlaces("", 200, {
    stateJurisdictionKey: "US-AK",
    scope: "locality",
  }).find((candidate) => {
    if (!candidate.sourceGeoid) return false;
    return (
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: candidate.context.jurisdiction.id,
        catalog: districtIdentityCatalog(),
        placeGeoid: candidate.sourceGeoid,
        chamber: "state-lower",
      }).kind === "known"
    );
  });
  if (!place?.sourceGeoid)
    throw new Error("No Alaska locality has a known state House district.");

  const membership = districtMembershipFromCanonicalHome({
    homeJurisdictionId: place.context.jurisdiction.id,
    catalog: districtIdentityCatalog(),
    placeGeoid: place.sourceGeoid,
    chamber: "state-lower",
  });
  if (membership.kind !== "known")
    throw new Error("The Alaska home district is not established.");

  const { world: ordinaryLife, personId } = adultLifeAt(
    place.key,
    "civic-funded-service-ordinary-alaska-life",
  );
  const pack = candidacyPackForJurisdiction(
    ordinaryLife.people[personId]!.homeJurisdictionId,
  );
  const house = pack?.offices.find((office) =>
    office.officeKey.endsWith(":house"),
  );
  if (!house) throw new Error("The Alaska House candidacy pack is missing.");

  const filed = fileForOffice(
    ordinaryLife,
    personId,
    membership.binding,
    house.officeKey,
  );
  const decided = runToElection(filed, personId, suppliedWin(personId));
  const campaign = campaignForCandidate(decided, personId);
  if (
    !campaign ||
    !electionContestResult(decided, campaign.contestId) ||
    projectCampaign(decided, personId).phase !== "won"
  )
    throw new Error("The Alaska state House contest did not record a win.");

  const seat = workRelationshipHistoryForPerson(decided, personId).find(
    (relationship) => relationship.kind === "employment:legislative-member",
  );
  if (!seat) throw new Error("The recorded win created no House term.");
  const seated = passAsMember(decided, personId, seat.startedAt);
  if (workStatusAt(seated, seat.id)?.status !== "active")
    throw new Error(
      "The Alaska House term did not begin on its recorded date.",
    );
  if (seated.currentDate > CIVIC_FUNDED_SERVICE_START)
    throw new Error("The service journey starts before the member's term.");

  const world = passAsMember(seated, personId, CIVIC_FUNDED_SERVICE_START);
  return { world, personId, contestId: campaign.contestId, seatId: seat.id };
}
