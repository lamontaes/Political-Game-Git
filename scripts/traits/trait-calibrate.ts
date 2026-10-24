/**
 * Calibrates each decision's trait weight against its researched effect
 * size. Reads one played-mode run of `trait-wiring-audit.ts` (its kept calls:
 * every option's score without personality and its trait lean) and
 * `data/research/trait-effect-sizes.json`, and for every decision with a
 * research row finds the weight at which the odds of the studied option,
 * between the third of people leaning most toward it and the third leaning
 * least, match the study's. The study's effect per standard deviation is
 * carried to thirds: the top and bottom thirds of a normal trait sit about
 * 2.18 standard deviations apart (means of +1.09 and -1.09).
 *
 * node --import tsx scripts/traits/trait-calibrate.ts <played.json> [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import decisions from "../../data/content/trait-decisions.json" with { type: "json" };
import {
  strongestRows,
  targetLogOdds,
  type ResearchRow,
} from "./trait-targets";

interface Sample {
  actions?: string[];
  bare: number | number[];
  lean: number | number[];
}

const [runPath, outPath] = process.argv.slice(2);
const run = JSON.parse(readFileSync(runPath!, "utf8")) as {
  chooser: Record<string, { samples?: Sample[] }>;
  formula: Record<string, { samples?: Sample[] }>;
};
const research = JSON.parse(
  readFileSync("data/research/trait-effect-sizes.json", "utf8"),
) as { rows: ResearchRow[] };

/** Log odds of the option between the top and bottom thirds of lean toward it. */
function logOdds(rows: { lean: number; yes: boolean }[]): number | null {
  if (rows.length < 30) return null;
  const sorted = [...rows].sort((a, b) => a.lean - b.lean);
  const n = Math.floor(sorted.length / 3);
  const rate = (part: typeof rows) =>
    (part.filter((r) => r.yes).length + 0.5) / (part.length + 1);
  const low = rate(sorted.slice(0, n)),
    high = rate(sorted.slice(sorted.length - n));
  return Math.log(high / (1 - high)) - Math.log(low / (1 - low));
}

/** Each kept call as (lean toward the option, picked it) at weight `w`. */
function outcomesAt(
  samples: Sample[],
  option: string | undefined,
  w: number,
): { lean: number; yes: boolean }[] {
  return samples.flatMap((s) => {
    if (typeof s.bare === "number")
      return [
        { lean: s.lean as number, yes: s.bare + w * (s.lean as number) > 0 },
      ];
    const bare = s.bare,
      lean = s.lean as number[],
      actions = s.actions!;
    const at = actions.indexOf(option ?? actions[actions.length - 1]!);
    if (at < 0) return [];
    let best = 0;
    for (let i = 1; i < bare.length; i++)
      if (bare[i]! + w * lean[i]! > bare[best]! + w * lean[best]!) best = i;
    const others = lean.filter((_, i) => actions[i] !== actions[at]);
    const mean = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
    return [{ lean: lean[at]! - mean, yes: actions[best] === actions[at] }];
  });
}

function samplesFor(decisionId: string): Sample[] {
  const row = decisions.decisions.find((d) => d.id === decisionId);
  if (!row) return [];
  const ids = new Set(row.options.map((o) => o.id));
  const out: Sample[] = [...(run.formula[decisionId]?.samples ?? [])];
  for (const [key, site] of Object.entries(run.chooser))
    if (key.split("|").every((a) => ids.has(a)))
      out.push(...(site.samples ?? []));
  return out;
}

const strongest = strongestRows(research.rows);
/** Weights tried: fine steps up to 0.2 (a small study effect against a wide case fits there), then steps of 0.05 to 8. */
const WEIGHTS = [
  ...Array.from({ length: 40 }, (_, i) => Math.round(i * 0.005 * 1e3) / 1e3),
  ...Array.from(
    { length: 157 },
    (_, i) => Math.round((0.2 + i * 0.05) * 1e3) / 1e3,
  ),
];
const results = [...strongest.values()].map((row) => {
  // The study's sign says which way the trait moves the choice; the lean
  // already points toward the option, so the target is its size.
  const signed = targetLogOdds(row);
  const target = signed === null ? null : Math.abs(signed);
  const samples = samplesFor(row.id);
  if (target === null) return { id: row.id, status: "no-effect-size" };
  if (!samples.length) return { id: row.id, target, status: "no-calls" };
  // Personality's own share of the gap: the thirds' log odds at a weight,
  // less the gap the same calls show with personality off (people who lean
  // toward an option can also be the ones whose circumstances favor it).
  const confounded = logOdds(outcomesAt(samples, row.option, 0));
  if (confounded === null)
    return { id: row.id, target, status: "too-few-calls" };
  const effect = (w: number) => {
    const at = logOdds(outcomesAt(samples, row.option, w));
    return at === null ? null : at - confounded;
  };
  let best = { w: 0, err: Infinity, measured: null as number | null };
  for (const w of WEIGHTS) {
    const measured = effect(w);
    if (measured === null) continue;
    const err = Math.abs(measured - target);
    if (err < best.err)
      best = { w: Math.round(w * 1000) / 1000, err, measured };
  }
  const at1 = effect(1);
  return {
    id: row.id,
    calls: samples.length,
    targetOddsRatio: Math.exp(target),
    oddsRatioAtOne: at1 === null ? null : Math.exp(at1),
    weight: best.w,
    reachedOddsRatio: best.measured === null ? null : Math.exp(best.measured),
    status:
      best.err < 0.15
        ? "calibrated"
        : "cannot-reach (circumstances saturate the choice)",
  };
});
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 2)}\n`);
console.table(results);
