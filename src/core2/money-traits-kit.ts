/**
 * Shared pieces of the money-family trait tests (`*.traits.test.ts`): people
 * drawn the way the game draws who exists, a small real core around them, and
 * the odds ratio between the third of people leaning most toward an option and
 * the third leaning least, the same measure `scripts/traits/trait-calibrate.ts`
 * sets each decision's weight against.
 */
import { drawPlace } from "../../scripts/core2-year/place";
import { traitLean } from "./choice";
import { createLifeCore } from "./life";
import { openingTemperaments } from "./opening-personality";
import { worldCoreData } from "./modules/world";
import type { CoreModule, CoreState } from "./types";

const START = "2026-10-01";

/** The place and seed a test draws from, named in its failure messages. */
export function testPlace(name: string) {
  return drawPlace(`money-traits:${name}`, "money-traits");
}

/** Adults drawn with the opening temperament draw (real norms by age and sex). */
export function drawnTraits(
  seed: string,
  count: number,
): Record<string, number>[] {
  const subjects = Array.from({ length: count }, (_, i) => ({
    id: `person:${i}`,
    birthDate: `${1960 + (i % 40)}-06-15`,
    gender: i % 2 ? "female" : "male",
    parents: [] as string[],
  }));
  const drawn = openingTemperaments(subjects, { seed, startedAt: START });
  return subjects.map((s) => drawn.get(s.id)!);
}

/** A real core holding one person per trait record, all alike but for traits. */
export function coreWithPeople(
  traits: readonly Record<string, number>[],
  modules: readonly CoreModule[] = [],
  edit: (parameters: Record<string, { value: number }>) => void = () => {},
): CoreState {
  const data = worldCoreData();
  edit(data.parameters as unknown as Record<string, { value: number }>);
  const source = {
    tag: "ESTIMATED" as const,
    asOf: START,
    citation: "Technical fixture records.",
    estimatedFrom: "Trait test fixture only.",
  };
  const place = "place:trait-fixture";
  return createLifeCore(
    {
      seed: "money-traits",
      startedAt: START,
      people: traits.map((t, i) => ({
        id: `person:${i}`,
        givenName: `P${i}`,
        familyName: "Fixture",
        birthDate: `${1960 + (i % 40)}-06-15`,
        placeId: place,
        householdId: `household:${i}`,
        tier: "monthly" as const,
        traits: t,
        liquidMinor: 100_000,
        livingCostDailyMinor: 3_000,
        source,
        familyIds: [],
        knownIds: [],
      })),
      households: traits.map((_, i) => ({
        id: `household:${i}`,
        placeId: place,
        memberIds: [`person:${i}`],
        source,
      })),
      jobs: [],
      organizations: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
    } as never,
    { data, modules, scheduledWork: false },
  );
}

/** Lean of one person toward `toward` over `over` on the chooser's own scale. */
export function leanBetweenKinds(
  core: CoreState,
  traits: Record<string, number>,
  toward: readonly string[],
  over: readonly string[],
): number {
  return (
    traitLean(core, { traits }, toward) - traitLean(core, { traits }, over)
  );
}

/**
 * Odds ratio of the yes rate between the top and bottom thirds by lean,
 * smoothed by half a count as the calibration does.
 */
export function thirdsOddsRatio(
  rows: readonly { lean: number; yes: boolean }[],
): number {
  const sorted = [...rows].sort((a, b) => a.lean - b.lean);
  const n = Math.floor(sorted.length / 3);
  const rate = (part: typeof sorted) =>
    (part.filter((r) => r.yes).length + 0.5) / (part.length + 1);
  const low = rate(sorted.slice(0, n)),
    high = rate(sorted.slice(sorted.length - n));
  return high / (1 - high) / (low / (1 - low));
}
