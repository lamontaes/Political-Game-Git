/**
 * Shared pieces of the `*.traits.test.ts` files: a played world of a place
 * drawn from all 56, and the audit's own measure of what personality does to
 * a two-way decision: the pick rate of the third of people leaning most toward
 * an option against the third leaning least, net of the same gap with
 * personality wiped flat (`scripts/traits/trait-calibrate.ts`).
 *
 * Setting TRAIT_TEST_WEIGHTS_ZERO=1 zeroes every decision's trait weight in
 * the built world, which is how a test is shown to fail when personality is
 * flat.
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { forgetTraitLeans } from "../../src/core2/choice";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { decisionLean } from "../../src/core2/trait-decisions";
import type { CoreState, PersonState } from "../../src/core2/types";
import { drawPlace } from "../golden-path/place";

export const seed =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

export function playedWorld(label: string) {
  const place = drawPlace(seed, label);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  if (process.env.TRAIT_TEST_WEIGHTS_ZERO) {
    const rows = core.data.parameters as unknown as Record<
      string,
      { value: number }
    >;
    for (const key of Object.keys(rows))
      if (key.startsWith("traitWeight") && rows[key])
        rows[key] = { ...rows[key], value: 0 };
  }
  return {
    world,
    core,
    api: coreAPI(core),
    place,
    where: `${place.name} (${place.key}), seed ${seed}`,
  };
}

/** The adults of the town who are full people, in id order. */
export function townAdults(core: CoreState, limit = 900): PersonState[] {
  return [...core.people.values()]
    .filter((p) => p.alive && p.birthDate <= "2000-01-01")
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Runs `fn` with every listed person's traits wiped flat, then puts them back. */
export function withFlatTraits<T>(
  people: readonly PersonState[],
  fn: () => T,
): T {
  const originals = new Map(people.map((p) => [p.id, p.traits]));
  for (const p of people)
    (p as { traits: Record<string, number> }).traits = Object.fromEntries(
      Object.keys(p.traits).map((k) => [k, 0]),
    );
  forgetTraitLeans();
  try {
    return fn();
  } finally {
    for (const p of people)
      (p as { traits: Record<string, number> }).traits = originals.get(p.id)!;
    forgetTraitLeans();
  }
}

export interface Gap {
  readonly people: number;
  readonly rateTop: number;
  readonly rateBottom: number;
  readonly rateTopFlat: number;
  readonly rateBottomFlat: number;
  /** The odds ratio top over bottom third, net of the same ratio with personality flat. */
  readonly net: number;
}

/**
 * Runs `decide` for every person with their own traits and again with every
 * trait wiped flat, and reports the thirds' pick rates by lean toward `yes`.
 */
export function thirdsGap(
  core: CoreState,
  people: readonly PersonState[],
  decisionId: string,
  yes: string,
  no: string,
  decide: (person: PersonState) => boolean,
): Gap {
  const leans = new Map(
    people.map((p) => [p.id, decisionLean(core, p, decisionId, yes, no)]),
  );
  const sorted = [...people].sort(
    (a, b) => leans.get(a.id)! - leans.get(b.id)! || a.id.localeCompare(b.id),
  );
  const n = Math.floor(sorted.length / 3);
  const bottom = sorted.slice(0, n);
  const top = sorted.slice(sorted.length - n);
  const rate = (group: readonly PersonState[]) =>
    (group.filter(decide).length + 0.5) / (group.length + 1);
  const odds = (p: number) => p / (1 - p);
  const rateTop = rate(top);
  const rateBottom = rate(bottom);
  const [rateTopFlat, rateBottomFlat] = withFlatTraits(people, () => [
    rate(top),
    rate(bottom),
  ]);
  return {
    people: people.length,
    rateTop,
    rateBottom,
    rateTopFlat,
    rateBottomFlat,
    net:
      odds(rateTop) /
      odds(rateBottom) /
      (odds(rateTopFlat) / odds(rateBottomFlat)),
  };
}
