import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import { committeesForPerson } from "../simulation/governing/committee-assignment";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import { suppliedLegislativeSeat } from "../../tests/fixtures/supplied-legislative-seat";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "./congress-candidacy";
import {
  congressCommitteeMembership,
  projectLegislativeOfficeContext,
} from "./legislative-office-context";

describe("a legislator's committees", () => {
  it("says so plainly where a chamber's committee has nobody to seat on it", () => {
    // Nevada's committees are unread, so the game stands in one standing
    // committee (standing-committee.ts); a supplied seat has no seated
    // chamber to deal its members from.
    const member = suppliedLegislativeSeat("US-NV", "assembly");
    const context = projectLegislativeOfficeContext(
      member.world,
      member.personId,
    );
    expect(context.committeeMembership).toEqual({
      kind: "unavailable",
      reason:
        "The Assembly does not have its full membership in the game yet, so its committees have no members.",
    });
  });

  it("does not invent a seat where the chamber has no members to deal them to", () => {
    const member = suppliedLegislativeSeat("US-AK", "house");
    const before = serializeWorld(member.world);
    const context = projectLegislativeOfficeContext(
      member.world,
      member.personId,
    );
    expect(context.committeeMembership.kind).toBe("unavailable");
    // Reading the office writes nothing.
    expect(serializeWorld(member.world)).toBe(before);
  });

  it("names the committees a member of Congress is counted on", () => {
    const { world, personId } = adultLifeIn("OR", "committees-congress-or");
    const house = congressCandidacyForPerson(world, personId)!.seats.find(
      (seat) => seat.identity.seat.chamberKey === "us-house" && seat.eligible,
    );
    if (!house)
      throw new Error("This seed's player cannot stand for the House.");
    const filed = fileForCongressSeat(
      world,
      personId,
      house.identity.officeKey,
    );
    const decided = runToElection(filed, personId, suppliedWin(personId));
    const status = congressSeatStatus(decided, personId);
    if (status.kind !== "won-awaiting-term") throw new Error(status.kind);
    const seated = passUntil(decided, status.startsAt);
    expect(congressSeatStatus(seated, personId).kind).toBe("in-office");

    const membership = congressCommitteeMembership(
      seated,
      personId,
      "us-house",
    );
    if (membership.kind !== "committees") throw new Error(membership.reason);
    // The same roster the legislative clock votes committee reports with.
    const body = seatedCongressChamber(seated, "house")!.body;
    const chamber = US_CONGRESS_RULE_PACK.chambers.find(
      (entry) => entry.chamberKey === "house",
    )!;
    expect(membership.committees.map((c) => c.committeeKey)).toEqual(
      committeesForPerson(
        body,
        chamber.committees,
        personId,
        `${US_CONGRESS_PACK_ID}:house`,
      ),
    );
    expect(membership.label).toMatch(/^You sit on the Committee on [^.]+\.$/);
  }, 900_000);
});
