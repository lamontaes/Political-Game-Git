import { describe, expect, it } from "vitest";

import { currentGovernorOf, declareHazardEpisode } from "../simulation/crisis";
import { crisisRecords } from "../simulation/crisis/records";
import {
  disasterAssessment,
  pendingDisasterDecisions,
} from "../simulation/crisis/disaster";
import { householdLocationAt } from "../simulation/life-queries";
import { searchLifePlaces } from "../simulation/life-places";
import type { EntityId, World } from "../simulation/types";
import {
  crisisStopAfter,
  crisisStopBaseline,
  crisisStopStillOpen,
} from "./crisis-shell";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

/** A played governor of Maine and the floods that ask for a decision. */
describe(
  "a disaster request the played governor must answer",
  { timeout: 900_000 },
  () => {
    it("stops asking once the window has closed", () => {
      const opened = playedGovernorOfMaine("crisis-stop-lapse");
      let world = opened.world;
      const home = opened.home;

      let since = crisisStopBaseline(world);
      world = declareHazardEpisode(world, {
        stableKey: "maine-flood",
        family: "flood",
        magnitude: "major",
        stateUsps: "ME",
        jurisdictionIds: [home],
        durationDays: 2,
        basis: "Declared test episode; not a local hazard prediction.",
        sourceReference: null,
      });
      const stop = crisisStopAfter(world, since)!;
      expect(stop.sentence).toContain("request a federal disaster declaration");
      const episodeId = crisisRecords(world)
        .filter((record) => record.kind === "hazard-episode")
        .at(-1)!.id;
      const ours = () =>
        pendingDisasterDecisions(world).some(
          (pending) => pending.episodeId === episodeId,
        );
      expect(ours()).toBe(true);
      expect(crisisStopStillOpen(world, stop)).toBe(true);

      // Thirty weeks pass, one at a time, as a player running the clock would.
      let weeksOpen = 0;
      for (let week = 0; week < 30; week += 1) {
        since = crisisStopBaseline(world);
        world = passOrdinaryDays(world, 7);
        if (ours()) {
          weeksOpen += 1;
          expect(crisisStopStillOpen(world, stop)).toBe(true);
          continue;
        }
        expect(crisisStopStillOpen(world, stop)).toBe(false);
        expect(crisisStopAfter(world, since)?.decisionKeys ?? []).not.toContain(
          stop.decisionKeys[0],
        );
      }
      expect(weeksOpen).toBeGreaterThan(2);
      expect(
        crisisRecords(world).some(
          (record) =>
            record.kind === "disaster-response" &&
            record.episodeId === episodeId &&
            record.stage === "no-state-request",
        ),
      ).toBe(true);
    });

    it("does not ask about a flood that damaged nothing", () => {
      const { world: opened, home } = playedGovernorOfMaine(
        "crisis-stop-nothing",
      );
      const since = crisisStopBaseline(opened);
      let world = declareHazardEpisode(opened, {
        stableKey: "maine-quiet-flood",
        family: "flood",
        magnitude: "minor",
        stateUsps: "ME",
        jurisdictionIds: [home],
        durationDays: 2,
        basis: "Declared test episode; not a local hazard prediction.",
        sourceReference: null,
      });
      const episode = crisisRecords(world)
        .filter((record) => record.kind === "hazard-episode")
        .at(-1)!;
      const assessment = disasterAssessment(world, episode.id)!;
      const total = (counts: Readonly<Record<string, number>>) =>
        Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(total(assessment.damaged) + total(assessment.destroyed)).toBe(0);
      expect(crisisStopAfter(world, since)).toBeNull();
      expect(pendingDisasterDecisions(world)).toEqual([]);

      world = passOrdinaryDays(world, 7);
      const response = crisisRecords(world).find(
        (record) =>
          record.kind === "disaster-response" &&
          record.episodeId === episode.id &&
          record.stage === "no-state-request",
      );
      expect(response).toMatchObject({
        decidedBy: "institution",
        actorPersonId: null,
      });
    });
  },
);

/** A new life in Maine whose player is switched to the state's governor. */
function playedGovernorOfMaine(seed: string): {
  readonly world: World;
  readonly home: EntityId;
} {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-ME",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const governor = currentGovernorOf(game.world, "ME")!;
  const world: World = {
    ...game.world,
    control: { kind: "person", personId: governor.personId },
  };
  const home = householdLocationAt(
    world,
    world.history.households[0]!.id,
  )!.jurisdictionId;
  return { world, home };
}
