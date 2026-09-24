import { describe, expect, it } from "vitest";

import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";
import { campaignUntilDecided } from "../../tests/fixtures/campaign-fixture";
import {
  assertWorldIntegrity,
  availableMeasureSteps,
  deserializeWorld,
  measurePosition,
  projectCongress,
  serializeWorld,
} from "../simulation";
import { US_CONGRESS_PACK_ID } from "../simulation/congress-rule-pack";
import {
  castMemberBallot,
  memberVotesAhead,
  pendingChamberQuestions,
} from "../simulation/governing/legislative-clock";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "./congress-candidacy";
import { projectCampaign } from "./campaign-projection";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { passOrdinaryDays } from "./ordinary-life";

describe("a seated Congress member's saved bill", () => {
  it("wins through the ordinary campaign, files, casts a ballot, and follows the shared clock", () => {
    const life = adultLifeIn("OR", "federal-member-bill-clock-or");
    let world = passUntil(life.world, "2026-09-01");
    const offered = congressCandidacyForPerson(world, life.personId)!;
    const house = offered.seats.find(
      (seat) => seat.identity.seat.chamberKey === "us-house" && seat.eligible,
    );
    if (!house) throw new Error("No eligible Oregon House seat was offered.");
    world = fileForCongressSeat(world, life.personId, house.identity.officeKey);
    world = campaignUntilDecided(world, life.personId, 100);
    expect(projectCampaign(world, life.personId).phase).toBe("won");
    const status = congressSeatStatus(world, life.personId);
    if (status.kind !== "won-awaiting-term")
      throw new Error(
        `Expected a won seat awaiting its term, got ${status.kind}.`,
      );
    expect(resolveLegislativeFilingEntry(world, life.personId).kind).toBe(
      "unavailable",
    );
    world = passUntil(world, status.startsAt);
    expect(congressSeatStatus(world, life.personId).kind).toBe("in-office");
    const occupied = projectCongress(world)!.house.seats.find(
      (seat) => seat.seatKey === house.identity.officeKey,
    )!;
    expect(occupied.occupant.kind).toBe("member");
    if (occupied.occupant.kind === "member")
      expect(occupied.occupant.member.personId).toBe(life.personId);

    const filing = resolveLegislativeFilingEntry(world, life.personId);
    if (filing.kind !== "available") throw new Error(filing.reason);
    expect(filing.seat.legislativeRulePackId).toBe(US_CONGRESS_PACK_ID);
    expect(filing.seat.chamberKey).toBe("house");
    expect(resolvePlayerCapabilities(world).legislativeScenarioKey).toBe(
      filing.scenarioKey,
    );
    const filed = fileDraftFromOffice(world, {
      playerPersonId: life.personId,
      scenarioKey: filing.scenarioKey,
      jurisdictionId: filing.jurisdictionId,
      memberSeatStableKey: filing.seat.relationshipStableKey,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
    });
    const measureId = filed.bill.measureId;
    world = deserializeWorld(serializeWorld(filed.world));
    const measure = world.history.legislativeMeasures!.find(
      (entry) => entry.id === measureId,
    )!;
    expect(measure.rulePackId).toBe(US_CONGRESS_PACK_ID);
    expect(measure.sponsorPersonId).toBe(life.personId);
    expect(measure.originChamberKey).toBe("house");
    expect(
      seatedChamberForPack(
        world,
        US_CONGRESS_PACK_ID,
        "house",
        "House",
      )?.body.members.some((member) => member.personId === life.personId),
    ).toBe(true);

    let ownSteps = 0;
    let clockWaits = 0;
    let ballots = 0;
    const progress: string[] = [];
    for (let turn = 0; turn < 100; turn += 1) {
      const position = measurePosition(world, measureId);
      progress.push(`${world.currentDate}:${position.phase}`);
      if (position.terminal) break;
      const resolved = resolveLegislativeAssignmentForMeasure(world, {
        measureId,
        playerPersonId: life.personId,
        memberSeatStableKey: filing.seat.relationshipStableKey,
      });
      if (resolved.kind !== "available") throw new Error(resolved.reason);
      const step = availableMeasureSteps(world, measureId).find(
        (candidate) => candidate !== "offer-amendment",
      );
      if (!step) throw new Error(`No next step: ${progress.join(" -> ")}`);
      if (institutionOwnsStep(world, resolved.assignment, step)) {
        for (const ahead of memberVotesAhead(world, life.personId).filter(
          (question) =>
            question.measure.id === measureId && question.ballot === null,
        )) {
          const forum = pendingChamberQuestions(
            world,
            measureId,
            ahead.voteOn ?? world.currentDate,
          ).find((question) =>
            question.members.some(
              (member) => member.personId === life.personId,
            ),
          );
          if (forum) {
            world = castMemberBallot(world, {
              personId: life.personId,
              question: forum.question,
              ballot: "yea",
            });
            ballots += 1;
          }
        }
        world = applyLegislativeCommand(world, resolved.assignment, {
          kind: "await-institution",
          step,
        }).world;
        clockWaits += 1;
      } else if (step === "await-executive-decision") {
        world = passOrdinaryDays(world, 3);
      } else {
        try {
          world = applyLegislativeCommand(world, resolved.assignment, {
            kind: "take-step",
            step,
          }).world;
        } catch (error) {
          throw new Error(
            `Player step ${step} after ${progress.join(" -> ")}: ${String(error)}`,
          );
        }
        ownSteps += 1;
      }
    }
    expect(ownSteps, progress.join(" -> ")).toBeGreaterThan(0);
    expect(clockWaits, progress.join(" -> ")).toBeGreaterThan(0);
    expect(ballots, progress.join(" -> ")).toBeGreaterThan(0);
    expect(
      measurePosition(world, measureId).terminal,
      progress.join(" -> "),
    ).toBe(true);
    expect(
      (world.history.legislativeVotes ?? []).some(
        (vote) =>
          vote.measureId === measureId &&
          vote.dispositions.some(
            (entry) =>
              entry.personId === life.personId &&
              entry.reason === "member:own-ballot",
          ),
      ),
    ).toBe(true);
    assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
  }, 900_000);
});
