/**
 * Combines several dialogue-batch runs into one grading batch for the owner.
 *
 *   node --import tsx scripts/dialogue-batch/combine.ts --batch 2 \
 *     test-results/dialogue-batch/seed-a.json test-results/dialogue-batch/seed-b.json
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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { toGradingBatch, type GradingBatch } from "./grading";
import { repeatKey, type BatchLine, type BatchResult } from "./run";
import { batchStats } from "./stats";
import { BATCH_DIR } from "./apply-grades";

/** No one world's life or body fills a kind of text in a combined batch. */
const PER_WORLD_KIND = 2;

export function combineResults(results: readonly BatchResult[]): BatchResult {
  const lines: BatchLine[] = [];
  const shapes = new Set<string>();
  const fromWorld = new Map<string, number>();
  const numbered = new Map<string, number>();
  const worlds: BatchResult["worlds"][number][] = [];
  const absent = new Map<string, string[]>();
  for (const result of results) {
    for (const world of result.worlds)
      worlds.push({ ...world, index: worlds.length });
    for (const line of result.lines) {
      const kind = line.id.replace(/-\d+$/, "");
      const shape = repeatKey(kind, line.line, line.parts[0] ?? "");
      const index =
        result.worlds.find((world) => world.place === line.world.place)
          ?.index ?? 0;
      const seed = line.seed ?? `${result.seed}:${index}`;
      const worldKind = `${seed}|${kind}`;
      if (
        shapes.has(shape) ||
        (fromWorld.get(worldKind) ?? 0) >= PER_WORLD_KIND
      )
        continue;
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
  const produced = new Set(
    lines.map((line) => /^text-(.+)-\d+$/.exec(line.id)?.[1]),
  );
  return {
    seed: results.map((result) => result.seed).join("+"),
    worlds,
    lines,
    skipped: results.flatMap((result) => result.skipped),
    absent: [...absent]
      .filter(([kind]) => !produced.has(kind))
      .map(([kind, reasons]) => ({ kind, reason: reasons.join("; ") })),
    stats: batchStats(lines),
  };
}

function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--batch");
  const number = at >= 0 ? Number(args[at + 1]) : NaN;
  const files = args.filter((_, i) => i !== at && i !== at + 1);
  if (!Number.isInteger(number) || number < 1 || files.length === 0)
    throw new Error("Use --batch N and one or more batch run files.");
  const results = files.map(
    (file) => JSON.parse(readFileSync(file, "utf8")) as BatchResult,
  );
  const id = `batch-${number}`;
  const { batch, bin } = toGradingBatch(combineResults(results), {
    id,
    head: execSync("git rev-parse HEAD").toString().trim(),
    at: new Date(),
  });
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
