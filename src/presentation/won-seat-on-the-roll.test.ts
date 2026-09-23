import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import { districtMembershipFromCanonicalHome } from "../districts/query";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeAt,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  candidacyPackForJurisdiction,
  searchLifePlaces,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../simulation";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import {
  planStateChambers,
  stateLegislators,
  STATE_LEGISLATURE_KEYS,
} from "../simulation/nationwide-world/state-legislature-opening";
import { addDays, compareSimulationMoments } from "../simulation";
import type { World } from "../simulation";
import { scheduledActivityState } from "../simulation/time-work";
import { playCalendarActivity } from "./calendar-time-control";
import { projectCampaign } from "./campaign-projection";

/**
 * Passes time as a seated member does: a floor vote's reminder stops the
 * clock, and the member attends it (here, without deciding) before going on.
 */
function passAsMember(world: World, personId: string, date: string): World {
  let next = world;
  for (let step = 0; step < 400 && next.currentDate < date; step += 1) {
    const moved = passUntil(next, date);
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
    if (!due) {
      console.log(
        "DBG",
        moved.currentMoment,
        JSON.stringify(
          moved.history.scheduledActivities
            .filter(
              (a) =>
                scheduledActivityState(moved, a.id).status === "scheduled" &&
                a.participantPersonIds.includes(personId),
            )
            .map((a) => [
              a.stableKey,
              a.kind,
              scheduledActivityState(moved, a.id).start,
            ]),
        ),
      );
      return moved;
    }
    const played = playCalendarActivity(moved, personId, due.id);
    next = played.world;
  }
  return next;
}

/**
 * A player who wins a district seat takes it in the chamber the game seated.
 *
 * Before: the opening's generated member kept the district after the player's
 * term began, and the chamber roll never listed the player, so a won seat had
 * no floor votes. After: the winner's first day ends that member's tenure,
 * and the roll lists the winner in the same numbered seat.
 */
describe("a won state House seat in a chamber the game seated", () => {
  it("replaces the district's generated member and puts the winner on the roll", () => {
    // An Oregon town that lies inside one state House district.
    const place = searchLifePlaces("", 200, {
      stateJurisdictionKey: "US-OR",
      scope: "locality",
    }).find(
      (candidate) =>
        candidate.sourceGeoid &&
        districtMembershipFromCanonicalHome({
          homeJurisdictionId: candidate.jurisdictionId,
          catalog: districtIdentityCatalog(),
          placeGeoid: candidate.sourceGeoid,
          chamber: "state-lower",
        }).kind === "known",
    )!;
    expect(place).toBeDefined();
    const membership = districtMembershipFromCanonicalHome({
      homeJurisdictionId: place.jurisdictionId,
      catalog: districtIdentityCatalog(),
      placeGeoid: place.sourceGeoid,
      chamber: "state-lower",
    });
    if (membership.kind !== "known") throw new Error("No home district.");
    const binding = membership.binding;

    const { world, personId } = adultLifeAt(place.key, "won-seat-roll-OR");
    const pack = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!;
    const house = planStateChambers(pack).chambers.find(
      (chamber) => chamber.chamberKey === "house",
    )!;
    const ordinal =
      house.districts.findIndex(
        (district) => district?.recordId === binding.recordId,
      ) + 1;
    expect(ordinal).toBeGreaterThan(0);
    const before = stateLegislators(world, pack.packId).find(
      (member) =>
        member.officeKey === house.officeKey && member.ordinal === ordinal,
    )!;
    expect(before).toBeDefined();
    expect(before.personId).not.toBe(personId);

    const decided = runToElection(
      fileForOffice(world, personId, binding),
      personId,
      suppliedWin(personId),
    );
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const seat = workRelationshipHistoryForPerson(decided, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    // Until the term begins, the district's member keeps the seat.
    expect(
      stateLegislators(decided, pack.packId).find(
        (member) =>
          member.officeKey === house.officeKey && member.ordinal === ordinal,
      )?.personId,
    ).toBe(before.personId);

    const seated = passUntil(decided, seat.startedAt);
    expect(workStatusAt(seated, seat.id)?.status).toBe("active");
    expect(workStatusAt(seated, before.workRelationshipId)?.status).toBe(
      "ended",
    );
    const roll = stateLegislators(seated, pack.packId).filter(
      (member) => member.officeKey === house.officeKey,
    );
    const mine = roll.filter((member) => member.personId === personId);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.ordinal).toBe(ordinal);
    expect(roll.some((member) => member.personId === before.personId)).toBe(
      false,
    );
    expect(roll.length).toBeLessThanOrEqual(house.size);
    // The tenure the opening wrote is the one that ended.
    expect(
      seated.history.workRelationships.find(
        (relationship) => relationship.id === before.workRelationshipId,
      )?.stableKey,
    ).toBe(`${STATE_LEGISLATURE_KEYS.seat(house.officeKey, ordinal)}:tenure`);

    const chamber = seatedChamberForPack(
      seated,
      pack.legislativeRulePackId,
      "house",
      house.chamberName,
    )!;
    expect(
      chamber.body.members.filter((member) => member.personId === personId),
    ).toHaveLength(1);

    // Re-elected: the next term's seat holds the same numbered seat.
    const again = runToElection(
      fileForOffice(seated, personId, binding),
      personId,
      suppliedWin(personId),
    );
    const next = workRelationshipHistoryForPerson(again, personId).find(
      (relationship) =>
        relationship.kind === "employment:legislative-member" &&
        relationship.id !== seat.id,
    )!;
    expect(next).toBeDefined();
    const reseated = passAsMember(again, personId, next.startedAt);
    // Reminders the campaign's afternoons passed over do not linger.
    expect(
      reseated.history.scheduledActivities.filter((activity) => {
        const state = scheduledActivityState(reseated, activity.id);
        return (
          activity.stableKey.includes(":member-vote:") &&
          state.status === "scheduled" &&
          compareSimulationMoments(state.end, reseated.currentMoment) < 0 &&
          state.end.date < addDays(reseated.currentDate, -1)
        );
      }),
    ).toEqual([]);
    expect(workStatusAt(reseated, seat.id)?.status).toBe("ended");
    expect(workStatusAt(reseated, next.id)?.status).toBe("active");
    const held = stateLegislators(reseated, pack.packId).filter(
      (member) => member.personId === personId,
    );
    expect(
      held.map((member) => [member.workRelationshipId, member.ordinal]),
    ).toEqual([[next.id, ordinal]]);
  }, 900_000);
});
