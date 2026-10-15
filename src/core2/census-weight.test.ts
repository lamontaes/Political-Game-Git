/**
 * A town opens at its Census count (core-census-weight-model), in a random
 * place from all 56 jurisdictions: the town as the player gets it
 * (buildBenchWorld, two-level, every module). At most the target number of
 * people are generated as records; each counted household carries a weight,
 * so the full people plus the weighted counted members equal the place's
 * Census reference population, and a rule's reach over all groups is scaled
 * to it. A town at or below the target is unchanged: weight 1 throughout.
 * Seed from GOLDEN_PATH_SEED (random when unset), printed with the place.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { realLocalities } from "./places";
import { placePopulation, reachOf } from "./counted-reach";
import { residentsRuntime } from "./modules/residents";
import { parameter as p } from "./parameters";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/**
 * A place drawn from the seed among those whose Census count passes `keep`:
 * a jurisdiction first (every one that has such a place is equally likely),
 * then one of its localities.
 */
function drawn(label: string, keep: (people: number) => boolean) {
  const byState = new Map<
    string,
    ReturnType<typeof realLocalities>[number][]
  >();
  for (const row of realLocalities()) {
    const people = row.sourceGeoid
      ? placeReferencePopulation(row.sourceGeoid)?.value
      : undefined;
    if (people === undefined || !keep(people)) continue;
    const key = row.stateJurisdictionKey ?? "";
    byState.set(key, [...(byState.get(key) ?? []), row]);
  }
  const hash = createHash("sha256").update(`${seed}:${label}`).digest("hex");
  const states = [...byState.keys()].sort();
  const rows = byState.get(
    states[parseInt(hash.slice(0, 8), 16) % states.length]!,
  )!;
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows[parseInt(hash.slice(8, 16), 16) % rows.length]!;
}

describe("a town opens at its Census count", () => {
  for (const [label, big] of [
    ["above the target", true],
    ["at or below the target", false],
  ] as const)
    it(`${label}: the people add up to the Census count`, () => {
      setBookkeeping(false);
      const target = p("targetPopulation");
      const place = drawn(label, (n) => (big ? n > target : n <= target));
      const census = placeReferencePopulation(place.sourceGeoid!)!.value;
      const where = `${label}: place ${place.key} (${place.displayName}), census ${census}, seed ${seed}`;
      console.log(`census-weight: ${where}`);
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const rt = residentsRuntime(core)!;
      const weights = [...rt.store.liveHouseholds()].map((h) => h.weight);
      const people = placePopulation(core, world.placeId);
      if (big) {
        expect(Math.max(...weights), where).toBeGreaterThan(1);
        // Whole households, plus the few full people the world economy adds
        // after the counts are made: within half a percent of the count.
        expect(Math.abs(people - census) / census, where).toBeLessThan(0.005);
      } else {
        expect(new Set(weights), where).toEqual(new Set([1]));
        // Generated whole households land within a few percent of the count.
        expect(Math.abs(people - census) / census, where).toBeLessThan(0.05);
      }
      // A rule that reaches everyone reaches the same count, by group.
      const everyone = reachOf(core, world.placeId, {});
      expect(everyone.people, where).toBe(Math.round(people));
    }, 600_000);
});
