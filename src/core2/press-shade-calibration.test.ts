/**
 * Whether a candidate shades an interview answer about their own vote is
 * calibrated to honesty (pool item press-world-candidates-answer-from-record):
 * across the adults of eight towns drawn from all 56 on a seed nobody chose
 * (SHADE_CALIBRATION_SEED pins one), with the town standing as far against
 * their vote as a town can (half way to the other end: a gap of 0.75), about
 * as many would shade as were prepared to lie for gain in Heck,
 * Thielmann, Moshagen and Hilbig (2018), 26.1% (95% interval 19.2% to 34.4%);
 * fewer shade the closer town and vote stand, and none where the town stands
 * fully with the vote. The
 * trait weight is the study's log odds between the thirds over the gap
 * between the thirds' mean lean, within its measured spread.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import { shadesAnswer } from "./modules/press";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import { decisionLean } from "./trait-decisions";
import rows from "./data/parameters.json" with { type: "json" };

const seed =
  process.env.SHADE_CALIBRATION_SEED ?? randomBytes(8).toString("hex");
const TARGET = Math.abs(Math.log(0.53)) * 2.18;
const ROW = (
  rows as unknown as Record<
    string,
    { value: number; spread: { low: number; high: number } }
  >
).traitWeightPressShadeAnswer!;

it("about a quarter of adults would shade an answer about a vote the town opposes as far as a town can, fewer as town and vote close, none where the town agrees, at the study's weight", () => {
  const shares = { agrees: 0, leans: 0, split: 0, opposed: 0 };
  let total = 0;
  const gaps: number[] = [];
  const names: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "shade-calibration");
    names.push(`${place.name} (${place.key}), world seed ${place.seed}`);
    const input = buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    });
    const core = createLifeCore(input, { modules: [] });
    const api = coreAPI(core);
    const adults = [...core.people.values()].filter(
      (p) =>
        p.tier !== "husk" &&
        p.alive &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(input.startedAt)) >= 21,
    );
    // A vote of -1; a candidate reads a town standing as far as towns stand
    // (townStandReach) as half way to an end, so a town read at -0.5 agrees as
    // fully as a town can and one at 0.5 opposes as fully.
    for (const p of adults) {
      total += 1;
      if (shadesAnswer(api, p, -0.5, -1)) shares.agrees += 1;
      if (shadesAnswer(api, p, -0.25, -1)) shares.leans += 1;
      if (shadesAnswer(api, p, 0, -1)) shares.split += 1;
      if (shadesAnswer(api, p, 0.5, -1)) shares.opposed += 1;
    }
    const leans = adults
      .map((p) => decisionLean(core, p, "press.shade-answer", "shade", "own"))
      .sort((a, b) => a - b);
    const n = Math.floor(leans.length / 3);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    gaps.push(mean(leans.slice(-n)) - mean(leans.slice(0, n)));
  }
  const where = `${names.join("; ")}; run seed ${seed}`;
  const rate = (k: keyof typeof shares) => shares[k] / total;
  expect(rate("opposed"), where).toBeGreaterThan(0.192);
  expect(rate("opposed"), where).toBeLessThan(0.344);
  expect(rate("split"), where).toBeLessThan(rate("opposed"));
  expect(rate("leans"), where).toBeLessThan(rate("split"));
  expect(rate("agrees"), where).toBe(0);
  const fitted = TARGET / (gaps.reduce((a, b) => a + b, 0) / gaps.length);
  expect(fitted, where).toBeGreaterThan(ROW.spread.low * 0.95);
  expect(fitted, where).toBeLessThan(ROW.spread.high * 1.05);
  expect(Math.abs(ROW.value - fitted) / fitted, where).toBeLessThan(0.1);
}, 900_000);
