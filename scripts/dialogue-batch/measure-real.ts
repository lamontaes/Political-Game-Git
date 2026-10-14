/**
 * Measures the repetition guard's four shares over real samples of the same
 * size as each kind's batch lines, and writes the thresholds into the
 * director's parameter table (ESTIMATED, with the spread). Development
 * tooling.
 *
 *   node --import tsx scripts/dialogue-batch/measure-real.ts [--write]
 *
 * The real samples are the mined banks' own sentences (each is a sentence
 * said in a public-domain federal record), drawn in proportion to how many
 * transcripts, bills or minutes used it (`transcriptsUsing`, `billsUsing`, `minutesUsing`,
 * `hearingsUsing`; one each where the bank keeps no count), 400 draws per
 * kind with a fixed-seed generator so the table is reproducible. The draws
 * only measure; no game outcome comes from them. For the kinds real talk is
 * counted for (`data/english/counts/everyday.json`, the Santa Barbara Corpus),
 * the opener share is also computed from the counts' turn-opener table as a
 * cross-check. The threshold is the mean minus one standard deviation of the
 * draws, rounded down to a hundredth; the spread is the 10th to 90th
 * percentile.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  MEASURES,
  measureLines,
  parameterKey,
  type GuardLine,
  type Measure,
} from "./repetition-guard";
import { stableHash } from "./bank-compose";

interface Part {
  key: string;
  move: string;
  text: string;
  shippable?: boolean;
  [count: string]: unknown;
}

/** Each kind: the banks and moves its lines are worded from, and its batch size. */
export const REAL_SAMPLES: Record<
  string,
  { banks: string[]; moves?: string[]; lines: number }
> = {
  journal: { banks: ["journal"], lines: 20 },
  legislation: {
    banks: ["legislation"],
    moves: ["short-title", "long-title", "enacting-clause"],
    lines: 12,
  },
  notices: { banks: ["notice"], lines: 2 },
  minutes: { banks: ["minutes"], lines: 4 },
  hearing: { banks: ["hearing"], lines: 4 },
  meeting: { banks: ["meeting"], lines: 12 },
  campaign: { banks: ["address"], lines: 8 },
  interview: { banks: ["interview"], lines: 8 },
  emotion: { banks: ["address"], lines: 18 },
  conversation: { banks: ["conversation"], lines: 12 },
};

const COUNT_FIELDS = [
  "transcriptsUsing",
  "billsUsing",
  "minutesUsing",
  "hearingsUsing",
];
const weightOf = (part: Part) =>
  Math.max(1, ...COUNT_FIELDS.map((field) => Number(part[field] ?? 0)));

function generator(seed: string) {
  let state = stableHash(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const mask = (text: string) => text.replace(/\{\w+\}/g, "Xx");
const quantile = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
const floor2 = (value: number) => Math.floor(value * 100 + 1e-9) / 100;

export function realMeasures(kind: string, draws = 400) {
  const spec = REAL_SAMPLES[kind]!;
  const parts: Part[] = spec.banks.flatMap(
    (bank) =>
      (
        JSON.parse(readFileSync(`data/english/parts/${bank}.json`, "utf8")) as {
          parts: Part[];
        }
      ).parts,
  );
  const pool = parts.filter(
    (part) =>
      part.shippable !== false &&
      (!spec.moves || spec.moves.includes(part.move)),
  );
  const total = pool.reduce((sum, part) => sum + weightOf(part), 0);
  const next = generator(`measure-real:${kind}`);
  const draw = () => {
    let at = next() * total;
    for (const part of pool) {
      at -= weightOf(part);
      if (at <= 0) return part;
    }
    return pool.at(-1)!;
  };
  const samples: Record<Measure, number[]> = {
    openers: [],
    closers: [],
    shapes: [],
    verbs: [],
  };
  for (let round = 0; round < draws; round += 1) {
    const lines: GuardLine[] = Array.from({ length: spec.lines }, () => {
      const part = draw();
      return { kind, text: mask(part.text), parts: [part.key] };
    });
    const measured = measureLines(kind, lines);
    for (const measure of MEASURES) samples[measure].push(measured[measure]);
  }
  return Object.fromEntries(
    MEASURES.map((measure) => {
      const values = [...samples[measure]].sort((a, b) => a - b);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sd = Math.sqrt(
        values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
      );
      return [
        measure,
        {
          mean,
          sd,
          low: quantile(values, 0.1),
          high: quantile(values, 0.9),
          threshold: floor2(mean - sd),
          parts: pool.length,
        },
      ];
    }),
  ) as Record<
    Measure,
    {
      mean: number;
      sd: number;
      low: number;
      high: number;
      threshold: number;
      parts: number;
    }
  >;
}

/** Expected distinct share of n real turn openers, from the counts' opener table (the rest taken as all different). */
export function talkOpenerCheck(n: number): number {
  const counts = JSON.parse(
    readFileSync("data/english/counts/everyday.json", "utf8"),
  ) as { counts: { turnOpenerPer1000Turns: Record<string, number> } };
  const table = Object.values(counts.counts.turnOpenerPer1000Turns).map(
    (per1000) => per1000 / 1000,
  );
  const listed = table.reduce((a, b) => a + b, 0);
  const distinctListed = table.reduce((sum, p) => sum + (1 - (1 - p) ** n), 0);
  return (distinctListed + n * (1 - listed)) / n;
}

if (process.argv[1]?.endsWith("measure-real.ts")) {
  const write = process.argv.includes("--write");
  const rows: Record<string, unknown> = {};
  for (const kind of Object.keys(REAL_SAMPLES)) {
    const spec = REAL_SAMPLES[kind]!;
    const real = realMeasures(kind);
    console.log(
      `${kind.padEnd(12)} n=${spec.lines} ` +
        MEASURES.map(
          (m) =>
            `${m} ${real[m].mean.toFixed(2)}±${real[m].sd.toFixed(2)} -> ${real[m].threshold}`,
        ).join("  "),
    );
    for (const measure of MEASURES) {
      const row = real[measure];
      rows[parameterKey(kind, measure)] = {
        value: row.threshold,
        tag: "ESTIMATED",
        citation: `Share of ${measure === "openers" ? "distinct two-word openers" : measure === "closers" ? "distinct two-word closers (the last two words, so a look-back is not said twice; CTO, Oct 14, on batch 9)" : measure === "shapes" ? "distinct sentence shapes (names, slot values, quoted titles, numbers and dates masked)" : "distinct main verbs"} among ${spec.lines} ${kind} lines. Mean ${row.mean.toFixed(2)} minus one standard deviation (${row.sd.toFixed(2)}) over 400 draws of ${spec.lines} real sentences from the mined ${spec.banks.join(" and ")} bank${spec.moves ? ` (moves ${spec.moves.join(", ")})` : ""}, each drawn in proportion to the records that used it (scripts/dialogue-batch/measure-real.ts). Owner, Oct 14, 2026: batch 7 was 'still super repetitive'.`,
        estimatedFrom: `data/english/parts/${spec.banks[0]}.json real-use counts (${row.parts} parts)${kind === "conversation" || kind === "emotion" ? "; opener cross-check from data/english/counts/everyday.json" : ""}`,
        spread: {
          low: Number(row.low.toFixed(2)),
          high: Number(row.high.toFixed(2)),
          unit: `share of ${spec.lines} lines (10th to 90th percentile of the draws)`,
          citation: `scripts/dialogue-batch/measure-real.ts, kind ${kind}`,
        },
      };
    }
  }
  console.log(
    `real talk, 12 turns, distinct one-word openers from the Santa Barbara counts (a lower bound for two words): ${talkOpenerCheck(12).toFixed(2)}`,
  );
  if (write) {
    const path = "src/director/data/director.json";
    const data = JSON.parse(readFileSync(path, "utf8"));
    for (const key of Object.keys(data.parameters))
      if (key.startsWith("dialogueGuard")) delete data.parameters[key];
    Object.assign(data.parameters, rows);
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
    execSync(`npx prettier --write ${path}`, { stdio: "ignore" });
    console.log(`wrote ${Object.keys(rows).length} rows to ${path}`);
  }
}
