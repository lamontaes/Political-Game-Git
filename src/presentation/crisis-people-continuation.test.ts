import { describe, expect, it } from "vitest";
import {
  beginHealthEpisode,
  crisisPersonDeathNotices,
  crisisProtectedDecisions,
  deserializeWorld,
  mortalityExposureStarts,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  continueAs,
  observeWorld,
  projectLifeContinuation,
} from "./people-continuation";

const SLOW = 1_800_000;

function frailPlayer(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
  const player = game.playerPersonId;
  // A real player's world has an opened ordinary life with player-required work.
  const opened = openOrdinaryLife(game.world, player);
  const world = beginHealthEpisode(opened, {
    stableKey: "proof-frail",
    personId: player,
    severity: "chronic",
    initialLimitation: "none",
    origin: { kind: "authored", note: "Connected-route proof episode." },
    causalParentIds: [],
    hazard: {
      micros: 400_000_000,
      basis: "Proof fixture only; not clinical data.",
    },
  });
  return { world, player };
}

function untilDeath(world: World, player: EntityId, step: number) {
  let current = world;
  for (let days = 0; days < 1_100; days += step) {
    current = passOrdinaryDays(current, step);
    if (current.history.personDeaths.some((d) => d.personId === player))
      return current;
  }
  throw new Error("The controlled person did not die in the proof window.");
}

describe("CRISIS → PEOPLE multi-generation handshake", () => {
  it(
    "hands a controlled death to PEOPLE continuation and keeps the world running",
    () => {
      const { world, player } = frailPlayer("crisis-people-proof");
      const before = world.history.nextSequence;
      const died = untilDeath(world, player, 30);
      const death = died.history.personDeaths.find(
        (d) => d.personId === player,
      )!;
      expect(death.causeKey).toBe("crisis-mortality:all-cause-unresolved");
      // Partition invariance of the death day.
      const other = untilDeath(world, player, 7);
      expect(
        other.history.personDeaths.find((d) => d.personId === player)!.diedAt,
      ).toBe(death.diedAt);
      // CRISIS leaves control alone and signals the protected stop.
      expect(died.control).toEqual({ kind: "person", personId: player });
      expect(
        crisisProtectedDecisions(died, before - 1).map((d) => d.kind),
      ).toContain("controlled-person-died");
      expect(
        crisisPersonDeathNotices(died).find((n) => n.personId === player)
          ?.controlledPerson,
      ).toBe(true);
      // PEOPLE sees the same death and offers what can follow.
      const view = projectLifeContinuation(died, player)!;
      expect(view.ended).toBe("death");
      const reopened = deserializeWorld(serializeWorld(died));
      expect(projectLifeContinuation(reopened, player)).toEqual(view);
      const now = view.choices.find((choice) => choice.availableNow);
      const next = now
        ? continueAs(reopened, player, now.personId)
        : observeWorld(reopened, player);
      if (now) {
        expect(next.control).toEqual({
          kind: "person",
          personId: now.personId,
        });
        expect(mortalityExposureStarts(next).has(now.personId)).toBe(true);
      }
      // Time keeps running for the next generation (or the observer).
      const later = passOrdinaryDays(next, 60);
      expect(later.currentDate > next.currentDate).toBe(true);
      expect(
        later.history.personDeaths.filter((d) => d.personId === player),
      ).toHaveLength(1);
      deserializeWorld(serializeWorld(later));
    },
    SLOW,
  );
});
