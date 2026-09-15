import { describe, expect, it } from "vitest";

import { serializeWorld } from "../simulation";
import { stateNameForUsps } from "../player/useWorldOrientation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { projectOrientationView } from "./world-orientation";
import { projectWorldOrientation } from "./world-orientation-contract";

function newLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      givenName: "Maya",
      familyName: "Reed",
    }),
  ).game!;
}

describe("world orientation over W1's saved projection", () => {
  it("shows the Congress the saved World holds, with counts that reconcile to its seats", () => {
    const { world, playerPersonId } = newLife("orientation-live-a");
    const orientation = projectWorldOrientation(world, playerPersonId);
    const view = projectOrientationView(orientation, stateNameForUsps);
    const congress = view.steps.find((step) => step.key === "congress")!;
    const byKey = new Map(
      congress.chambers.map((chamber) => [chamber.chamberKey, chamber]),
    );
    expect(byKey.get("us-house")!.seats).toBe(435);
    expect(byKey.get("us-senate")!.seats).toBe(100);
    for (const chamber of congress.chambers) {
      expect(chamber.members + chamber.vacancies + chamber.unrecorded).toBe(
        chamber.seats,
      );
      expect(
        chamber.parties.reduce((sum, entry) => sum + entry.members, 0),
      ).toBe(chamber.members);
      expect(chamber.roster).toHaveLength(chamber.seats);
      for (const row of chamber.roster) {
        if (row.person) expect(world.people[row.person.personId]).toBeDefined();
      }
    }
    // Every seat label names a real state, not a bare code.
    for (const row of byKey.get("us-senate")!.roster) {
      expect(row.seatLabel).not.toMatch(/^[A-Z]{2}$/);
    }
  });

  it("names the saved executives and date, and reads without writing", () => {
    const { world, playerPersonId } = newLife("orientation-live-b");
    const before = serializeWorld(world);
    const first = projectOrientationView(
      projectWorldOrientation(world, playerPersonId),
      stateNameForUsps,
    );
    const again = projectOrientationView(
      projectWorldOrientation(world, playerPersonId),
      stateNameForUsps,
    );
    expect(again).toEqual(first);
    expect(serializeWorld(world)).toBe(before);
    const president = first.steps[0]!.people.find((person) =>
      person.title.includes("President"),
    )!;
    expect(world.people[president.personId]).toBeDefined();
    expect(first.dateLabel).not.toBe("January 1, 2026");
  });

  it("two independent lives get their own saved people", () => {
    const a = newLife("orientation-live-c");
    const b = newLife("orientation-live-d");
    const presidentOf = (game: ReturnType<typeof newLife>) =>
      projectWorldOrientation(game.world, game.playerPersonId).executive.find(
        (holder) => holder.officeKey === "us-president",
      )!;
    expect(a.world.people[presidentOf(a).personId]).toBeDefined();
    expect(b.world.people[presidentOf(b).personId]).toBeDefined();
    expect(a.world.people[presidentOf(b).personId]).toBeUndefined();
  });

  it("a world opened before W1 shows no Congress and invents none", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "orientation-pre-w1",
      startAge: 34,
      givenName: "Maya",
      familyName: "Reed",
    });
    const legacy = establishOpeningOfficeholders(
      game.world,
      game.playerPersonId,
    );
    const view = projectOrientationView(
      projectWorldOrientation(legacy, game.playerPersonId),
      stateNameForUsps,
    );
    const congress = view.steps.find((step) => step.key === "congress")!;
    expect(congress.chambers).toEqual([]);
    expect(congress.summary).toBe(
      "This life's records do not include the membership of Congress.",
    );
  });
});
