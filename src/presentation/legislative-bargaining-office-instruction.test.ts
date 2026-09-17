import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  recordFiledProvision,
  recordOfficeVoteInstruction,
  recordOfficeWorkflowPreference,
  recordWorkStatus,
  serializeWorld,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import {
  campaignUntilDecided,
  fileForOffice,
} from "../../tests/fixtures/campaign-fixture";
import {
  applyLegislativeCommand,
  openLegislativeWork,
} from "./legislation-world";
import { openLegislativeBargaining } from "./legislative-bargaining-world";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { takeNegotiatedFloorVote } from "./legislative-bargaining-actions";
import { evaluateOfficeVoteInstruction } from "./office-vote-instruction";
import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";

function filedLife(seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  const world = fileForOffice(
    openOrdinaryLife(built.world, personId),
    personId,
  );
  return { world, personId };
}

function playUntilDecided(seed: string, campaigned: boolean) {
  const life = filedLife(seed);
  // A played campaign does the ordinary daily work; rivals campaign weekly, so
  // a few sessions and a wait no longer decide the race. An unplayed one files,
  // raises money once, and waits for election day.
  let world = campaigned
    ? campaignUntilDecided(life.world, life.personId)
    : spendAnAfternoon(life.world, life.personId, "fundraising");
  for (
    let day = 0;
    day < 60 && projectCampaign(world, life.personId).phase === "active";
    day += 1
  ) {
    world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
  }
  // A win records a dated term; the seat is active only once that term begins.
  if (projectCampaign(world, life.personId).phase === "won")
    world = enterSupportedTerm(world, life.personId);
  return { world, personId: life.personId };
}

function wonAndOnTheFloor() {
  const played = playUntilDecided("p85c-owner-0", true);
  expect(projectCampaign(played.world, played.personId).phase).toBe("won");
  const capabilities = resolvePlayerCapabilities(played.world);
  const opened = openLegislativeWork(played.world, {
    playerPersonId: played.personId,
    scenarioKey: capabilities.legislativeScenarioKey!,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
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
  return { world, personId: played.personId, assignment: opened.assignment };
}

function recordStandingNay(
  world: ReturnType<typeof wonAndOnTheFloor>["world"],
  personId: string,
  measureId: string,
) {
  const membership = resolveActiveMemberSeat(world, personId);
  expect(membership.kind).toBe("seated");
  if (membership.kind !== "seated") throw new Error(membership.reason);
  const preference = recordOfficeWorkflowPreference(world, {
    personId,
    officeRelationshipId: membership.seat.relationshipId,
    votingMode: "prior-instructions-with-exceptions",
    caseworkMode: "staff-routine-player-exceptions",
  });
  expect(preference.kind).toBe("recorded");
  if (preference.kind !== "recorded") throw new Error(preference.reason);
  const instructed = recordOfficeVoteInstruction(preference.world, {
    personId,
    officeRelationshipId: membership.seat.relationshipId,
    chamberKey: membership.seat.chamberKey,
    measureId,
    disposition: "nay",
  });
  expect(instructed.kind).toBe("recorded");
  if (instructed.kind !== "recorded") throw new Error(instructed.reason);
  return {
    world: instructed.world,
    seat: membership.seat,
  };
}

describe("bargaining floor writes honor the same office-instruction guard as applyLegislativeStep", () => {
  it("overlays an armed nay onto the live member's floor vote", () => {
    const floor = wonAndOnTheFloor();
    const entry = openLegislativeBargaining(floor.world, {
      playerPersonId: floor.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") throw new Error(entry.reason);
    const instructed = recordStandingNay(
      entry.world,
      floor.personId,
      entry.seat.measureId,
    );
    expect(
      evaluateOfficeVoteInstruction(instructed.world, {
        actorPersonId: floor.personId,
        officeRelationshipId: instructed.seat.relationshipId,
        chamberKey: instructed.seat.chamberKey,
        measureId: entry.seat.measureId,
      }).kind,
    ).toBe("armed");
    const votesBefore = (instructed.world.history.legislativeVotes ?? [])
      .length;
    const vote = takeNegotiatedFloorVote(
      instructed.world,
      entry.seat,
      entry.seat.progress,
    );
    const playerVote = (vote.world.history.legislativeVotes ?? [])
      .at(-1)
      ?.dispositions.find((entryVote) => entryVote.personId === floor.personId);
    expect(playerVote?.disposition).toBe("nay");
    expect((vote.world.history.legislativeVotes ?? []).length).toBeGreaterThan(
      votesBefore,
    );
  });

  it("refuses a stale-text instruction without writing, and refuses after the office ends", () => {
    const floor = wonAndOnTheFloor();
    const entry = openLegislativeBargaining(floor.world, {
      playerPersonId: floor.personId,
    });
    expect(entry.kind).toBe("available");
    if (entry.kind !== "available") throw new Error(entry.reason);
    const instructed = recordStandingNay(
      entry.world,
      floor.personId,
      entry.seat.measureId,
    );
    const measure = instructed.world.history.legislativeMeasures!.find(
      (record) => record.id === entry.seat.measureId,
    )!;
    const rewritten = recordFiledProvision(instructed.world, {
      stableKey: `bargaining-instruction:${measure.stableKey}:stale`,
      measureId: measure.id,
      provisionKey: "bargaining-instruction-stale",
      sectionNumber: 99,
      heading: "Later filing",
      text: "A later filing changed the bill after the instruction was recorded.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "everyone the Act reaches",
      },
      applicationScope: {
        jurisdictionId: measure.jurisdictionId,
        segmentKey: null,
      },
    });
    const beforeChanged = serializeWorld(rewritten);
    expect(() =>
      takeNegotiatedFloorVote(rewritten, entry.seat, entry.seat.progress),
    ).toThrow(/bill has changed/i);
    expect(serializeWorld(rewritten)).toBe(beforeChanged);

    const relationship = instructed.world.history.workRelationships.find(
      (record) => record.id === instructed.seat.relationshipId,
    )!;
    const latestStatus = instructed.world.history.workStatuses
      .filter((status) => status.workRelationshipId === relationship.id)
      .at(-1)!;
    const ended = recordWorkStatus(instructed.world, {
      stableKey: "bargaining-instruction:seat-ended",
      workRelationshipId: relationship.id,
      effectiveAt: instructed.world.currentDate,
      status: "ended",
      reason: "left office",
      supersedesStatusId: latestStatus.id,
      provenance: {
        kind: "authored",
        note: "Bargaining instruction ended-office refusal.",
      },
    });
    const beforeEnded = serializeWorld(ended);
    expect(() =>
      takeNegotiatedFloorVote(ended, entry.seat, entry.seat.progress),
    ).toThrow(/seat/i);
    expect(serializeWorld(ended)).toBe(beforeEnded);
  });
});
