import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  acceptCampaignLifeActivity,
  offerCampaignLifeActivity,
  projectCampaignLifeActivities,
  recordCampaignLifeAttendance,
} from "../simulation/campaign-life-activities";
import {
  activeCampaignForCandidate,
  campaignLifeActivityRecords,
} from "../simulation/campaign-queries";
import { officeBodyJurisdiction } from "../simulation/campaign-stands";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  addDays,
  allUndertakings,
  compareSimulationMoments,
  assessUndertaking,
  introduceMeasure,
  performScheduledActivity,
  scheduledActivityState,
  simulationMomentAtLocalTime,
} from "../simulation";
import { requireElectionContest } from "../simulation/election-contests";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { homePartyChapters } from "../simulation/living-world/party-chapters";
import { nextMeasureNumbering } from "../simulation/measure-numbering";
import type { EntityId, IsoDate, World } from "../simulation";
import { refreshContextualScenes } from "./contextual-scene-producers";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectPlayerConversation } from "./player-conversation";
import { declineVenueActivity } from "./scheduled-activity-choice";
import { commitConversationTurn } from "./run-b-conversation";

/**
 * Build 22, step 3, through the campaign's own town hall: a person who was
 * there asks where the candidate stands on a bill still in play, and a yes or
 * no becomes a public pledge. The place is Ten Sleep,
 * Wyoming.
 */

const REGISTRY = createCampaignElectionTransitionRegistry();

/**
 * Lives the calendar up to and through a hold the way a player does, as the
 * campaign activity tests do: optional holds in the way are declined, earlier
 * commitments are kept, the journey is taken and then the activity itself.
 */
function liveThrough(world: World, personId: EntityId, holdId: EntityId) {
  let next = world;
  for (let guard = 0; guard < 80; guard += 1) {
    if (scheduledActivityState(next, holdId).status !== "scheduled")
      return next;
    const journey = next.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "travel" &&
        activity.sourceEntityIds.includes(holdId) &&
        scheduledActivityState(next, activity.id).status === "scheduled",
    );
    const targetId = journey?.id ?? holdId;
    const performed = performScheduledActivity(next, targetId, REGISTRY);
    if (performed !== next) {
      next = performed;
      continue;
    }
    const blocker = next.history.scheduledActivities
      .filter(
        (activity) =>
          activity.id !== holdId &&
          activity.id !== journey?.id &&
          activity.responsiblePersonId === personId &&
          scheduledActivityState(next, activity.id).status === "scheduled" &&
          compareSimulationMoments(
            scheduledActivityState(next, activity.id).start,
            scheduledActivityState(next, targetId).start,
          ) < 0,
      )
      .sort((a, b) =>
        compareSimulationMoments(
          scheduledActivityState(next, a.id).start,
          scheduledActivityState(next, b.id).start,
        ),
      )[0];
    if (!blocker) throw new Error("Nothing performable before the hold.");
    if (blocker.kind === "tentative") {
      next = declineVenueActivity(next, personId, blocker.id);
    } else if (blocker.kind === "travel") {
      const destination = next.history.scheduledActivities.find((a) =>
        blocker.sourceEntityIds.includes(a.id),
      );
      next =
        destination?.kind === "tentative"
          ? declineVenueActivity(next, personId, destination.id)
          : performScheduledActivity(next, blocker.id, REGISTRY);
    } else {
      next = performScheduledActivity(next, blocker.id, REGISTRY);
    }
  }
  throw new Error("The hold was never reached.");
}

/**
 * A new life in Ten Sleep, Wyoming, filed for the state House, attends a
 * town hall the local party chapter hosts. With `withBill`, a bill on one of
 * the world's own policy questions is first filed in the Wyoming legislature;
 * the bill is authored for the test and names no real bill.
 */
function candidateAtATownHall(withBill: boolean) {
  const life = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-hall-stand",
      startAge: 34,
      placeKey: "5675790",
    }),
  ).game!;
  const candidate = life.playerPersonId;
  let world = fileForOffice(life.world, candidate);
  const campaign = activeCampaignForCandidate(world, candidate)!;
  const contest = requireElectionContest(world, campaign.contestId);
  const propositionId = world.policyCatalog.propositionOrder[0]!;
  if (withBill) {
    const state = officeBodyJurisdiction(world, contest)!;
    const pack = legislativePackForJurisdiction(state)!;
    const originChamber = pack.chambers[0]!;
    world = introduceMeasure(world, {
      stableKey: "town-hall-stand:bill",
      jurisdictionId: state,
      rulePackId: pack.packId,
      ...nextMeasureNumbering(world, {
        jurisdictionId: state,
        originChamber,
        rulePackId: pack.packId,
      }),
      shortTitle: "A bill for the test",
      summary: "Written to exercise a town hall question.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: originChamber.chamberKey,
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    });
  }
  const chapter = homePartyChapters(world)[0]!;
  world = offerCampaignLifeActivity(world, {
    form: "town-hall",
    hostOrganizationId: chapter.organizationId,
    hostPersonId: chapter.organizerPersonId!,
    subjectPersonId: candidate,
    campaignId: null,
    origin: "host-outreach",
    start: simulationMomentAtLocalTime({
      date: addDays(world.currentDate, 1) as IsoDate,
      minuteOfDay: 18 * 60 + 30,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    }),
    stableKey: "town-hall-stand:town-hall",
  });
  const record = campaignLifeActivityRecords(world).at(-1)!;
  world = acceptCampaignLifeActivity(world, candidate, record.id);
  const hold = projectCampaignLifeActivities(world, candidate).find(
    (row) => row.lifeActivityId === record.id,
  )!.scheduledActivityId;
  world = liveThrough(world, candidate, hold);
  world = recordCampaignLifeAttendance(world, candidate, hold, "attended");
  return {
    world: refreshContextualScenes(world, candidate),
    candidate,
    propositionId,
  };
}

describe("A question at the campaign's town hall", { timeout: 60_000 }, () => {
  it("asks about a bill still in play and keeps the answer as a pledge", () => {
    const { world, candidate, propositionId } = candidateAtATownHall(true);
    const bill = world.history.legislativeMeasures!.at(-1)!.designation;
    const view = projectPlayerConversation(world, candidate, "scene-town-hall");
    expect(view, "somebody at the town hall should ask").not.toBeNull();
    expect(view!.briefing).toContain(
      `asked where you stand on ${bill}, A bill for the test`,
    );
    expect(view!.openingLine).toMatch(new RegExp(bill));
    expect(view!.intents.map((intent) => intent.key)).toEqual([
      "vote-for",
      "vote-against",
      "not-decided",
      "ask-what-it-does",
    ]);
    const answered = commitConversationTurn(world, {
      session: view!.session,
      room: view!.room,
      progress: view!.progress,
      turnOrdinal: view!.turnOrdinal,
      addressee: view!.addressee,
      audibility: view!.audibility,
      intent: "vote-for",
    }).world;
    const pledge = answered.history.campaignCommitments.at(-1)!;
    expect(pledge).toMatchObject({
      personId: candidate,
      propositionId,
      stance: "support",
      level: "pledge",
      statement: `I’d vote for ${bill}.`,
    });
    const promise = allUndertakings(answered).find(
      (entry) => entry.source.recordId === pledge.id,
    )!;
    expect(promise.audience).toBe("public");
    expect(assessUndertaking(answered, promise).standing).toBe("outstanding");
  });

  it("asks nothing when no bill is in play", () => {
    const { world, candidate } = candidateAtATownHall(false);
    expect(
      projectPlayerConversation(world, candidate, "scene-town-hall"),
    ).toBeNull();
  });
});
