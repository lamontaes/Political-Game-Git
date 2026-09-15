import { describe, expect, it } from "vitest";

import {
  projectMeaningfulChanges,
  projectPublicMatters,
  serializeWorld,
  type World,
} from "../simulation";
import { currentKnownMatter } from "./current-matters";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectWorldRecap } from "./world-recap";

/** A life in an actual locality with its own local government. */
function lexingtonLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: "lexington-fayette",
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!;
}

/** A civilian pressing Week. */
function passWeeks(world: World, weeks: number): World {
  let current = world;
  for (let week = 0; week < weeks; week += 1)
    current = passOrdinaryDays(current, 7);
  return current;
}

const RANK = { major: 3, notable: 2, minor: 1 } as const;

/**
 * Twenty-six ordinary weeks of a real life take a few seconds alone and can
 * pass Vitest's 5 s default when other files run in parallel. The limit only
 * covers wall-clock time; every assertion stays as written.
 */
const LONG_RUN_TIMEOUT_MS = 30_000;

describe("recap over W3's public matters", () => {
  const life = lexingtonLife("alive43-l-recap-w3");
  const player = life.playerPersonId;

  it("does not present the matters a new life opens with as changes since it began", () => {
    const frontier = life.world.history.nextSequence;
    expect(projectWorldRecap(life.world, player, frontier)).toBeNull();
    // They are already public, so they can still be mentioned in talk.
    expect(projectPublicMatters(life.world).length).toBeGreaterThan(0);
    expect(currentKnownMatter(life.world, player)).not.toBeNull();
  });

  it(
    "over ordinary weeks, shows one entry per changed matter with its latest published stage and a count of its stages",
    () => {
      const frontier = life.world.history.nextSequence;
      const later = passWeeks(life.world, 26);
      const before = serializeWorld(later);
      const refs = projectMeaningfulChanges(later, player, frontier);
      const matters = new Set(refs.map((ref) => ref.matterId));
      expect(matters.size).toBeGreaterThanOrEqual(2);
      // Non-vacuous: at least one matter moved more than once since the
      // frontier, so grouping by matter is what makes the counts below hold.
      const stagesPerMatter = [...matters].map(
        (matterId) => refs.filter((ref) => ref.matterId === matterId).length,
      );
      expect(Math.max(...stagesPerMatter)).toBeGreaterThanOrEqual(2);

      const recap = projectWorldRecap(later, player, frontier, 50)!;
      const matterEntries = recap.entries.filter((entry) => entry.matterId);
      expect(new Set(matterEntries.map((entry) => entry.matterId)).size).toBe(
        matterEntries.length,
      );
      expect(matterEntries).toHaveLength(matters.size);
      for (const entry of matterEntries) {
        const stages = refs
          .filter((ref) => ref.matterId === entry.matterId)
          .sort((left, right) => left.sequence - right.sequence);
        const latest = stages.at(-1)!;
        expect(entry.eventId).toBe(latest.eventId);
        expect(entry.updates).toBe(stages.length);
        expect(entry.importance).toBe(latest.importance);
        expect(entry.inNews).toBe(true);
        expect(entry.headline).toBe(
          later.history.events.find((event) => event.id === latest.eventId)!
            .summary,
        );
      }
      expect(serializeWorld(later)).toBe(before);
    },
    LONG_RUN_TIMEOUT_MS,
  );

  it(
    "orders by importance first, then by how recently the matter changed",
    () => {
      const frontier = life.world.history.nextSequence;
      const later = passWeeks(life.world, 26);
      const recap = projectWorldRecap(later, player, frontier, 50)!;
      const ranked = recap.entries.map((entry) =>
        entry.importance ? RANK[entry.importance] : 0,
      );
      for (let index = 1; index < ranked.length; index += 1) {
        expect(ranked[index - 1]).toBeGreaterThanOrEqual(ranked[index]!);
        if (ranked[index - 1] === ranked[index])
          expect(recap.entries[index - 1]!.sequence).toBeGreaterThanOrEqual(
            recap.entries[index]!.sequence,
          );
      }
    },
    LONG_RUN_TIMEOUT_MS,
  );

  it("a caught-up player sees nothing until the next public stage", () => {
    const later = passWeeks(life.world, 5);
    expect(
      projectWorldRecap(later, player, later.history.nextSequence),
    ).toBeNull();
  });
});
