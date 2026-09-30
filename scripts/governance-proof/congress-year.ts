/** Read-only receipt around actual Day presses; never creates a filing. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { observerPlace } from "../../src/presentation/observer-world";
import { proseDate } from "../../src/presentation/prose-dates";
import { isCongressMeasure } from "../../src/simulation/governing/congress-chambers";
import { CONGRESS_INTAKE_TRANSITION } from "../../src/simulation/governing/congress-lawmaking";
import { measurePosition } from "../../src/simulation/legislation";
import {
  anniversary,
  createObserverDayButton,
  openWatchedWorld,
  saveAndReopen,
} from "../dev-lab/world-aging";

const seed = process.argv[2] ?? "team2-numbering-month-20260930";
const output =
  process.argv[3] ?? "test-results/governance-proof/congress-year.json";
const collectorHead =
  process.env.OCD_CONGRESS_COLLECTOR_HEAD ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim())
  throw new Error("Publish a clean candidate before the watched year.");
const started = performance.now();
const place = observerPlace(seed);
const watched = openWatchedWorld(seed, place.key);
const button = createObserverDayButton(watched.world);
const from = watched.world.currentDate;
const target = anniversary(from, 1);
const openingSequence = watched.world.history.nextSequence;
const intakes: {
  dueItemId: string;
  dueAt: string;
  resolvedAt: string;
  context: string | null;
  introducedMeasureIds: string[];
}[] = [];
let days = 0;
let problem: string | null = null;
let lastProgress = performance.now();
console.log(
  JSON.stringify({
    status: "opening",
    sourceHead,
    collectorHead,
    seed,
    place: place.displayName,
    from,
    target,
  }),
);
while (button.world.currentDate < target) {
  if (performance.now() - started > 20 * 60_000) {
    problem = "Twenty-minute advance bound reached.";
    break;
  }
  const before = button.world;
  const step = button.press();
  if (step.status !== "moved") {
    problem = step.problem;
    break;
  }
  days += 1;
  const next = button.world;
  const newMeasures = (next.history.legislativeMeasures ?? [])
    .slice((before.history.legislativeMeasures ?? []).length)
    .filter(isCongressMeasure);
  for (const state of next.history.futureDueItemStates.slice(
    before.history.futureDueItemStates.length,
  )) {
    if (state.status !== "resolved") continue;
    const due = next.history.futureDueItems.find(
      (row) => row.id === state.dueItemId,
    );
    if (due?.transitionKey !== CONGRESS_INTAKE_TRANSITION) continue;
    intakes.push({
      dueItemId: due.id,
      dueAt: due.dueAt,
      resolvedAt: state.effectiveAt,
      context: state.context,
      introducedMeasureIds: newMeasures
        .filter(
          (measure) =>
            measure.stableKey.endsWith(`:${due.dueAt}:house`) ||
            measure.stableKey.endsWith(`:${due.dueAt}:senate`),
        )
        .map((measure) => measure.id),
    });
  }
  if (performance.now() - lastProgress >= 15_000) {
    console.log(
      JSON.stringify({
        status: "advancing",
        days,
        currentDate: next.currentDate,
        introductions: (next.history.legislativeMeasures ?? []).filter(
          (row) => isCongressMeasure(row) && row.sequence >= openingSequence,
        ).length,
      }),
    );
    lastProgress = performance.now();
  }
}
const world = button.world;
const measures = (world.history.legislativeMeasures ?? [])
  .filter(
    (row) =>
      isCongressMeasure(row) &&
      row.sequence >= openingSequence &&
      row.introducedAt >= from &&
      row.introducedAt <= world.currentDate,
  )
  .map((measure) => ({
    id: measure.id,
    designation: measure.designation,
    chamber: measure.originChamberKey,
    introducedAt: measure.introducedAt,
    sponsorPersonId: measure.sponsorPersonId,
    position: measurePosition(world, measure.id),
    actions: (world.history.legislativeActions ?? [])
      .filter((row) => row.measureId === measure.id)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        occurredAt: row.occurredAt,
        committeeKey: row.committeeKey,
        rationale: row.rationale,
      })),
  }));
const missingIntroductions = measures
  .filter((row) => !row.actions.some((action) => action.kind === "introduced"))
  .map((row) => row.id);
if (missingIntroductions.length)
  problem ??=
    "A filed Congress measure lacks its canonical introduction action.";
const save = await saveAndReopen(world);
if (!save.reopenedMatches) problem ??= "Save/Continue date/history mismatch.";
if (
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    sourceHead ||
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
)
  throw new Error("Runtime source changed during the watched year.");
const counts = {
  filedMeasures: measures.length,
  introductionActions: measures
    .flatMap((row) => row.actions)
    .filter((row) => row.kind === "introduced").length,
  referredMeasures: measures.filter((row) =>
    row.actions.some((action) => action.kind === "referred"),
  ).length,
  measuresWithLaterAction: measures.filter((row) =>
    row.actions.some((action) => action.kind !== "introduced"),
  ).length,
  resolvedIntakes: intakes.length,
  falseFiledSummaries: intakes.filter(
    (row) =>
      row.context === "Members of Congress filed their bills." &&
      row.introducedMeasureIds.length === 0,
  ).length,
};
const receipt = {
  status:
    world.currentDate >= target && !problem ? "completed-year" : "incomplete",
  sourceHead,
  collectorHead,
  sourceDirty: false,
  seed,
  place: place.displayName,
  placeKey: place.key,
  from,
  through: world.currentDate,
  target,
  openingSequence,
  days,
  elapsedMs: performance.now() - started,
  counts,
  missingIntroductions,
  intakes,
  measures,
  save: {
    reopenedMatches: save.reopenedMatches,
    saveMs: save.saveMs,
    reopenMs: save.reopenMs,
  },
  problem,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(receipt, null, 2));
const report = [
  "# Congress intake summaries and actual bills over one watched year",
  "",
  `${days} Day presses in ${place.displayName} produced ${counts.filedMeasures} new Congress measures, ${counts.introductionActions} introduction actions and ${counts.referredMeasures} measures with a recorded referral. ${counts.falseFiledSummaries} resolved intake summaries claimed filing with no new measure. A zero count is retained.`,
  "",
  "## 1. Why-chain",
  "",
  "A seated member proposes from their own saved principles. The existing majority caucus and chamber backing predicates decide whether a bill is selected. A selected bill goes through the canonical introduction writer and schedules a sitting. The intake summary must count the actual resulting measures. The decision chain ends at saved principle records and their authored formation draws; the reporting chain ends at canonical history. No majority threshold was relaxed.",
  "",
  "## 2. Research",
  "",
  "This is a consistency check of recorded work, not a researched filing rate. The monthly intake and Tuesday/Thursday sittings are authored calendar assumptions. Constituents, leadership, donors, groups, news and reintroductions are not all represented by the principle-only producer.",
  "",
  "## 3. Revisions",
  "",
  "The reporting repair counts only new Congress measure IDs. It preserves selection, thresholds, introduction writers, referrals and scheduling. It creates no new causal size, legal authority or actor action.",
  "",
  "## 4. Numbered observed parts",
  "",
  `1. Filed Congress measures: ${counts.filedMeasures}; introduction actions: ${counts.introductionActions}.`,
  "",
  `2. Referred measures: ${counts.referredMeasures}; measures with a later institutional action: ${counts.measuresWithLaterAction}.`,
  "",
  `3. Resolved intake records: ${counts.resolvedIntakes}; false filed summaries: ${counts.falseFiledSummaries}.`,
  "",
  "## 5. Simulated, records, world pieces, checks",
  "",
  "SIMULATED: normal observer Day presses. RECORDS: exact introduction, action and due-item histories. WORLD PIECES: existing members, principles, questions, rule pack and committees. CHECKS: every new filed measure has an introduction action; absence of a bill remains absence. Zero bills does not prove a referral worked. Save/Continue compares date and history counts; the known placeholder byte count is not evidence of payload size.",
  "",
  "## 6. Proof run",
  "",
  `Seed ${seed}; ${proseDate(from)} through ${proseDate(world.currentDate)}; ${receipt.status}. Runtime source \`${sourceHead}\`; collector \`${collectorHead}\`. Save/Continue matched: ${save.reopenedMatches}; missing introductions: ${missingIntroductions.length}; stop: ${problem ?? "none"}.`,
  "",
  "## 7. Worked example",
  "",
  ...intakes.map(
    (row) =>
      `${proseDate(row.resolvedAt)}: ${JSON.stringify(row.context)}; ${row.introducedMeasureIds.length} new measures; due item ${row.dueItemId}.`,
  ),
  "",
  "The attached JSON preserves every new measure and subsequent action. An empty section supplies no invented sponsor or motive.",
  "",
];
writeFileSync(`${output}.md`, report.join("\n"));
console.log(
  JSON.stringify({
    status: receipt.status,
    days,
    through: receipt.through,
    counts,
    output,
    problem,
  }),
);
process.exit(problem ? 1 : 0);
