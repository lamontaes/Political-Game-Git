import { describe, expect, it } from "vitest";

import { currentGovernorOf, declareHazardEpisode } from "../simulation/crisis";
import { crisisRecords } from "../simulation/crisis/records";
import { pendingDisasterDecisions } from "../simulation/crisis/disaster";
import { householdLocationAt } from "../simulation/life-queries";
import { searchLifePlaces } from "../simulation/life-places";
import type { World } from "../simulation/types";
import {
  crisisStopAfter,
  crisisStopBaseline,
  crisisStopStillOpen,
} from "./crisis-shell";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";

/** A played governor of Maine who never answers a flood's request window. */
describe(
  "a disaster request the governor lets lapse",
  { timeout: 900_000 },
  () => {
    it("stops asking once the window has closed", () => {
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: "US-ME",
        scope: "locality",
      })[0]!;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "crisis-stop-lapse",
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const governor = currentGovernorOf(game.world, "ME")!;
      let world: World = {
        ...game.world,
        control: { kind: "person", personId: governor.personId },
      };
      const home = householdLocationAt(
        world,
        world.history.households[0]!.id,
      )!.jurisdictionId;

      let since = crisisStopBaseline(world);
      world = declareHazardEpisode(world, {
        stableKey: "maine-flood",
        family: "flood",
        magnitude: "minor",
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
  },
);
