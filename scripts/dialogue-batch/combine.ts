/**
 * Combines several dialogue-batch runs into one grading batch for the owner.
 *
 *   node --import tsx scripts/dialogue-batch/combine.ts --batch 2 \
 *     test-results/dialogue-batch/seed-a.json test-results/dialogue-batch/seed-b.json
 *
 * --max N caps the items (100 by default); --leave-out KIND, repeatable,
 * leaves a kind of text out of the batch and lists it as absent.
 *
 * One run draws at most eight worlds; a grading sitting is about 100 lines
 * (00s P3), so a batch combines runs drawn from different seeds. Every line is
 * exactly what the run recorded. A line whose wording repeats one already
 * taken, with other places or figures, counts once. Writes
 * data/english/batches/batch-<n>.json in the grading page's shape, and the
 * binned exchanges beside the runs.
 *
 * A development tool. It never words anything.
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { toGradingBatch, type GradingBatch } from "./grading";
import { repeatKey, type BatchLine, type BatchResult } from "./run";
import { batchStats } from "./stats";
import { BATCH_DIR, COVERAGE_FILE, type GradedCoverage } from "./apply-grades";

/** No one world's life or body fills a kind of text in a combined batch. */
const PER_WORLD_KIND = 2;

/**
 * The repeat keys of every item already put to the owner, so a later batch
 * never asks for the same grade twice.
 */
export function askedKeys(batches: readonly GradingBatch[]): Set<string> {
  const asked = new Set<string>();
  for (const batch of batches)
    for (const item of batch.items) {
      // A reply is "Voice: line"; the key reads the line the engine wrote.
      const line = item.reply.slice(item.reply.indexOf(": ") + 2);
      asked.add(
        repeatKey(item.id.replace(/-\d+$/, ""), line, item.parts.join("+")),
      );
    }
  return asked;
}

/** The kind of text a batch line is, as the grading page counts it. */
function kindOfLine(line: BatchLine): string {
  const read = /^text-(.+)-\d+$/.exec(line.id)?.[1];
  if (read) return read;
  if (line.id.startsWith("judge-")) return "judges";
  return line.id.startsWith("press-") ? "press" : "conversation";
}

/**
 * Lines ordered to fill the least-graded cells first (CTO 2:23 p.m. Oct 8):
 * a line whose axis and kind the owner has graded least comes first, then
 * one from the next cell, so a batch spreads across the cells before it
 * repeats one. Ties keep the order the runs gave.
 */
export function leastGradedFirst(
  lines: readonly BatchLine[],
  graded: GradedCoverage,
): BatchLine[] {
  const taken = new Map<string, number>();
  const order = lines.map((line, at) => {
    const cell = `${line.axis}|${kindOfLine(line)}`;
    const turn = taken.get(cell) ?? 0;
    taken.set(cell, turn + 1);
    const done = graded[line.axis]?.[kindOfLine(line)] ?? 0;
    return { line, at, rank: done + turn };
  });
  return order
    .sort((a, b) => a.rank - b.rank || a.at - b.at)
    .map((entry) => entry.line);
}

export function combineResults(
  results: readonly BatchResult[],
  asked: ReadonlySet<string> = new Set(),
  /**
   * Kinds left out of this batch on purpose, such as one the owner sent back
   * whose replacement is not built yet. Each is listed as absent, saying so.
   */
  leaveOut: ReadonlySet<string> = new Set(),
): BatchResult {
  const lines: BatchLine[] = [];
  const shapes = new Set<string>(asked);
  const fromWorld = new Map<string, number>();
  const numbered = new Map<string, number>();
  const worlds: BatchResult["worlds"][number][] = [];
  const absent = new Map<string, string[]>();
  // Lines each kind lost before the batch, by why, so a kind with none left
  // says where they went rather than reading as one no situation reached.
  const dropped = new Map<string, { repeated: number; overLimit: number }>();
  const drop = (line: BatchLine, why: "repeated" | "overLimit") => {
    const kind = kindOfLine(line);
    const counts = dropped.get(kind) ?? { repeated: 0, overLimit: 0 };
    counts[why] += 1;
    dropped.set(kind, counts);
  };
  for (const result of results) {
    for (const world of result.worlds)
      worlds.push({ ...world, index: worlds.length });
    for (const line of result.lines) {
      if (leaveOut.has(kindOfLine(line))) continue;
      const kind = line.id.replace(/-\d+$/, "");
      const shape = repeatKey(kind, line.line, line.parts.join("+"));
      const index =
        result.worlds.find((world) => world.place === line.world.place)
          ?.index ?? 0;
      const seed = line.seed ?? `${result.seed}:${index}`;
      const worldKind = `${seed}|${kind}`;
      if (shapes.has(shape)) {
        drop(line, "repeated");
        continue;
      }
      if ((fromWorld.get(worldKind) ?? 0) >= PER_WORLD_KIND) {
        drop(line, "overLimit");
        continue;
      }
      shapes.add(shape);
      fromWorld.set(worldKind, (fromWorld.get(worldKind) ?? 0) + 1);
      // Ids stay unique across runs: text-news-1, text-news-2, ...
      const n = (numbered.get(kind) ?? 0) + 1;
      numbered.set(kind, n);
      const id = /-\d+$/.test(line.id) ? `${kind}-${n}` : line.id;
      lines.push({ ...line, id, seed });
    }
    for (const row of result.absent ?? [])
      absent.set(row.kind, [...(absent.get(row.kind) ?? []), row.reason]);
  }
  const produced = new Set(lines.map(kindOfLine));
  return {
    seed: results.map((result) => result.seed).join("+"),
    worlds,
    lines,
    skipped: results.flatMap((result) => result.skipped),
    absent: [
      ...[...absent]
        .filter(([kind]) => !produced.has(kind) && !leaveOut.has(kind))
        .map(([kind, reasons]) => ({ kind, reason: reasons.join("; ") })),
      ...[...leaveOut].map((kind) => ({
        kind,
        reason: "it was left out of this batch by its builder (--leave-out)",
        leftOut: true,
      })),
    ],
    dropped: Object.fromEntries(dropped),
    stats: batchStats(lines),
  };
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--batch");
  const number = at >= 0 ? Number(args[at + 1]) : NaN;
  // Flags that take a value: --batch N, --max N and --leave-out KIND (repeatable).
  const flagged = new Set<number>();
  const leaveOut = new Set<string>();
  args.forEach((arg, i) => {
    if (arg !== "--batch" && arg !== "--max" && arg !== "--leave-out") return;
    flagged.add(i).add(i + 1);
    if (arg === "--leave-out") leaveOut.add(args[i + 1] ?? "");
  });
  const files = args.filter((_, i) => !flagged.has(i));
  if (!Number.isInteger(number) || number < 1 || files.length === 0)
    throw new Error("Use --batch N and one or more batch run files.");
  const results = files.map(
    (file) => JSON.parse(readFileSync(file, "utf8")) as BatchResult,
  );
  const id = `batch-${number}`;
  // Earlier batches in the folder are what the owner has already been asked.
  const earlier = existsSync(BATCH_DIR)
    ? readdirSync(BATCH_DIR)
        .filter((name) => name.endsWith(".json") && name !== `${id}.json`)
        .map(
          (name) =>
            JSON.parse(
              readFileSync(join(BATCH_DIR, name), "utf8"),
            ) as GradingBatch,
        )
    : [];
  const combined = combineResults(results, askedKeys(earlier), leaveOut);
  const graded: GradedCoverage = existsSync(COVERAGE_FILE)
    ? ((
        JSON.parse(readFileSync(COVERAGE_FILE, "utf8")) as {
          readonly graded?: GradedCoverage;
        }
      ).graded ?? {})
    : {};
  const maxAt = args.indexOf("--max");
  const max = maxAt >= 0 ? Number(args[maxAt + 1]) : 100;
  const { batch, bin } = toGradingBatch(
    {
      ...combined,
      lines: leastGradedFirst(combined.lines, graded).slice(0, max),
    },
    {
      id,
      head: execSync("git rev-parse HEAD").toString().trim(),
      at: new Date(),
    },
  );
  const out = `${BATCH_DIR}/${id}.json`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify(batch satisfies GradingBatch, null, 2)}\n`,
  );
  // The batch is a committed data file, so it is written in the repository's
  // JSON style.
  execSync(`npx prettier --write ${out}`, { stdio: "ignore" });
  const binOut = `test-results/dialogue-batch/${id}.bin.json`;
  mkdirSync(dirname(binOut), { recursive: true });
  writeFileSync(binOut, `${JSON.stringify(bin, null, 2)}\n`);
  console.log(
    `Wrote ${out}: ${batch.items.length} exchanges from ${batch.variety.places} places; ${bin.length} in the bin (${binOut}).`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
