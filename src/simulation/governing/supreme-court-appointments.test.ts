import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../presentation/ordinary-life";
import { publicOfficesHeldBy, currentPresidentOf } from "../crisis/offices";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import { deserializeWorld, serializeWorld } from "../serialization";
import { lifePlaces } from "../life-places";
import { createFormationContext, recordPrinciples } from "../politics";
import { SeededRng } from "../rng";
import type { World } from "../types";
import { recordPersonDeath } from "../vitality";
import {
  applyOfficeContinuityNotices,
  officeContinuityRulings,
} from "./office-continuity";
import {
  SUPREME_COURT_APPOINTMENT_PROFILE,
  SUPREME_COURT_NOMINATED_EVENT,
  SUPREME_COURT_SEATED_EVENT,
  SUPREME_COURT_VOTE_EVENT,
  briefSenateOnNominee,
  senateConfirmationVote,
  supremeCourtNomineePool,
} from "./supreme-court-appointments";
import { seatedCongressChamber } from "./congress-chambers";
import { publicPartyOf } from "./chamber-votes";

/** A life in a place drawn by the seed from every place a life can start. */
function openingWorld(seed: string): World {
  const place = new SeededRng(seed).pick(lifePlaces());
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

function associateSeats(world: World) {
  return seatsForCourt(world, "us-supreme-court").filter(
    (seat) => !seat.linkedOfficeId,
  );
}

describe("Build 27 step 1: every Supreme Court seat is filled by nomination and a Senate vote", () => {
  it("an associate justice who dies is replaced by a judge the President names and the seated Senate confirms", () => {
    const world = openingWorld("b27-associate");
    const seats = associateSeats(world);
    expect(seats).toHaveLength(8);
    const seat = seats[0]!;
    const justice = seatHolderAt(world, seat.seatId)!;
    const offices = publicOfficesHeldBy(world, justice.personId);
    expect(offices.map((office) => office.officeKey)).toContain(seat.seatId);

    const dead = recordPersonDeath(world, {
      stableKey: `b27:death:${justice.personId}`,
      personId: justice.personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "A justice died.",
      provenance: { kind: "authored", note: "Build 27 fixture." },
    });
    const death = dead.history.personDeaths.at(-1)!;
    let next = applyOfficeContinuityNotices(dead, [
      {
        noticeKey: `crisis:continuity:${death.id}`,
        sequence: death.sequence,
        originEventId: death.eventId,
        personId: justice.personId,
        kind: "death",
        effectiveDate: death.diedAt,
        recordedDate: dead.currentDate,
        visibility: "public",
        offices,
        sourceRecordId: death.id,
      },
    ]);
    expect(officeContinuityRulings(next, seat.seatId)[0]!.outcome).toBe(
      "vacant",
    );
    expect(seatHolderAt(next, seat.seatId)).toBeNull();

    next = passOrdinaryDays(
      next,
      SUPREME_COURT_APPOINTMENT_PROFILE.daysFromVacancyToNomination,
    );
    const nomination = next.history.events.find(
      (event) => event.type === SUPREME_COURT_NOMINATED_EVENT,
    )!;
    expect(nomination).toBeDefined();
    const nomineeId = nomination.participants.find(
      (row) => row.role === "focus:subject",
    )!.personId;
    // The nominee is a sitting judge, never the player or the President.
    const pool = supremeCourtNomineePool(next, "associate");
    expect(pool.map((candidate) => candidate.personId)).toContain(nomineeId);
    expect(nomineeId).not.toBe(currentPresidentOf(next)!.personId);
    if (next.control.kind === "person")
      expect(nomineeId).not.toBe(next.control.personId);
    const lowerSeats = pool.find(
      (candidate) => candidate.personId === nomineeId,
    )!.heldSeatIds;

    next = passOrdinaryDays(
      next,
      SUPREME_COURT_APPOINTMENT_PROFILE.daysFromNominationToVote,
    );
    const vote = next.history.events.find(
      (event) => event.type === SUPREME_COURT_VOTE_EVENT,
    )!;
    expect(vote).toBeDefined();
    const ballots = vote.participants.filter(
      (row) => row.role === "agency:senate-vote",
    );
    // Every seated senator casts a recorded ballot.
    expect(ballots.length).toBe(
      seatedCongressChamber(next, "senate")!.body.members.length,
    );
    const yeas = ballots.filter((row) => row.detail?.startsWith("yea|"));
    const nays = ballots.filter((row) => row.detail?.startsWith("nay|"));
    expect(vote.tags).toContain(`yeas:${yeas.length}`);
    expect(vote.tags).toContain(`nays:${nays.length}`);
    if (vote.tags.includes("outcome:confirmed")) {
      expect(seatHolderAt(next, seat.seatId)!.personId).toBe(nomineeId);
      expect(
        next.history.events.some(
          (event) => event.type === SUPREME_COURT_SEATED_EVENT,
        ),
      ).toBe(true);
      // The new justice left the court they sat on.
      for (const seatId of lowerSeats)
        expect(seatHolderAt(next, seatId)?.personId).not.toBe(nomineeId);
    } else {
      expect(seatHolderAt(next, seat.seatId)).toBeNull();
    }
    const reopened = deserializeWorld(serializeWorld(next));
    expect(seatHolderAt(reopened, seat.seatId)?.personId).toBe(
      seatHolderAt(next, seat.seatId)?.personId,
    );
  }, 600_000);

  it("senators decide by their own reasons: the President's own party supports a sitting judge", () => {
    const world = openingWorld("b27-vote");
    const president = currentPresidentOf(world)!;
    const pool = supremeCourtNomineePool(world, "associate");
    const nominee = pool.find((c) => c.bench === "federal-appeals")!;
    const vote = senateConfirmationVote(world, {
      stableKey: "b27:vote-fixture",
      nomineeId: nominee.personId,
      presidentId: president.personId,
    })!;
    const presidentParty = publicPartyOf(world, president.personId);
    const senate = seatedCongressChamber(world, "senate")!.body.members;
    for (const ballot of vote.ballots) {
      const member = senate.find((m) => m.personId === ballot.personId)!;
      if (presidentParty && member.partyKey === presidentParty)
        expect(ballot.ballot).toBe("yea");
    }
    expect(vote.yeas + vote.nays).toBeGreaterThan(0);
    expect(vote.confirmed).toBe(
      vote.yeas > vote.nays ||
        (vote.yeas === vote.nays && vote.tieBreaker?.ballot === "yea"),
    );
  }, 600_000);

  it("a senator of the other party votes for a nominee whose views match their own principles", () => {
    const world = openingWorld("b27-nominee-views");
    const president = currentPresidentOf(world)!;
    const presidentParty = publicPartyOf(world, president.personId);
    const nominee = supremeCourtNomineePool(world, "associate").find(
      (c) => c.bench === "federal-appeals",
    )!;
    let briefed = briefSenateOnNominee(world, nominee.personId);
    const senator = seatedCongressChamber(briefed, "senate")!.body.members.find(
      (m) =>
        m.personId &&
        presidentParty &&
        m.partyKey &&
        m.partyKey !== presidentParty &&
        briefed.history.principles.some((row) => row.personId === m.personId),
    )!;
    // The senator holds their principles firmly, and the nominee holds the same.
    const held = briefed.history.principles.filter(
      (row) => row.personId === senator.personId,
    );
    for (const personId of [senator.personId!, nominee.personId])
      briefed = recordPrinciples(
        briefed,
        held.map((row) => ({
          stableKey: `b27-test:views:${personId}:${row.principleId}`,
          personId,
          principleId: row.principleId,
          formedAt: briefed.currentDate,
          stance: row.stance,
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("other:drawn-before-play", {
            note: "Test fixture.",
          }),
          supersedesPrincipleRecordId:
            briefed.history.principles
              .filter(
                (p) =>
                  p.personId === personId && p.principleId === row.principleId,
              )
              .at(-1)?.id ?? null,
        })),
      );
    const vote = senateConfirmationVote(briefed, {
      stableKey: "b27:views-fixture",
      nomineeId: nominee.personId,
      presidentId: president.personId,
    })!;
    const ballot = vote.ballots.find((b) => b.personId === senator.personId)!;
    expect(ballot).toMatchObject({
      ballot: "yea",
      reason: "senator:nominee-views",
    });
  }, 600_000);
});
