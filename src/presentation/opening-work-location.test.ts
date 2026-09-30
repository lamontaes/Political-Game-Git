import { beforeAll, describe, expect, it } from "vitest";
import {
  activeWorkRelationshipsAt,
  recordWorldEvent,
  LEGACY_WORLD_OPENING_VERSION,
  serializeWorld,
  deserializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  onShiftAt,
  workSchedulesFor,
} from "../simulation/living-world/work-schedules";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import {
  openingWorkLocation,
  recordOpeningWorkLocation,
} from "./opening-work-location";
import { openingLifeLocation } from "./life-scene-flow";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { projectToday } from "./day-overview";

// These are the three distinct random place draws logged by the day-mount proof.
const places = ["3220700", "2537385", "3556810"];
describe.each(places)(
  "first morning schedule in %s",
  { timeout: 60_000 },
  (placeKey) => {
    let world: World;
    let viewer: EntityId;
    beforeAll(() => {
      const seed = `team5-opening-work:${placeKey}`;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey,
          startKind: "custom",
          startAge: 34,
          household: "shares-a-home",
        }),
      ).game!;
      world = game.world;
      viewer = game.playerPersonId;
      process.stdout.write(
        `first morning place=${placeKey} seed=${seed} reason=${openingWorkLocation(world, viewer)?.summary ?? "no current job"}\n`,
      );
    });

    it("the generated opening follows its own current job and shift", () => {
      const jobs = activeWorkRelationshipsAt(world, viewer);
      const shift = workSchedulesFor(world, viewer).find((schedule) =>
        onShiftAt(schedule, world.currentMoment),
      );
      const location = openingWorkLocation(world, viewer);
      if (jobs.length === 0) {
        expect(location).toBeNull();
        return;
      }
      expect(location).not.toBeNull();
      expect(location!.context.location!.setting).toBe(shift ? "work" : "home");
      expect(location!.participants.map((person) => person.personId)).toEqual([
        viewer,
      ]);
      expect(location!.context.choice).toBeNull();
      expect(projectToday(world, viewer).now).toBe(location!.summary);
      if (shift) {
        expect(location!.involvedEntityIds).toContain(shift.workRelationshipId);
        expect(projectToday(world, viewer).placeName).toBe(
          location!.context.location!.label,
        );
        const context = resolveOpeningPlaySceneContext(world, viewer);
        expect(context.purpose).toBe("activity");
        expect(context.locationKey).toBe("life-circumstance:covered-shift");
        expect(context.placeLabel).toBe(location!.context.location!.label);
        expect(context.presentPeople).toEqual([]);
      }
    });

    it("does not append twice, advance time, or invent coworker presence", () => {
      const before = serializeWorld(world);
      expect(recordOpeningWorkLocation(world, viewer)).toBe(world);
      expect(serializeWorld(world)).toBe(before);
      const location = openingWorkLocation(world, viewer);
      if (location)
        expect(location.tags).toContain(
          `moment:${JSON.stringify(world.currentMoment)}`,
        );
    });

    it("retains the actual location and reason after a save reload", () => {
      const reloaded = deserializeWorld(serializeWorld(world));
      expect(openingWorkLocation(reloaded, viewer)).toEqual(
        openingWorkLocation(world, viewer),
      );
      expect(openingLifeLocation(reloaded, viewer)).toEqual(
        openingLifeLocation(world, viewer),
      );
      expect(projectToday(reloaded, viewer)).toEqual(
        projectToday(world, viewer),
      );
    });

    it("cannot move another controlled person or an observer", () => {
      const observer = { ...world, control: { kind: "observer" as const } };
      expect(recordOpeningWorkLocation(observer, viewer)).toBe(observer);
      const other = world.personOrder.find((id) => id !== viewer)!;
      expect(recordOpeningWorkLocation(world, other)).toBe(world);
    });

    it("records the schedule reason for being home outside a shift", () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `team5-opening-work:${placeKey}`,
        placeKey,
        startKind: "custom",
        startAge: 34,
        household: "shares-a-home",
      });
      const input = {
        ...game.world,
        currentMoment: { ...game.world.currentMoment, minuteOfDay: 0 },
      };
      expect(
        activeWorkRelationshipsAt(input, game.playerPersonId).length,
      ).toBeGreaterThan(0);
      expect(
        workSchedulesFor(input, game.playerPersonId).some((schedule) =>
          onShiftAt(schedule, input.currentMoment),
        ),
      ).toBe(false);
      const placed = recordOpeningWorkLocation(input, game.playerPersonId);
      expect(openingWorkLocation(placed, game.playerPersonId)!.summary).toBe(
        "You are home; your work schedule has no shift at this hour.",
      );
      expect(placed.currentMoment).toEqual(input.currentMoment);
    });

    it("lets a later recorded arrival replace the opening location", () => {
      const later = recordWorldEvent(world, {
        type: "life.scene.arrived",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: world.people[viewer]!.homeJurisdictionId,
        involvedEntityIds: [viewer],
        participants: [
          {
            personId: viewer,
            role: "presence:participant",
            detail: "Later fixture arrival",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        stableKey: `team5:later-arrival:${viewer}`,
        tags: ["fixture:later-arrival"],
        summary: "You arrived home.",
        context: {
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
          location: {
            jurisdictionId: world.people[viewer]!.homeJurisdictionId,
            label: "Home",
            setting: "home",
          },
        },
      });
      expect(openingWorkLocation(later, viewer)).toBeNull();
      expect(openingLifeLocation(later, viewer)!.setting).toBe("home");
    });
  },
);

it("keeps the legacy opening's existing home placement", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "team5-opening-work:legacy",
      placeKey: places[0]!,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
      worldOpeningVersion: LEGACY_WORLD_OPENING_VERSION,
    }),
  ).game!;
  expect(openingWorkLocation(game.world, game.playerPersonId)).toBeNull();
  expect(openingLifeLocation(game.world, game.playerPersonId)!.setting).toBe(
    "home",
  );
});

it("preserves a current opening replay descriptor without the new placement version", () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      openingWorkLocationVersion: undefined,
      seed: "team5-opening-work:3220700",
      placeKey: places[0]!,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
  expect(openingWorkLocation(game.world, game.playerPersonId)).toBeNull();
  expect(openingLifeLocation(game.world, game.playerPersonId)!.setting).toBe(
    "home",
  );
});
