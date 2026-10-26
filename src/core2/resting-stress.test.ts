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
  return { mean, sd, n: values.length };
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
  // The population's average sits at the norm. One town's full people are a
  // sample of about a hundred, and towns differ in who lives there, so a
  // single town can sit 0.03 away without a fault (28 drawn towns, Oct 19:
  // the gap's spread was 0.012 and Robinson, North Dakota sat at -0.031).
  // The invariant is therefore held on the pooled mean of four drawn towns,
  // at the old 0.03 bound, where that spread falls to about 0.006.
  const pooled = [opening];
  for (let i = 1; i < 4; i += 1) {
    const other = drawPlace(seed, `resting-stress:${i}`);
    const { core: otherCore } = buildBenchWorld(other.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: other.key,
    });
    pooled.push(
      stats(
        adults(otherCore.people.values()).map((p) => p.affect.stressBaseline),
      ),
    );
  }
  const pooledMean =
    pooled.reduce((sum, row) => sum + row.mean * row.n, 0) /
    pooled.reduce((sum, row) => sum + row.n, 0);
  expect(Math.abs(pooledMean - normMean), `${where} pooled`).toBeLessThan(0.03);
  expect(opening.sd, where).toBeGreaterThan(normSd / 3);
  expect(opening.sd, where).toBeLessThan(normSd);

  // A person's resting stress slides with their own situation, everything else
  // about them held: with no cash against their living costs it is higher than
  // with a year of them, and a working-age adult out of work rests higher than
  // the same adult in work. (Comparing two different people would mix in
  // their traits and health, which move it as much as money does.)
  const age = (p: PersonState) =>
    Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));
  const withCosts = adults(core.people.values()).filter(
    (p) => p.livingCostDailyMinor > 0,
  );
  expect(
    withCosts.length,
    `${where}: adults with living costs`,
  ).toBeGreaterThan(0);
  for (const p of withCosts) {
    const need = careNeedOf(core, p.id);
    const yearOfCosts = p.livingCostDailyMinor * 365;
    expect(
      restingStress(core, { ...p, liquidMinor: 0 }, need),
      `${p.id}: no cash against a year of costs`,
    ).toBeGreaterThan(
      restingStress(core, { ...p, liquidMinor: yearOfCosts }, need),
    );
  }
  const workingAge = withCosts.filter((p) => age(p) >= 25 && age(p) <= 55);
  for (const p of workingAge) {
    const need = careNeedOf(core, p.id);
    expect(
      restingStress(core, { ...p, jobId: undefined }, need),
      `${p.id}: out of work against in work`,
    ).toBeGreaterThan(restingStress(core, { ...p, jobId: "a-job" }, need));
  }
  const secure = workingAge[0] ?? withCosts[0];
  expect(secure, `${where}: no one to compare`).toBeDefined();

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
