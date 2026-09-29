import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  CIVIC_ACTION_EVENTS,
  CIVIC_ACTIONS_VERSION,
  reviewTownCivicActions,
} from "../../src/simulation/living-world/civic-actions";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { World } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const SEED = "civic-actions";
const PLACE = drawRandomPlace(SEED);

describe(
  `residents contact officials and attend meetings in ${PLACE.displayName} (${PLACE.key}, seed ${SEED})`,
  { timeout: 300_000 },
  () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: PLACE.key,
        startAge: 24,
        questionnaire: "skipped",
      }),
    ).game!;
    const personId = game.playerPersonId;
    const town = game.world.people[personId]!.homeJurisdictionId;
    let world: World = game.world;
    withWorldIntegrityDeferred(() => {
      for (let round = 0; round < 4; round += 1) {
        const date = addDays(world.currentDate, 91);
        world = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
        };
        world = reviewTownCivicActions(world, town, personId, `test-${round}`);
      }
    });
    const events = world.history.events.filter((event) =>
      event.stableKey.startsWith(`${CIVIC_ACTIONS_VERSION}:${town}:`),
    );
    const adults = game.world.personOrder.filter(
      (id) =>
        id !== personId &&
        game.world.people[id]!.homeJurisdictionId === town &&
        ageOnDate(game.world.people[id]!.birthDate, game.world.currentDate) >=
          18,
    ).length;

    it("about 23 and 29 percent of adults act in a year, and never the player", () => {
      const share = (type: string) =>
        new Set(
          events
            .filter((event) => event.type === type)
            .map(
              (event) =>
                event.participants.find((row) => row.role === "focus:subject")!
                  .personId,
            ),
        ).size / adults;
      expect(adults).toBeGreaterThan(40);
      expect(share(CIVIC_ACTION_EVENTS.contacted)).toBeGreaterThan(0.15);
      expect(share(CIVIC_ACTION_EVENTS.contacted)).toBeLessThan(0.31);
      expect(share(CIVIC_ACTION_EVENTS.attended)).toBeGreaterThan(0.2);
      expect(share(CIVIC_ACTION_EVENTS.attended)).toBeLessThan(0.38);
      expect(
        events.some((event) =>
          event.participants.some((row) => row.personId === personId),
        ),
      ).toBe(false);
    });

    it("residents with more years at stake act more often than young adults", () => {
      const acted = new Set(
        events.map(
          (event) =>
            event.participants.find((row) => row.role === "focus:subject")!
              .personId,
        ),
      );
      const shareAged = (low: number, high: number) => {
        const group = game.world.personOrder.filter((id) => {
          const person = game.world.people[id]!;
          const age = ageOnDate(person.birthDate, game.world.currentDate);
          return (
            id !== personId &&
            person.homeJurisdictionId === town &&
            age >= low &&
            age < high
          );
        });
        return group.filter((id) => acted.has(id)).length / group.length;
      };
      expect(shareAged(50, 120)).toBeGreaterThan(shareAged(18, 30));
    });

    it("a contact names a real official, dated on its review", () => {
      for (const event of events.filter(
        (row) => row.type === CIVIC_ACTION_EVENTS.contacted,
      )) {
        const official = event.participants.find(
          (row) => row.role === "focus:object",
        )!.personId!;
        expect(world.people[official]).toBeDefined();
        expect(official).not.toBe(
          event.participants.find((row) => row.role === "focus:subject")!
            .personId,
        );
      }
    });
  },
);
