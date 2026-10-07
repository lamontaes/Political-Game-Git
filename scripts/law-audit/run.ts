/** Observed calendar months; old 30-day-step receipts remain distinct. */
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { openWatchedWorld } from "../dev-lab/world-aging";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import { serializeWorldPayload } from "../../src/simulation/serialization";
import { daysBetween, isoDateFromParts } from "../../src/simulation/dates";
import { proseDate } from "../../src/presentation/prose-dates";
import { nationalSummary, nationalTable } from "./national";
import { auditWorld, summarize, type AuditRow } from "./audit";
function option(name: string, fallback?: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = process.argv[at + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`--${name} needs a value`);
  return value;
}
function cell(value: unknown): string {
  return String(value ?? "none recorded")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}
export function table(rows: readonly AuditRow[]): string {
  return [
    "| Law | Jurisdiction / level | Question / answer / starting answer | Comparison | Effect / reader | Fired / reason | Record / touched / before → after |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${cell(row.designation)}: ${cell(row.title)} | ${cell(row.jurisdiction)} / ${cell(row.level)} | ${cell(row.question)} / ${cell(row.answer)} / ${cell(row.startingAnswer)} | ${row.comparison} | ${cell(row.effect)} / ${cell(row.reader)} | ${row.fired ? "yes" : "no"} / ${cell(row.reason)} | ${
          row.evidence
            .slice(0, 2)
            .map((e) =>
              cell(
                `${e.record}; ${e.touched}; ${JSON.stringify(e.before)} → ${JSON.stringify(e.after)}; ${e.detail}`,
              ),
            )
            .join("<br>") || "No attributable effect record"
        } |`,
    ),
  ].join("\n");
}
export async function main() {
  const seed = option("seed", "team2-main-proof-20260930-b")!;
  const place = option("place", "0524070")!;
  const months = Number(option("months", "24"));
  if (!Number.isSafeInteger(months) || months < 1)
    throw new Error("months must be a positive integer");
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  const watched = openWatchedWorld(seed, place);
  const opening = watched.world;
  let world = opening;
  const started = performance.now();
  const checkpoints: unknown[] = [];
  let completedMonths = 0;
  let problem: string | null = null;
  const output = option(
    "out",
    `test-results/law-audit/${place}-${head.slice(0, 12)}`,
  )!;
  mkdirSync(dirname(output), { recursive: true });
  for (let month = 1; month <= months; month++) {
    try {
      const year = Number(opening.currentDate.slice(0, 4));
      const startMonth = Number(opening.currentDate.slice(5, 7)) - 1;
      const targetYear = year + Math.floor((startMonth + month) / 12);
      const targetMonth = ((startMonth + month) % 12) + 1;
      const day = Math.min(
        Number(opening.currentDate.slice(8, 10)),
        new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate(),
      );
      const target = isoDateFromParts(targetYear, targetMonth, day);
      world = advanceObservedWorld(
        world,
        daysBetween(world.currentDate, target),
      );
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
      break;
    }
    completedMonths = month;
    const checkpoint = {
      month,
      date: world.currentDate,
      enacted: (world.history.legislativeEnactments ?? []).filter(
        (row) =>
          row.outcome === "enacted" && row.resolvedAt > opening.currentDate,
      ).length,
      elapsedSeconds: (performance.now() - started) / 1000,
    };
    checkpoints.push(checkpoint);
    writeFileSync(
      `${output}.checkpoint.json`,
      JSON.stringify(
        {
          head,
          dirty,
          seed,
          place,
          openingDate: opening.currentDate,
          checkpoint,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(checkpoint));
  }
  const keep = option("keep");
  if (keep) {
    mkdirSync(dirname(keep), { recursive: true });
    const payload = serializeWorldPayload(world);
    const chunks = typeof payload === "string" ? [payload] : payload;
    writeFileSync(keep, chunks[0]!);
    for (const chunk of chunks.slice(1)) appendFileSync(keep, chunk);
    writeFileSync(
      `${keep}.meta.json`,
      JSON.stringify(
        {
          head,
          dirty,
          seed,
          place,
          openingDate: opening.currentDate,
          historySequenceAtOpening: opening.history.nextSequence,
          currentDate: world.currentDate,
        },
        null,
        2,
      ),
    );
  }
  const rows = auditWorld(opening, world);
  const counts = summarize(rows);
  const nationwide = nationalSummary(world, rows);
  const congress = (world.history.legislativeMeasures ?? []).filter(
    (measure) =>
      world.jurisdictions[measure.jurisdictionId]?.kind === "federal" &&
      measure.introducedAt > opening.currentDate &&
      measure.sequence >= opening.history.nextSequence,
  );
  const receipt = {
    head,
    dirty,
    seed,
    place,
    placeName: watched.placeName,
    months,
    completedMonths,
    openingDate: opening.currentDate,
    currentDate: world.currentDate,
    elapsedSeconds: (performance.now() - started) / 1000,
    problem,
    counts,
    nationwide,
    congressIntroductions: congress.length,
    checkpoints,
    rows,
    limits: [
      "Stamped consequences are attributed only when their canonical governing measure matches at application. Stamp alone is not proof. Stamped mechanism rows may overlap unstamped registered-path rows; counts are adapter rows, not unique physical effects.",
      "Coverage includes registered direct paths, all outcome links fed by each question, news records and pinned trace text. Additional trace effects without adapters remain unmeasured.",
      "Missing attributable records are evidence gaps, not proof of no physical effect.",
      "Place effects require a saved non-neutral link factor and this exact operative measure. Aggregate drift alone is not attributed to law.",
      "No save/reopen or independent speed claim is made by this audit.",
    ],
  };
  writeFileSync(`${output}.json`, JSON.stringify(receipt, null, 2));
  writeFileSync(
    `${output}.md`,
    `# Nationwide enacted-law audit (starting place: ${watched.placeName})\n\nThe watched run audited ${counts.lawsAudited} enacted laws. ${counts.effectsFiring} effect rows have attributable records; ${counts.effectsMissing} lack proof or have a recorded limit. Research identifies ${counts.effectsAboutZero} about-zero effect rows. These counts do not establish complete coverage of every supported consequence.\n\n## Why-chain\n\nEnactment supplies answers. Current-law readers resolve jurisdiction, rank and dates. The audit follows saved effect records and keeps missing attribution separate from no effect. The terminal for an unproven row is an absent record or an unmeasured reader.\n\n## Research\n\nThe JSON includes each outcome link's source, size, range, delay and status, plus exact pinned trace references. No new sizes or legal power are inferred.\n\n## Revisions\n\nPlain yes/no laws can activate readers. Typed provisions are not required by this audit. Repeated starting answers are labeled without suppressing observed effects.\n\n## Numbered parts\n\n1. Reusable seed/place/month runner.\n2. One row for each registered law effect, including unsized and inert links.\n3. Explicit evidence gaps for readers without attributable records.\n\n## Simulated, records, world pieces, checks\n\nThe normal observer advances to successive calendar-month anniversaries. Canonical records supply evidence. Missing reader coverage remains a world or audit gap. Counts are observed records, not inferred outcomes.\n\n${nationalTable(nationwide)}\n\n${table(rows)}\n\n## Proof run\n\nSource ${head}; dirty paths: ${dirty || "none"}. Seed ${seed}; place ${place}. Completed ${completedMonths} of ${months} steps from ${proseDate(opening.currentDate)} through ${proseDate(world.currentDate)}. Problem: ${problem ?? "none"}. No save/reopen or speed acceptance is claimed.\n\nCounts per reason: ${JSON.stringify(counts.reasons)}. Congress introductions: ${congress.length}; monthly classification remains pending.\n\n## Worked example\n\nNamed records and before/after values are in each row and the JSON. A missing example remains missing. A place multiplier alone does not prove a person's consequence.\n`,
  );
  console.log(
    JSON.stringify({
      output,
      ...counts,
      congressIntroductions: congress.length,
      problem,
    }),
  );
  if (problem) process.exitCode = 1;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
