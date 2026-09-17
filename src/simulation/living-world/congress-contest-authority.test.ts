import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import { scheduleElectionContest } from "../election-contests";
import { stateJurisdictionForKey } from "../life-places";
import type { World } from "../types";
import { projectCongress } from "./congress";
import {
  CONGRESS_RESULTS_EVENT,
  congressionalElectionDay,
  seatCandidacyIntent,
} from "./congress-turnover";

const AUTHORED = {
  method: "authored" as const,
  sourceEntityIds: [],
  note: "Supplied fictional contest for a seat, not a forecast.",
};

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

function passTo(world: World, until: string): World {
  let next = world;
  for (let step = 0; step < 90 && next.currentDate < until; step += 1) {
    const days = Math.round(
      (Date.parse(until) - Date.parse(next.currentDate)) / 86_400_000,
    );
    next = passOrdinaryDays(next, Math.max(1, Math.min(30, days)));
  }
  return next;
}

describe("GOVERNING D2: a recorded contest decides its own seat", () => {
  it("keeps standing again, the result and taking office as three separate records", () => {
    let world = openingWorld("congress-contest-authority");
    const congress = projectCongress(world)!;
    const seat = congress.house.seats.find(
      (row) => row.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    const incumbent = seat.occupant.member.personId;
    const challenger = world.personOrder.find((id) => id !== incumbent)!;
    const electionDay = congressionalElectionDay(2026);
    const stateId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;

    // This world schedules a real contest for the seat and records its result.
    world = scheduleElectionContest(world, {
      stableKey: `test:house-contest:${seat.seatKey}`,
      jurisdictionId: stateId,
      office: {
        officeKey: "us-house",
        title: seat.occupant.member.title,
        seatKey: seat.seatKey,
        occupationClassification: "service:us-house",
      },
      electionDate: electionDay,
      candidatePersonIds: [incumbent, challenger],
      provenance: AUTHORED,
    });
    const contestId = world.history.electionContests!.at(-1)!.id;

    // The clock runs the contest on its own election day.
    world = passTo(world, "2026-11-10");
    const result = world.history.electionContestResults!.find(
      (row) => row.contestId === contestId,
    )!;
    expect([incumbent, challenger]).toContain(result.winnerPersonId);

    // Standing again is recorded on its own, apart from the result.
    expect(seatCandidacyIntent(world, seat.seatKey, 2026)).not.toBeNull();
    expect(
      world.history.events.some(
        (event) =>
          event.type === "election.congress-candidacy-intent" &&
          event.tags.includes(`seat:${seat.seatKey}`),
      ),
    ).toBe(true);

    // The seat's winner is the contest's winner, not the turnover profile's:
    // the profile would have created a new person for an open seat.
    const results = world.history.events.find(
      (event) => event.type === CONGRESS_RESULTS_EVENT,
    )!;
    const line = results.participants.find((row) =>
      (row.detail ?? "").startsWith(`${seat.seatKey}|`),
    )!;
    expect(line.personId).toBe(result.winnerPersonId);

    // Taking office is a third record, dated January 3.
    const beforeSeating = passTo(world, "2027-01-02");
    const seatedEarly = projectCongress(beforeSeating)!.house.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )!;
    expect(
      seatedEarly.occupant.kind === "member"
        ? seatedEarly.occupant.member.startedAt
        : null,
    ).not.toBe("2027-01-03");
    world = passTo(world, "2027-01-05");
    const seated = projectCongress(world)!.house.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )!;
    expect(seated.occupant.kind).toBe("member");
    if (seated.occupant.kind === "member") {
      expect(seated.occupant.member.personId).toBe(result.winnerPersonId);
      expect(seated.occupant.member.startedAt).toBe("2027-01-03");
    }
  }, 600_000);
});
