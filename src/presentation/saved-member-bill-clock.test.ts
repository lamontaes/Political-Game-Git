import { describe, expect, it } from "vitest";

import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import {
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import { districtIdentityCatalog } from "../districts/catalog";
import { districtMembershipFromCanonicalHome } from "../districts/query";
import {
  campaignUntilDecided,
  fileForOffice,
} from "../../tests/fixtures/campaign-fixture";
import {
  assertWorldIntegrity,
  availableMeasureSteps,
  deserializeWorld,
  measurePosition,
  searchLifePlaces,
  serializeWorld,
  type World,
} from "../simulation";
import {
  castMemberBallot,
  memberVotesAhead,
  pendingChamberQuestions,
} from "../simulation/governing/legislative-clock";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import { memberBallotOn } from "../simulation/governing/member-ballots";
import { ensureStateLegislatureOpening } from "../simulation/nationwide-world/state-legislature-opening";
import {
  appendWorldConditions,
  drawStartingRegime,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { legislativeStartingProcedures } from "../simulation/legislative-procedure-world";
import { fileDraftFromOffice } from "./legislation-docket";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectCampaign } from "./campaign-projection";

/**
 * A player wins and enters a recorded House term before filing. The shared
 * campaign fixture supplies ordinary campaign actions, not a supplied result,
 * seat, chamber vote, or authored sitting.
 */
function electedMember() {
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
  );
  if (!place)
    throw new Error("No Oregon locality with a recorded House district.");
  const membership = districtMembershipFromCanonicalHome({
    homeJurisdictionId: place.jurisdictionId,
    catalog: districtIdentityCatalog(),
    placeGeoid: place.sourceGeoid,
    chamber: "state-lower",
  });
  if (membership.kind !== "known")
    throw new Error("No canonical home district.");
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "leg-content1-family-bargaining",
      startAge: 34,
      placeKey: place.key,
      gender: "male",
      pronouns: "he-him",
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  let world = fileForOffice(
    openOrdinaryLife(game.world, personId),
    personId,
    membership.binding,
  );
  try {
    world = campaignUntilDecided(world, personId);
  } catch (error) {
    throw new Error(
      `Campaign clock stopped at ${world.currentDate}: ${String(error)}`,
    );
  }
  expect(projectCampaign(world, personId).phase).toBe("won");
  world = enterSupportedTerm(world, personId);
  return { world, personId };
}

describe("a saved member bill on the generic institutional clock", () => {
  it("files from a won seat, casts the member's own ballot, and saves a terminal outcome", () => {
    const seat = electedMember();
    const filing = resolveLegislativeFilingEntry(seat.world, seat.personId);
    if (filing.kind !== "available") throw new Error(filing.reason);
    expect(legislativeStartingProcedures(seat.world)).not.toBeNull();

    const filed = fileDraftFromOffice(seat.world, {
      playerPersonId: seat.personId,
      scenarioKey: filing.scenarioKey,
      jurisdictionId: filing.jurisdictionId,
      memberSeatStableKey: filing.seat.relationshipStableKey,
      familyKey: "broadband-access",
      variantKey: "unserved-buildout",
    });
    const measureId = filed.bill.measureId;
    let world: World = deserializeWorld(serializeWorld(filed.world));
    const seated = seatedChamberForPack(
      world,
      filing.seat.legislativeRulePackId,
      filing.seat.chamberKey,
      "Player chamber",
    );
    expect(
      seated?.body.members.some((member) => member.personId === seat.personId),
      `The won ${filing.seat.chamberKey} seat must appear on the chamber roll.`,
    ).toBe(true);
    let ownSteps = 0;
    let ballots = 0;
    let clockWaits = 0;
    const progress: string[] = [];
    const questionProgress: string[] = [];

    for (let turn = 0; turn < 100; turn += 1) {
      const position = measurePosition(world, measureId);
      progress.push(`${world.currentDate}:${position.phase}`);
      if (position.terminal) break;
      const resolved = resolveLegislativeAssignmentForMeasure(world, {
        measureId,
        playerPersonId: seat.personId,
        memberSeatStableKey: filing.seat.relationshipStableKey,
      });
      if (resolved.kind !== "available") throw new Error(resolved.reason);
      const assignment = resolved.assignment;
      expect(assignment.procedure.recordedSittingEventId).toBeUndefined();
      const steps = availableMeasureSteps(world, measureId);
      const step = steps.find((candidate) => candidate !== "offer-amendment");
      if (!step) throw new Error(`No next step: ${progress.join(" -> ")}`);

      if (institutionOwnsStep(world, assignment, step)) {
        const roster = seatedChamberForPack(
          world,
          filing.seat.legislativeRulePackId,
          filing.seat.chamberKey,
          "Player chamber",
        );
        const aheadForBill = memberVotesAhead(world, seat.personId).filter(
          (question) =>
            question.measure.id === measureId && question.ballot === null,
        );
        questionProgress.push(
          `${world.currentDate}:${step}:roster=${roster?.body.members.some((member) => member.personId === seat.personId)}:ahead=${aheadForBill.map((entry) => `${entry.question.purpose}@${entry.voteOn}`).join("|")}`,
        );
        for (const ahead of aheadForBill) {
          const forum = pendingChamberQuestions(
            world,
            measureId,
            ahead.voteOn ?? world.currentDate,
          ).find((candidate) =>
            candidate.members.some(
              (member) => member.personId === seat.personId,
            ),
          );
          if (forum) {
            const decided = castMemberBallot(world, {
              personId: seat.personId,
              question: forum.question,
              ballot: "yea",
            });
            expect(decided).not.toBe(world);
            world = decided;
            ballots += 1;
          }
        }
        try {
          world = applyLegislativeCommand(world, assignment, {
            kind: "await-institution",
            step,
          }).world;
        } catch (error) {
          throw new Error(
            `Institutional clock stopped after ${progress.join(" -> ")}: ${String(error)}`,
          );
        }
        clockWaits += 1;
      } else if (step === "await-executive-decision") {
        world = passOrdinaryDays(world, 3);
      } else {
        world = applyLegislativeCommand(world, assignment, {
          kind: "take-step",
          step,
        }).world;
        ownSteps += 1;
      }
    }

    const final = measurePosition(world, measureId);
    expect(ownSteps, progress.join(" -> ")).toBeGreaterThan(0);
    expect(clockWaits, progress.join(" -> ")).toBeGreaterThan(0);
    expect(ballots, questionProgress.join(" -> ")).toBeGreaterThan(0);
    expect(final.terminal, progress.join(" -> ")).toBe(true);
    const ownRollCalls = (world.history.legislativeVotes ?? []).filter(
      (vote) =>
        vote.measureId === measureId &&
        vote.dispositions.some(
          (entry) =>
            entry.personId === seat.personId &&
            entry.reason === "member:own-ballot",
        ),
    );
    expect(ownRollCalls.length).toBeGreaterThan(0);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(measurePosition(reopened, measureId)).toEqual(final);
    expect(
      (reopened.history.legislativeVotes ?? []).filter((vote) =>
        ownRollCalls.some((recorded) => recorded.id === vote.id),
      ),
    ).toEqual(ownRollCalls);
    assertWorldIntegrity(reopened);
  }, 900_000);

  it.each(["US-KY", "US-MN"] as const)(
    "lets a %s sponsor vote before moving a question in their own seated chamber",
    (stateKey) => {
      const place = searchLifePlaces("", 200, {
        stateJurisdictionKey: stateKey,
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
      );
      if (!place?.sourceGeoid)
        throw new Error(`No ${stateKey} home with a known House district.`);
      const membership = districtMembershipFromCanonicalHome({
        homeJurisdictionId: place.jurisdictionId,
        catalog: districtIdentityCatalog(),
        placeGeoid: place.sourceGeoid,
        chamber: "state-lower",
      });
      if (membership.kind !== "known")
        throw new Error("Unknown home district.");
      const base = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `sponsor-owned-ballot:${stateKey}`,
        placeKey: place.key,
        startAge: 40,
        startingLife: "ordinary-life",
        depth: "summarize-earlier-life",
        questionnaire: "skipped",
      });
      // A save with a seated legislature but no newer procedure profile keeps
      // the originating chamber's collective steps in the sponsor's office.
      const conditioned = appendWorldConditions(base.world, [
        generatePoliticalStartingConditions(
          base.world,
          drawStartingRegime(base.world),
        ),
      ]);
      const opened = ensureStateLegislatureOpening(
        conditioned,
        base.playerPersonId,
        stateKey.slice(3),
      );
      const filedCampaign = fileForOffice(
        opened,
        base.playerPersonId,
        membership.binding,
      );
      const elected = runToElection(
        filedCampaign,
        base.playerPersonId,
        suppliedWin(base.playerPersonId),
      );
      expect(projectCampaign(elected, base.playerPersonId).phase).toBe("won");
      const worldAtTerm = enterSupportedTerm(elected, base.playerPersonId);
      expect(legislativeStartingProcedures(worldAtTerm)).toBeNull();
      const filing = resolveLegislativeFilingEntry(
        worldAtTerm,
        base.playerPersonId,
      );
      if (filing.kind !== "available") throw new Error(filing.reason);
      const filed = fileDraftFromOffice(worldAtTerm, {
        playerPersonId: base.playerPersonId,
        scenarioKey: filing.scenarioKey,
        jurisdictionId: filing.jurisdictionId,
        memberSeatStableKey: filing.seat.relationshipStableKey,
        familyKey: "broadband-access",
        variantKey: "unserved-buildout",
      });
      const measureId = filed.bill.measureId;
      let world = deserializeWorld(serializeWorld(filed.world));
      let committeeRoster: readonly string[] | null = null;
      let committeeVoteRoster: readonly string[] | null = null;
      let ownFloorVote = false;

      for (let turn = 0; turn < 20 && !ownFloorVote; turn += 1) {
        const step = availableMeasureSteps(world, measureId).find(
          (candidate) => candidate !== "offer-amendment",
        );
        if (!step)
          throw new Error(
            `No next step at ${measurePosition(world, measureId).phase}.`,
          );
        const resolved = resolveLegislativeAssignmentForMeasure(world, {
          measureId,
          playerPersonId: base.playerPersonId,
          memberSeatStableKey: filing.seat.relationshipStableKey,
        });
        if (resolved.kind !== "available") throw new Error(resolved.reason);
        expect(resolved.assignment.procedure.memberDecisions).toBeDefined();
        expect(institutionOwnsStep(world, resolved.assignment, step)).toBe(
          false,
        );

        const question = pendingChamberQuestions(world, measureId)[0];
        if (step === "move-committee-report") {
          expect(question?.question.purpose).toBe("committee-report");
          committeeRoster = question!.members.map((member) => member.memberKey);
        }
        if (step === "move-floor-vote") {
          expect(question?.question.purpose).toBe("floor-stage");
          const ahead = memberVotesAhead(world, base.playerPersonId).find(
            (entry) => entry.measure.id === measureId,
          );
          expect(ahead?.question).toEqual(question!.question);
          expect(ahead?.voteOn).toBeNull();
          world = castMemberBallot(world, {
            personId: base.playerPersonId,
            question: question!.question,
            ballot: "yea",
          });
          world = deserializeWorld(serializeWorld(world));
          expect(
            memberBallotOn(world, base.playerPersonId, question!.question),
          ).toBe("yea");
        }

        world = applyLegislativeCommand(world, resolved.assignment, {
          kind: "take-step",
          step,
        }).world;
        const vote = (world.history.legislativeVotes ?? []).find(
          (entry) =>
            entry.measureId === measureId &&
            entry.purpose ===
              (step === "move-committee-report"
                ? "committee-report"
                : "floor-stage"),
        );
        if (step === "move-committee-report")
          committeeVoteRoster =
            vote?.dispositions.map((entry) => entry.memberKey) ?? null;
        if (step === "move-floor-vote") {
          expect(
            vote?.dispositions.find(
              (entry) => entry.personId === base.playerPersonId,
            ),
          ).toMatchObject({ disposition: "yea", reason: "member:own-ballot" });
          ownFloorVote = true;
        }
      }

      expect(committeeVoteRoster).toEqual(committeeRoster);
      expect(ownFloorVote).toBe(true);
      assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
    },
    900_000,
  );
});
