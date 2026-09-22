import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";

/**
 * The federal pack reaching a real new game, on the route a player starts.
 *
 * Loading a vocabulary is not the same as anyone knowing it. A subject is a
 * thing that can be known; the federal pack registers sixty of them and must
 * leave every person's knowledge exactly as it found it.
 */
// Not Kentucky: a very small town in Wyoming, a small city in Maine (a state
// with no legislature pack, running on the national range), a municipality
// in Puerto Rico, and Chicago.
const PLACES = [
  ["Ten Sleep, Wyoming", "5675790"],
  ["Eastport, Maine", "2321730"],
  ["Culebra, Puerto Rico", "7222589"],
  ["Chicago, Illinois", "1714000"],
] as const;

describe.each(PLACES)(
  "a new game in %s carrying the federal pack",
  (_name, placeKey) => {
    const { world } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `federal-pack-${placeKey}`,
    });

    const federalSubjectIds = world.policyCatalog.subjectOrder.filter((id) =>
      world.policyCatalog.subjects[id]!.stableKey.startsWith("us-federal:"),
    );

    it("holds the federal questions and subjects", () => {
      expect(federalSubjectIds.length).toBe(60);
      expect(
        world.policyCatalog.issueOrder.filter((id) =>
          world.policyCatalog.issues[id]!.stableKey.startsWith("us-federal:"),
        ).length,
      ).toBe(60);
    });

    it("gives nobody knowledge of a subject merely because it was registered", () => {
      const federal = new Set(federalSubjectIds);
      expect(
        world.history.subjectKnowledge.filter((record) =>
          federal.has(record.subjectId),
        ),
      ).toEqual([]);
    });

    it("survives Save and Continue with the catalogue intact", () => {
      const restored = deserializeWorld(serializeWorld(world));
      expect(restored.policyCatalog.subjectOrder).toEqual(
        world.policyCatalog.subjectOrder,
      );
      expect(restored.policyCatalog.issues).toEqual(world.policyCatalog.issues);
    });
  },
);
