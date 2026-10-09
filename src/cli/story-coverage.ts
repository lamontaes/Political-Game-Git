import { readFileSync } from "node:fs";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { situationVoiced } from "../presentation/situation-scene";
import { deserializeWorld } from "../simulation";
import { stableHash } from "../simulation/ids";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../simulation/life-opportunities";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { sceneBindingsFor } from "../simulation/scene-bindings";
import { recordStoryMoments } from "../simulation/story/moments";
import {
  scheduleStoryScenes,
  storyCoverage,
} from "../simulation/story/scheduling";
import type { World } from "../simulation/types";

/**
 * Totals the story director's coverage log (docs/design/story-director.md,
 * part 7): the moments that matter but could not become a scene, by reason
 * and moment kind, and the bound scenes the English engine cannot word yet.
 * A developer tool; nothing here reaches a player.
 *
 * Usage:
 *   npm run story:coverage -- <saved world .json>
 *   npm run story:coverage -- --seed <seed> --age <years> [--days <n>]
 *
 * With a seed, a new game is built in a place drawn from all 56 by the seed's
 * hash and advanced the given number of days (7 by default).
 */

export interface StoryCoverageReport {
  /** Logged moments, by reason and kind, most frequent first. */
  readonly logged: readonly {
    readonly reason: string;
    readonly kindKey: string;
    readonly count: number;
  }[];
  /** Bound scenes the English engine cannot word yet, by type. */
  readonly englishMissing: readonly {
    readonly typeKey: string;
    readonly count: number;
  }[];
  /** Situation scenes bound for the person being played. */
  readonly scenes: number;
}

function counted<T extends string>(
  keys: readonly T[],
): readonly (readonly [T, number])[] {
  const counts = new Map<T, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
}

export function storyCoverageReport(world: World): StoryCoverageReport {
  const logged = counted(
    storyCoverage(world).map((row) => `${row.reason}\t${row.kindKey}`),
  ).map(([key, count]) => {
    const [reason, kindKey] = key.split("\t") as [string, string];
    return { reason, kindKey, count };
  });
  const bound =
    world.control.kind === "person"
      ? sceneBindingsFor(world, world.control.personId, "situation")
      : [];
  const englishMissing = counted(
    bound
      .filter((entry) => !situationVoiced(world, entry))
      .map((entry) => entry.binding.variant),
  ).map(([typeKey, count]) => ({ typeKey, count }));
  return { logged, englishMissing, scenes: bound.length };
}

function seededWorld(seed: string, age: number, days: number): World {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: age,
    placeKey: place.key,
  });
  const personId = game.playerPersonId;
  const passed = passOrdinaryDays(
    refreshLifeOpportunities(
      openOrdinaryLifeRecords(game.world, personId),
      personId,
    ),
    days,
  );
  // The clock schedules each day as it ends; the last day is read here.
  return scheduleStoryScenes(
    recordStoryMoments(passed),
    passed.history.nextSequence,
  );
}

function worldFromArguments(argv: readonly string[]): World {
  const flag = (name: string) => {
    const index = argv.indexOf(name);
    return index === -1 ? null : (argv[index + 1] ?? null);
  };
  const seed = flag("--seed");
  if (seed)
    return seededWorld(
      seed,
      Number(flag("--age") ?? DEFAULT_NEW_GAME_SETUP.startAge),
      Number(flag("--days") ?? 7),
    );
  const path = argv.find((arg) => !arg.startsWith("--"));
  if (!path)
    throw new Error(
      "Name a saved world file, or --seed <seed> --age <years> [--days <n>].",
    );
  return deserializeWorld(readFileSync(path, "utf8"));
}

function main(argv: readonly string[]): void {
  const world = worldFromArguments(argv);
  const report = storyCoverageReport(world);
  console.log(`Coverage for ${world.id} on ${world.currentDate}`);
  console.log(`Situation scenes bound for the person played: ${report.scenes}`);
  console.log("\nLogged moments, by reason and kind:");
  if (report.logged.length === 0) console.log("  none");
  for (const row of report.logged)
    console.log(`  ${row.count}\t${row.reason}\t${row.kindKey}`);
  console.log("\nBound scenes the English engine cannot word yet, by type:");
  if (report.englishMissing.length === 0) console.log("  none");
  for (const row of report.englishMissing)
    console.log(`  ${row.count}\tenglish-missing\t${row.typeKey}`);
}

if (process.argv[1]?.endsWith("story-coverage.ts")) main(process.argv.slice(2));
