import { describe, expect, it } from "vitest";

import { scheduledActivityState } from "../simulation";
import { governmentUnitsForState } from "../simulation/government-units";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import {
  LOCAL_COUNCIL_MEETING,
  postedMeetingOrdinanceKey,
  postedMeetingVote,
} from "../simulation/living-world/local-council-meetings";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { playerTown } from "../simulation/living-world/town-residents";
import { assertRulePackIntegrity } from "../simulation/legislature-rules";
import { rulePackById } from "../simulation/legislature-rule-packs";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { STATES } from "../simulation/state-reference";
import {
  townCouncilProfilePack,
  townCouncilProfilePackId,
} from "../simulation/town-council-profile";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectOrdinaryMeetingScene } from "./ordinary-meeting-scene";
import { submitTimeCommand } from "./time-command";

/**
 * Lane C step 4: the town council meets and votes. The public meeting the
 * opening posts is the council's meeting, and it ends with a roll call on its
 * agenda item; after that the council meets every two weeks.
 */

const FIFTY_STATES = Object.keys(STATES).filter(
  (usps) =>
    usps.length === 2 && !["DC", "PR", "GU", "VI", "AS", "MP"].includes(usps),
);

describe("the town council profile, in every state", () => {
  for (const usps of FIFTY_STATES) {
    it(`${usps}: a town council plays under a whole, labeled pack`, () => {
      const unit = governmentUnitsForState(usps).find(
        (candidate) =>
          candidate.unitType === "municipality" && candidate.functionalActive,
      )!;
      const pack = townCouncilProfilePack(unit)!;
      expect(pack, usps).not.toBeNull();
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
      expect(pack.basis).toBe("game-profile");
      // A saved ordinance resolves its pack from the id alone.
      expect(rulePackById(townCouncilProfilePackId(unit)).packId).toBe(
        pack.packId,
      );
    });
  }
});

// Opens a whole life and holds a council meeting whose members decide
// through the vote engine: several seconds of real work.
describe(
  "the posted public meeting ends with the council's vote",
  { timeout: 60_000 },
  () => {
    it("records the roll call and shows it when the meeting ends", () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: "2805140",
          seed: "council-vote:belzoni",
          startKind: "custom",
          startAge: 34,
          household: "shares-a-home",
        }),
      ).game!;
      const personId = game.playerPersonId;
      let world = openOrdinaryLifeRecords(game.world, personId);
      const town = playerTown(world, personId)!;
      const ordinance = world.history.legislativeMeasures!.find(
        (measure) => measure.stableKey === postedMeetingOrdinanceKey(town),
      )!;
      expect(ordinance.designation).toBe("ORD 1");
      expect(ordinance.originChamberKey).toBe("council");
      expect(
        world.history.futureDueItems.some(
          (item) =>
            item.transitionKey === LOCAL_COUNCIL_MEETING &&
            item.stableKey.includes(":posted-meeting:"),
        ),
      ).toBe(true);

      const activity = world.history.scheduledActivities.find(
        (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
      )!;
      const command = {
        kind: "attend-activity" as const,
        activityId: activity.id,
      };
      for (const requestId of ["enter", "stay"]) {
        world = submitTimeCommand(world, {
          requestId,
          personId,
          sourceMoment: world.currentMoment,
          command,
        }).world;
      }
      expect(scheduledActivityState(world, activity.id).status).toBe(
        "completed",
      );
      const found = postedMeetingVote(world, town)!;
      expect(found).not.toBeNull();
      const unit = homeLocalGovernmentUnits(world, personId).municipal[0]!;
      const members = sittingLocalOfficers(world, unit).filter(
        (seat) => !seat.mayor,
      );
      expect(found.vote.dispositions).toHaveLength(members.length);
      // Every member answers: yes, no, or present when they have no reason
      // either way (the vote engine leans no member yes by default).
      expect(
        found.vote.tally.yea +
          found.vote.tally.nay +
          found.vote.tally.presentNotVoting,
      ).toBe(members.length);
      const scene = projectOrdinaryMeetingScene(world, personId)!;
      expect(scene.phase).toBe("immediate-aftermath");
      expect(scene.caption).toContain(
        `voted ${found.vote.tally.yea}-${found.vote.tally.nay}`,
      );
      expect(scene.caption).not.toContain("without a vote");
      // The chair is one of the town's own officers.
      expect(
        sittingLocalOfficers(world, unit).map((seat) => seat.personId),
      ).toContain(scene.actors[0]!.personId);
    });
  },
);

describe("the council keeps meeting", () => {
  it(
    "introduces ordinances and votes on them every two weeks",
    { timeout: 300_000 },
    () => {
      const opened = openObserverWorld(observerSetup("round-1", "2805140"));
      let world = opened.world;
      const town = playerTown(world, opened.anchorPersonId)!;
      world = advanceObservedWorld(world, 90);
      const measures = (world.history.legislativeMeasures ?? []).filter(
        (measure) =>
          measure.jurisdictionId === town &&
          measure.originChamberKey === "council",
      );
      const ids = new Set(measures.map((measure) => measure.id));
      const votes = (world.history.legislativeVotes ?? []).filter((vote) =>
        ids.has(vote.measureId),
      );
      // Six meetings in ninety days; members file what their own principles
      // press them to, at most one ordinance each per meeting.
      expect(measures.length).toBeGreaterThanOrEqual(5);
      expect(votes.length).toBeGreaterThanOrEqual(4);
      expect(
        measures.map((measure) => measure.designation).slice(0, 3),
      ).toEqual(["ORD 1", "ORD 2", "ORD 3"]);
      const enacted = (world.history.legislativeEnactments ?? []).filter(
        (row) => ids.has(row.measureId),
      );
      const passed = votes.filter((vote) => vote.outcome === "passed");
      expect(enacted.length).toBe(passed.length);
      expect(
        world.history.events.filter(
          (event) => event.type === "local.council-meeting-held",
        ).length,
      ).toBeGreaterThanOrEqual(6);
    },
  );
});
