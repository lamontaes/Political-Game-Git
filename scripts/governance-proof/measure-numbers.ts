/** Actual Day-path filings over one calendar month; never pads missing rows. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { observerPlace } from "../../src/presentation/observer-world";
import { proseDate } from "../../src/presentation/prose-dates";
import { makeIsoDate } from "../../src/simulation/dates";
import { rulePackById } from "../../src/simulation/legislature-rule-packs";
import { measureFullDesignation } from "../../src/simulation/measure-numbering";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";
import {
  isFederalDistrictUsps,
  isTerritoryUsps,
  STATES,
} from "../../src/simulation/state-reference";
import {
  createObserverDayButton,
  openWatchedWorld,
  saveAndReopen,
} from "../dev-lab/world-aging";

const seed = process.argv[2] ?? "team2-numbering-month-20260930";
const output =
  process.argv[3] ?? "test-results/governance-proof/measure-numbers.json";
const requestedWarmupDays = Number(process.argv[4] ?? 0);
if (
  !Number.isInteger(requestedWarmupDays) ||
  requestedWarmupDays < 0 ||
  requestedWarmupDays > 366
)
  throw new Error(
    "Warmup Day presses must be an integer from zero through 366.",
  );
const started = performance.now();
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const sourceDirty =
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
    .length > 0;
if (sourceDirty)
  throw new Error("Publish a clean candidate before the watched month.");
const states = Object.keys(STATES)
  .filter((key) => !isTerritoryUsps(key) && !isFederalDistrictUsps(key))
  .sort();
if (states.length !== 50)
  throw new Error("The random-state source must contain exactly fifty states.");
const selected = pickDistinct(
  new SeededRng(seed).fork("numbering-proof-states"),
  states,
  3,
);
const keys = ["US", ...selected.map((key) => `US-${key}`)];
const place = observerPlace(seed);
const watched = openWatchedWorld(seed, place.key);
const button = createObserverDayButton(watched.world);
let warmupDays = 0;
let problem: string | null = null;
while (warmupDays < requestedWarmupDays) {
  if (performance.now() - started > 10 * 60_000) {
    problem = "Ten-minute advance bound reached during warmup.";
    break;
  }
  const step = button.press();
  if (step.status !== "moved") {
    problem = step.problem;
    break;
  }
  warmupDays += 1;
}
const from = button.world.currentDate;
const date = new Date(`${from}T00:00:00Z`);
date.setUTCMonth(date.getUTCMonth() + 1);
const target = makeIsoDate(date.toISOString().slice(0, 10));
const openingSequence = button.world.history.nextSequence;
let days = 0;
console.log(
  JSON.stringify({
    status: "opening",
    sourceHead,
    seed,
    place: place.displayName,
    selectedStates: selected,
    warmupDays,
    requestedWarmupDays,
    from,
    target,
  }),
);
while (!problem && button.world.currentDate < target) {
  if (performance.now() - started > 10 * 60_000) {
    problem = "Ten-minute advance bound reached.";
    break;
  }
  const step = button.press();
  if (step.status !== "moved") {
    problem = step.problem;
    break;
  }
  days += 1;
}
let unknownPacks = 0;
const rows = (button.world.history.legislativeMeasures ?? []).flatMap(
  (measure) => {
    if (
      measure.sequence < openingSequence ||
      measure.introducedAt < from ||
      measure.introducedAt > button.world.currentDate
    )
      return [];
    let jurisdictionKey: string;
    try {
      jurisdictionKey = rulePackById(measure.rulePackId).jurisdictionKey;
    } catch {
      unknownPacks += 1;
      return [];
    }
    if (!keys.includes(jurisdictionKey)) return [];
    return [
      {
        jurisdictionKey,
        jurisdictionId: measure.jurisdictionId,
        id: measure.id,
        introducedAt: measure.introducedAt,
        chamber: measure.originChamberKey,
        designation: measure.designation,
        fullDesignation: measureFullDesignation(measure),
        session: measure.numberingSession,
        shortTitle: measure.shortTitle,
        sponsorPersonId: measure.sponsorPersonId,
      },
    ];
  },
);
const seen = new Set<string>();
const duplicates: string[] = [];
for (const row of rows) {
  const key = JSON.stringify([
    row.jurisdictionId,
    row.chamber,
    row.session?.key,
    row.designation,
  ]);
  if (seen.has(key)) duplicates.push(row.id);
  seen.add(key);
}
if (duplicates.length)
  problem ??= "Duplicate designation within a jurisdiction/chamber/session.";
const save = await saveAndReopen(button.world);
if (!save.reopenedMatches) problem ??= "Save/Continue mismatch.";
const status =
  button.world.currentDate >= target && !problem
    ? "completed-month"
    : "incomplete";
const groups = keys.map((jurisdictionKey) => ({
  jurisdictionKey,
  name:
    jurisdictionKey === "US"
      ? "Congress"
      : STATES[jurisdictionKey.slice(3)]!.name,
  rows: rows.filter((row) => row.jurisdictionKey === jurisdictionKey),
}));
const receipt = {
  seed,
  sourceHead,
  sourceDirty,
  place: place.displayName,
  placeKey: place.key,
  selectedStates: selected,
  from,
  through: button.world.currentDate,
  target,
  openingSequence,
  requestedWarmupDays,
  warmupDays,
  days,
  status,
  problem,
  elapsedMs: performance.now() - started,
  save: {
    reopenedMatches: save.reopenedMatches,
    saveMs: save.saveMs,
    reopenMs: save.reopenMs,
  },
  unknownPacks,
  duplicates,
  groups,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(receipt, null, 2));
const report = [
  "# One month of actual measure designations",
  "",
  `${days} watched-month Day presses in ${place.displayName}, after ${warmupDays} separately logged warmup presses, produced the following Congress and three random-state filing records. A group with no filings remains zero. The internal IDs and displayed names are both preserved.`,
  "",
  "## 1. Why-chain",
  "",
  "Existing officials filed measures through the normal Day path. Their recorded jurisdiction, chamber and session selected the legal/data counter. This chain ends at procedural data and filed history; no actor reason is inferred from a bill number.",
  "",
  "## 2. Research",
  "",
  "Verified fields and explicitly unverified common arrangements share one allocator. Legal numbering constants have no effect-size draw. This observation supplies no new causal rate.",
  "",
  "## 3. Revisions",
  "",
  "No measure was introduced by this collector. Opening records were excluded by canonical sequence. The report does not infer a filing where none exists.",
  "",
  "## 4. Numbered observed groups",
];
for (const [index, group] of groups.entries()) {
  report.push(
    "",
    `### ${index + 1}. ${group.name}: ${group.rows.length} filings`,
    "",
  );
  if (!group.rows.length)
    report.push("No recorded introduction during this watched month.");
  for (const row of group.rows)
    report.push(
      `- ${proseDate(row.introducedAt)}: ${row.fullDesignation}; ${row.chamber}; measure ${row.id}; jurisdiction ${row.jurisdictionId}. Saved title ${JSON.stringify(row.shortTitle)}.`,
    );
}
report.push(
  "",
  "## 5. Simulated, records, world pieces, checks",
  "",
  "SIMULATED: the normal observer Day path. RECORDS: actual measure designations and independent IDs. WORLD PIECES: existing jurisdictions, chambers and rule packs. CHECKS: no duplicate jurisdiction/chamber/session/designation among reported introductions; Save/Continue date and history counts agree. Unknown rule-pack records are excluded and counted, never assigned a fabricated jurisdiction.",
  "",
  "## 6. Proof receipt",
  "",
  `Seed ${seed}; place ${place.key}; ${proseDate(from)} through ${proseDate(button.world.currentDate)}; status ${status}.`,
  "",
  `Source \`${sourceHead}\`, clean. Save/Continue matched: ${save.reopenedMatches}. Duplicate rows: ${duplicates.length}. Unresolved rule-pack rows outside the reported groups: ${unknownPacks}.`,
  "",
  `Stop: ${problem ?? "none"}.`,
  "",
  "## 7. Worked example",
  "",
  "The canonical filed rows above are the worked examples. No synthetic example fills an empty group. This is source/runtime proof; browser interaction and person-level law effects are not established.",
  "",
);
writeFileSync(`${output}.md`, report.join("\n"));
console.log(
  JSON.stringify({
    status,
    output,
    days,
    groups: groups.map((g) => ({ name: g.name, filings: g.rows.length })),
    problem,
  }),
);
process.exit(problem ? 1 : 0);
