import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { scheduledActivityState } from "../simulation";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { playerTown } from "../simulation/living-world/town-residents";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { submitTimeCommand } from "./time-command";
import {
  composeCouncilMeetingLines,
  composeCouncilMeetingMinutes,
} from "./meeting-summary";
import { projectWorld39Journal } from "./world39-journal";

describe("a generated council meeting's quiet-item summaries", () => {
  it(
    "gives every item one grounded Journal and minutes line with its tally and the player's vote",
    { timeout: 60_000 },
    () => {
      const seed = "meeting-summary:generated";
      const place = drawRandomPlace(
        seed,
        (candidate) =>
          candidate.scope === "locality" && Boolean(candidate.sourceGeoid),
      );
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey: place.key,
          seed,
          startKind: "custom",
          startAge: 35,
          household: "shares-a-home",
        }),
      ).game!;
      let world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
      const town = playerTown(world, game.playerPersonId)!;
      const activity = world.history.scheduledActivities.find(
        (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
      )!;
      for (const requestId of ["enter", "stay"])
        world = submitTimeCommand(world, {
          requestId: `summary-${requestId}`,
          personId: game.playerPersonId,
          sourceMoment: world.currentMoment,
          command: { kind: "attend-activity", activityId: activity.id },
        }).world;
      expect(scheduledActivityState(world, activity.id).status).toBe(
        "completed",
      );

      const event = world.history.events.find(
        (row) =>
          row.type === "local.council-meeting-held" &&
          row.jurisdictionId === town,
      )!;
      const votes = (world.history.legislativeVotes ?? []).filter(
        (vote) =>
          event.involvedEntityIds.includes(vote.measureId) &&
          vote.votedAt === event.occurredAt,
      );
      expect(votes.length).toBeGreaterThan(0);
      const player = votes
        .flatMap((vote) => vote.dispositions)
        .find((row) => row.personId)?.personId;
      expect(player).toBeTruthy();
      if (!player) throw new Error("The generated roll call has no member.");
      const journalLines = composeCouncilMeetingLines(
        world,
        event,
        player,
        "journal",
      );
      const minutesLines = composeCouncilMeetingMinutes(world, event, player);

      for (const lines of [journalLines, minutesLines]) {
        expect(lines).toHaveLength(votes.length);
        for (const [index, line] of lines.entries()) {
          const vote = votes[index]!;
          const measure = world.history.legislativeMeasures!.find(
            (row) => row.id === vote.measureId,
          )!;
          expect(line.text).toContain(measure.summary);
          expect(line.text).toContain(`${vote.tally.yea}-${vote.tally.nay}`);
          expect(line.text).toMatch(
            /you voted (yes|no)|you were (present|absent|excused)|you did not cast a vote/,
          );
          expect(line.parts).toHaveLength(1);
          expect(line.parts[0]!.partKey).toContain("council-meeting-summary");
          expect(line.text).not.toBe(event.summary);
          expect(line.text).not.toBe(measure.summary);
        }
      }

      const journal = projectWorld39Journal(world, player);
      for (const line of journalLines)
        expect(journal.entries.map((entry) => entry.text)).toContain(line.text);
    },
  );
});
