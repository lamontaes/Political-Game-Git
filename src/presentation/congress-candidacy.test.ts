import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import { congressionalElectionDay, projectCongress } from "../simulation";
import type { World } from "../simulation";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "./congress-candidacy";

function houseOccupant(world: World, seatKey: string) {
  const row = projectCongress(world)!.house.seats.find(
    (seat) => seat.seatKey === seatKey,
  )!;
  return row.occupant.kind === "member" ? row.occupant.member.personId : null;
}

describe("running for Congress from an ordinary life", () => {
  it("offers every House district in the state and the next Senate seat, with a reason for anything closed", () => {
    const { world, personId } = adultLifeIn("NV", "congress-offer-nv");
    const candidacy = congressCandidacyForPerson(world, personId)!;
    expect(candidacy.stateUsps).toBe("NV");
    const keys = candidacy.seats.map((seat) => seat.identity.officeKey);
    // Nevada has four districts; its Senate seats are classes 1 and 3, and
    // only the one elected next is offered.
    expect(keys.filter((key) => key.startsWith("us-house:NV-"))).toHaveLength(
      4,
    );
    const senate = candidacy.seats.filter(
      (seat) => seat.identity.seat.chamberKey === "us-senate",
    );
    expect(senate).toHaveLength(1);
    expect(keys[0]).toBe(senate[0]!.identity.officeKey);
    for (const seat of candidacy.seats) {
      expect(seat.calendar.nextElection > world.currentDate).toBe(true);
      expect(seat.eligible || seat.blocks.length > 0).toBe(true);
    }
  });

  it("files, wins the seat's own contest, and is the member Congress shows on January 3", () => {
    const { world, personId } = adultLifeIn("OR", "congress-journey-or");
    const offered = congressCandidacyForPerson(world, personId)!;
    const house = offered.seats.find(
      (seat) => seat.identity.seat.chamberKey === "us-house" && seat.eligible,
    );
    if (!house)
      throw new Error(
        `This seed's player cannot stand for the House: ${offered.seats[0]?.blocks[0]?.reason}`,
      );
    const seatKey = house.identity.officeKey;
    const organizationsBefore = world.history.organizations.length;

    const filed = fileForCongressSeat(world, personId, seatKey);
    const contest = filed.history.electionContests!.at(-1)!;
    // The contest is the seat's own, on the federal election day, so
    // congressional turnover reads it instead of drawing a winner.
    expect(contest.office.seatKey).toBe(seatKey);
    expect(contest.electionDate).toBe(
      congressionalElectionDay(Number(contest.electionDate.slice(0, 4))),
    );
    expect(congressSeatStatus(filed, personId)).toMatchObject({
      kind: "pending-election",
      electionDate: contest.electionDate,
    });

    const decided = runToElection(filed, personId, suppliedWin(personId));
    const status = congressSeatStatus(decided, personId);
    expect(status.kind).toBe("won-awaiting-term");
    if (status.kind !== "won-awaiting-term") return;
    // Nothing is occupied on election night, and winning makes no separate
    // legislature of its own beside the Congress record.
    expect(houseOccupant(decided, seatKey)).not.toBe(personId);
    expect(
      decided.history.organizations
        .slice(organizationsBefore)
        .some((organization) =>
          organization.stableKey.startsWith("legislature:"),
        ),
    ).toBe(false);

    const seated = passUntil(decided, status.startsAt);
    expect(houseOccupant(seated, seatKey)).toBe(personId);
    expect(congressSeatStatus(seated, personId)).toMatchObject({
      kind: "in-office",
      startsAt: status.startsAt,
      endsAt: status.endsAt,
    });

    // Two years on, a member who did not file again is not kept or retired
    // by chance: the seat goes to somebody new.
    const next = passUntil(seated, status.endsAt);
    const successor = houseOccupant(next, seatKey);
    expect(successor).not.toBeNull();
    expect(successor).not.toBe(personId);
  }, 900_000);
});
