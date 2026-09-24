import { renderToStaticMarkup } from "react-dom/server";
import { proseDate } from "../presentation/prose-dates";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import { letAdultTimePass } from "../presentation/adult-life";
import { projectCampaignOffices } from "../presentation/campaign-office-discovery";
import {
  fileForOffice,
  projectCampaign,
} from "../presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordedDistrictForOffice,
} from "../presentation/district-selection";
import {
  createExplicitGeographyLife,
  requireLocalityInState,
} from "../presentation/new-game-geography";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  campaignElectionTransitionHandler,
  campaignForCandidate,
  candidacyPackForJurisdiction,
  createFutureTransitionHandlerRegistry,
  districtSeatMustBeNamed,
  electionContestResult,
  requireElectionContest,
  resolveCampaignElectionFromRecordedInput,
  workRelationshipHistoryForPerson,
} from "../simulation";
import {
  stateLegislators,
  stateSeatsInDistrict,
} from "../simulation/nationwide-world/state-legislature-opening";
import type { EntityId, World } from "../simulation";
import { DistrictResidencePanel } from "./DistrictResidencePanel";

/**
 * Filing for a seat that is filled by district.
 *
 * Found by playing: in Sitka the office browser says a legislative seat can be
 * filed for, and pressing the button is refused, because the filing has to
 * name which numbered district it is for and the only screen that can produce
 * one was mounted nowhere. Nothing imported it. So the player was offered an
 * office they could not actually put their name in for.
 *
 * These prove the two halves that fix: that the seam refuses and then accepts
 * on exactly the district the world recorded, and that the panel asked for one
 * office renders that office's districts with the recorded one offered first
 * and without a second way to file. The pointer and keyboard route through the
 * campaign screen stays a browser proof.
 */

interface Life {
  readonly world: World;
  readonly personId: EntityId;
}

/** A life old enough in one place to satisfy a district-residence rule. */
function settledLife(stateKey: string, town: string, days: number): Life {
  const place = requireLocalityInState(stateKey, town);
  const created = createExplicitGeographyLife({
    placeKey: place.key,
    seed: `district-seat-${town}`,
    startAge: 40,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  return {
    world: letAdultTimePass(created.game.world, days),
    personId: created.game.playerPersonId,
  };
}

/** A fictional supplied result tests seating; it is not an election forecast. */
function passWinningElection(world: World, personId: EntityId): World {
  const handlers = createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((row) =>
          due.entityIds.includes(row.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional result for a numbered-seat test.",
          },
        });
        return {
          world: resolved,
          status: "resolved" as const,
          reasonKey: null,
          context: "Supplied numbered-seat result.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
  let next = world;
  for (
    let step = 0;
    step < 60 && projectCampaign(next, personId).phase === "active";
    step += 1
  )
    next = passOrdinaryDays(next, 30, { handlers });
  return next;
}

function passToDate(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 200 && next.currentDate < date; step += 1) {
    const days = Math.round(
      (Date.parse(date) - Date.parse(next.currentDate)) / 86_400_000,
    );
    next = passOrdinaryDays(next, Math.max(1, Math.min(30, days)));
  }
  return next;
}

/**
 * The world as an older save holds it: the split-town placement closed on the
 * day it was written, so no interval covers today. Closing rather than
 * deleting keeps history append-oriented.
 */
function withoutSplitPlacement(world: World): World {
  return {
    ...world,
    history: {
      ...world.history,
      districtResidenceIntervals: (
        world.history.districtResidenceIntervals ?? []
      ).map((interval) =>
        interval.provenance.method === "split-home-assignment"
          ? { ...interval, endedOn: interval.startedOn }
          : interval,
      ),
    },
  };
}

const SITKA_HOUSE = "us-ak-legislature-v1:house";
const KENTUCKY_HOUSE = "us-ky-general-assembly-v1:house";

describe("a seat filled by district", () => {
  it("requires Kentucky's numbered House seat at filing and seats its winner on that roll", () => {
    const created = createExplicitGeographyLife({
      placeKey: "lexington-fayette",
      seed: "numbered-kentucky-seat",
      startAge: 40,
      startKind: "normal",
      depth: "summarize-earlier-life",
    });
    const personId = created.game.playerPersonId;
    const world = openOrdinaryLife(created.game.world, personId);
    const recorded = recordedDistrictForOffice(world, personId, KENTUCKY_HOUSE);
    expect(recorded).not.toBeNull();
    expect(
      districtSeatMustBeNamed(
        world.people[personId]!.homeJurisdictionId,
        KENTUCKY_HOUSE,
      ),
    ).toBe(true);
    expect(() => fileForOffice(world, personId, null, KENTUCKY_HOUSE)).toThrow(
      /filled by district/,
    );
    const filed = fileForOffice(
      world,
      personId,
      recorded!.binding,
      KENTUCKY_HOUSE,
    );
    const campaign = campaignForCandidate(filed, personId)!;
    const contest = requireElectionContest(filed, campaign.contestId);
    expect(contest.office.districtBinding).toStrictEqual(recorded!.binding);
    const decided = passWinningElection(filed, personId);
    const term = workRelationshipHistoryForPerson(decided, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    const seated = passToDate(decided, term.startedAt);
    const pack = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!;
    const numberedSeats = stateSeatsInDistrict(
      pack.packId,
      KENTUCKY_HOUSE,
      recorded!.binding.recordId,
    );
    expect(numberedSeats.length).toBeGreaterThan(0);
    expect(
      stateLegislators(seated, pack.packId).some(
        (member) =>
          member.personId === personId &&
          member.officeKey === KENTUCKY_HOUSE &&
          numberedSeats.some((seat) => seat.ordinal === member.ordinal),
      ),
    ).toBe(true);
  });

  it("is offered, then refuses a filing that names no district", () => {
    const { world, personId } = settledLife("US-AK", "Sitka", 700);
    const office = projectCampaignOffices(world, personId).find(
      (row) => row.officeKey === SITKA_HOUSE,
    );
    expect(office?.eligible).toBe(true);
    expect(
      districtSeatMustBeNamed(
        world.people[personId]!.homeJurisdictionId,
        SITKA_HOUSE,
      ),
    ).toBe(true);
    expect(() => fileForOffice(world, personId, null, SITKA_HOUSE)).toThrow(
      /filled by district/,
    );
  });

  it("accepts the district the world recorded, and no other", () => {
    const { world, personId } = settledLife("US-AK", "Sitka", 700);
    const recorded = recordedDistrictForOffice(world, personId, SITKA_HOUSE);
    expect(recorded).not.toBeNull();
    const filed = fileForOffice(
      world,
      personId,
      recorded!.binding,
      SITKA_HOUSE,
    );
    expect(filed).not.toBe(world);

    const elsewhere = offeredDistricts(
      world,
      world.people[personId]!.homeJurisdictionId,
      SITKA_HOUSE,
    ).find((row) => row.recordId !== recorded!.binding.recordId);
    expect(elsewhere).toBeDefined();
    expect(() =>
      fileForOffice(
        world,
        personId,
        bindingForDistrict(elsewhere!),
        SITKA_HOUSE,
      ),
    ).toThrow();
  });

  it("offers the recorded district first and does not file on its own", () => {
    const { world, personId } = settledLife("US-AK", "Sitka", 700);
    const recorded = recordedDistrictForOffice(world, personId, SITKA_HOUSE);
    const markup = renderToStaticMarkup(
      <DistrictResidencePanel
        world={world}
        personId={personId}
        officeKey={SITKA_HOUSE}
        onWorldChange={() => undefined}
        onBindingChange={() => undefined}
      />,
    );
    // The host has already chosen the office, so the panel offers no second,
    // disagreeing office selector and no second way to put a name in.
    expect(markup).not.toContain("Choose an office");
    expect(markup).not.toContain("File for this district");
    expect(markup).toContain("district-residence-recorded");
    expect(markup).toContain(proseDate(recorded!.startedOn));
    // The control shows the recorded district as its current answer, so a
    // player who presses the filing button without touching it files for the
    // district they actually live in.
    expect(markup).toContain(`data-value="${recorded!.binding.recordId}"`);
  });

  it("says so where the world recorded no district at all", () => {
    // Duluth crosses several districts. A current opening places its resident
    // in one of them; an older save, which this strips back to, has none.
    const settled = settledLife("US-MN", "Duluth", 700);
    const personId = settled.personId;
    const world = withoutSplitPlacement(settled.world);
    const office = "us-mn-legislature-v1:house";
    expect(recordedDistrictForOffice(world, personId, office)).toBeNull();
    const markup = renderToStaticMarkup(
      <DistrictResidencePanel
        world={world}
        personId={personId}
        officeKey={office}
        onWorldChange={() => undefined}
        onBindingChange={() => undefined}
      />,
    );
    expect(markup).toContain("district-residence-unrecorded");
  });
});
