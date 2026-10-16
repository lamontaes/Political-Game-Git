import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { careNeedOf } from "./modules/health";
import { initialPersonState } from "./person-state";
import { PARAMETERS } from "./parameters";
import { restingStress } from "./resting-stress";
import type { PersonState } from "./types";

// Resting stress is each person's own (owner, Oct 16): a weighted read of
// their money, work, age, traits and health on the PSS-10 scale over 40, with
// the population's average at the norm (stressBaseline, 12.57 of 40) and a
// spread that is a third to all of the norm's (SD 6.42 of 40 = 0.16). The rest
// of the norm's spread is what happens to people, which the appraisal adds.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "resting-stress");
const normMean = PARAMETERS.stressBaseline!.value;
const normSd = 6.42 / 40;
const stats = (values: number[]) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
  );
  return { mean, sd };
};
const adults = (people: Iterable<PersonState>) =>
  [...people].filter((p) => p.alive && !p.id.startsWith("official:"));

it(`resting stress differs by person and is read for a year in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = JSON.stringify({ seed, place: place.name });
  const at = (people: PersonState[]) =>
    stats(people.map((p) => p.affect.stressBaseline));
  const opening = at(adults(core.people.values()));
  expect(Math.abs(opening.mean - normMean), where).toBeLessThan(0.03);
  expect(opening.sd, where).toBeGreaterThan(normSd / 3);
  expect(opening.sd, where).toBeLessThan(normSd);

  // People in different situations hold different baselines. Traits move a
  // person as much as a situation does, so the check compares a situation
  // against the same person's, and groups against groups: the working-age
  // adults out of work with the least cash against their living costs, and
  // those in work with the most.
  const months = (p: PersonState) =>
    p.liquidMinor / (p.livingCostDailyMinor * 30.4);
  const workingAge = (p: PersonState) => {
    const age = Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));
    return age >= 25 && age <= 55;
  };
  const people = adults(core.people.values()).filter(
    (p) => p.livingCostDailyMinor > 0 && workingAge(p),
  );
  const without = people
    .filter((p) => !p.jobId)
    .sort((a, b) => months(a) - months(b));
  const withWork = people
    .filter((p) => p.jobId)
    .sort((a, b) => months(b) - months(a));
  expect(without.length, `${where}: no one out of work`).toBeGreaterThan(0);
  expect(withWork.length, `${where}: no one in work`).toBeGreaterThan(0);
  const tail = (list: PersonState[]) =>
    list.slice(0, Math.max(1, Math.ceil(list.length / 5)));
  const mean = (list: PersonState[]) =>
    list.reduce((n, p) => n + restingStress(core, p), 0) / list.length;
  expect(
    mean(tail(without)),
    `${where}: out of work with least cash against in work with most`,
  ).toBeGreaterThan(mean(tail(withWork)));
  // The same named person under money pressure and out of work rests higher
  // than with the other group's most secure person's work and cash.
  const strained = without[0]!;
  const secure = withWork[0]!;
  expect(
    restingStress(core, strained),
    `${strained.id} out of work against the same person in ${secure.id}'s work and cash`,
  ).toBeGreaterThan(
    restingStress(core, {
      ...strained,
      jobId: secure.jobId,
      liquidMinor: secure.liquidMinor,
      livingCostDailyMinor: secure.livingCostDailyMinor,
    }),
  );

  // The same rule serves a counted person: the situation alone moves it.
  const row = { ...secure!, jobId: undefined, liquidMinor: 0 };
  expect(
    initialPersonState(core, row, false).affect.stressBaseline,
  ).toBeGreaterThan(
    initialPersonState(core, secure!, false).affect.stressBaseline,
  );

  // A played year: each person's resting level is the one the module wrote
  // from their situation (named by record), and decay moves stress toward it.
  advanceCore(core, makeIsoDate("2026-01-20"));
  const later = adults(core.people.values());
  const mismatched = later.filter(
    (p) =>
      Math.abs(
        p.affect.stressBaseline -
          restingStress(core, p, careNeedOf(core, p.id)),
      ) > 0.1,
  );
  const after = at(later);
  expect(Math.abs(after.mean - normMean), where).toBeLessThan(0.06);
  expect(after.sd, where).toBeGreaterThan(normSd / 3);
  expect(
    mismatched.length,
    `${where}: ${mismatched.slice(0, 3).map((p) => p.id)}`,
  ).toBeLessThan(later.length / 10);
  const stress = stats(later.map((p) => p.affect.stress));
  expect(stress.sd, where).toBeGreaterThan(normSd / 3);
}, 600_000);
