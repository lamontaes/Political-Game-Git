/**
 * Who takes a bribe is calibrated to honesty (pool item
 * people-corruption-honest-pull-calibrated): across the adults of fourteen
 * towns drawn from all 56 on a seed nobody chose (TAKE_CALIBRATION_SEED pins
 * one), offered a $2,000 bribe by someone they are fairly close to, a small
 * share take it, and the third of the town with the highest lean toward
 * corruption takes it as many times more often than the lowest third as the
 * latent model of honesty-humility against workplace deviance gives (Pletzer,
 * Bentvelzen, Oostrom and de Vries 2019, Journal of Vocational Behavior
 * 112:369-383, corrected rho -0.482), computed here at the rate the towns
 * show. A take is scored as the chooser plays it: the engine's reasons plus
 * the decision's trait term at its own weight. A larger bribe raises the share
 * gradually, not all at once. (Offers are fitted on the asks play makes, from
 * the trait audit's kept calls: see corruptionHonestPull.)
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traitLean } from "./choice";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import { corruptionModule, takeValues } from "./modules/corruption";
import rows from "./data/corruption/parameters.json" with { type: "json" };
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import { decisionKinds, decisionTraitWeight } from "./trait-decisions";
import type { CoreState, PersonState } from "./types";

const seed =
  process.env.TAKE_CALIBRATION_SEED ?? randomBytes(8).toString("hex");
const RHO = 0.482;
const ASK_MINOR = 200_000;
const TIE = 0.3;
const PULL = (rows as unknown as Record<string, { value: number }>)
  .corruptionTakeHonestPull!.value;

const cdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const pdf = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
const inverse = (p: number) => {
  let low = -8;
  let high = 8;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (cdf(mid) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
};

/** The latent model's rate in the least honest third over the most honest, at an overall rate. */
function latentRatio(rate: number): number {
  const threshold = inverse(1 - rate);
  const third = (from: number, to: number) => {
    let sum = 0;
    let weight = 0;
    const steps = 4000;
    for (let i = 0; i < steps; i++) {
      const h = from + ((to - from) * (i + 0.5)) / steps;
      sum +=
        (1 - cdf((threshold + RHO * h) / Math.sqrt(1 - RHO * RHO))) * pdf(h);
      weight += pdf(h);
    }
    return sum / weight;
  };
  const cut = inverse(2 / 3);
  return third(-8, -cut) / third(cut, 8);
}

/** The chooser's trait term for taking, against refusing, at the decision's own weight. */
function traitTerm(core: CoreState, person: PersonState): number {
  const lean = (option: string) =>
    traitLean(core, person, decisionKinds("corruption.take", option));
  return (
    decisionTraitWeight(core, "corruption.take") *
    (lean("corruption-take-yes") - lean("corruption-take-no"))
  );
}

const sum = (values: Record<string, number>) =>
  Object.values(values).reduce((a, b) => a + b, 0);

/** The share of fourteen drawn towns' adults who take a bribe of this size, and of the most and least honest thirds. */
function calibrate(askMinor: number) {
  let total = 0;
  let yes = 0;
  const thirds = [0, 0, 0];
  const counts = [0, 0, 0];
  const names: string[] = [];
  for (let draw = 0; draw < 14; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "take-calibration");
    names.push(`${place.name} (${place.key}), world seed ${place.seed}`);
    const input = buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    });
    const core = createLifeCore(input, { modules: [corruptionModule] });
    const api = coreAPI(core);
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.tier !== "husk" &&
          p.alive &&
          ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(input.startedAt)) >=
            21,
      )
      .map((p) => {
        const term = traitTerm(core, p);
        return {
          term,
          yes: sum(takeValues(api, p, askMinor, TIE)) + term > PULL,
        };
      })
      .sort((a, b) => a.term - b.term);
    adults.forEach((adult, i) => {
      const third = Math.min(2, Math.floor((i * 3) / adults.length));
      counts[third]! += 1;
      thirds[third]! += adult.yes ? 1 : 0;
      total += 1;
      yes += adult.yes ? 1 : 0;
    });
  }
  return {
    where: `${names.join("; ")}; run seed ${seed}`,
    rate: yes / total,
    honest: thirds[0]! / counts[0]!,
    corruptible: thirds[2]! / counts[2]!,
  };
}

it("a small share of adults take a modest bribe, the least honest third far more often than the most honest, and a larger bribe tempts more of them gradually", () => {
  const { where, rate, honest, corruptible } = calibrate(ASK_MINOR);
  expect(rate, `overall rate ${rate}: ${where}`).toBeGreaterThan(0.03);
  expect(rate, `overall rate ${rate}: ${where}`).toBeLessThan(0.12);
  expect(honest, `most honest third takes at all: ${where}`).toBeGreaterThan(0);
  const ratio = corruptible / honest;
  const target = latentRatio(rate);
  expect(
    ratio,
    `ratio ${ratio} against the latent model's ${target}: ${where}`,
  ).toBeGreaterThan(target / 3);
  expect(
    ratio,
    `ratio ${ratio} against the latent model's ${target}: ${where}`,
  ).toBeLessThan(target * 3);
  // Five times the bribe tempts more people, but not twice as many.
  const larger = calibrate(ASK_MINOR * 5).rate;
  expect(larger, `a $10,000 bribe: ${larger}; ${where}`).toBeGreaterThan(rate);
  expect(larger, `a $10,000 bribe: ${larger}; ${where}`).toBeLessThan(rate * 2);
}, 1_800_000);
