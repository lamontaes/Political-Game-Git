import { readFileSync } from "node:fs";
import type { LifeFile, RunReceipt } from "./contract";
import { evaluateLife, type StepEvaluation } from "./evaluator";
import { ONE, ZERO } from "./parameters";

export interface ReportRun {
  receipt: RunReceipt;
  path: string;
}

function evidence(file: string, needle: string): string {
  const line = readFileSync(file, "utf8")
    .split("\n")
    .findIndex((text) => text.includes(needle));
  if (line < ZERO) throw new Error(`Report evidence moved: ${file}`);
  return `\`${file}:${line + ONE}\``;
}

function status(step: StepEvaluation): string {
  if (step.checkpointPast)
    return step.initialized ? "Past state verified" : "Past state unverified";
  if (step.reproduced)
    return step.chainBrokenBy.length === ZERO
      ? "Matching result and prior links"
      : "Matching result; prior links broke";
  return step.representation === "records-only"
    ? "Label only; no matching result"
    : step.representation === "missing"
      ? "No representation"
      : "Behavior exposed; no matching result";
}

const dateText = (date: string): string =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

/** Developer audit prose only. Every result comes from dated canonical receipts. */
export function renderGapReport(life: LifeFile, runs: ReportRun[]): string {
  if (runs.length === ZERO)
    throw new Error("A gap report needs a measured run");
  const rows = runs.map(({ receipt, path }) => ({
    receipt,
    path,
    evaluation: evaluateLife(life, receipt),
  }));
  const birth = rows.filter(
    ({ receipt }) => receipt.startDate === life.birth.value.date,
  );
  const tableRuns = birth.length > ZERO ? birth : rows;
  const sourceOnly = rows.every(
    ({ receipt }) => receipt.core.id === "old-core/source-only-v1",
  );
  const reproduced = rows.reduce(
    (count, row) => count + row.evaluation.summary.reproduced,
    ZERO,
  );
  const lines = [
    `# ${life.identity.value.name}: ${reproduced === ZERO ? "no documented path reproduced" : "measured replay results"}`,
    "",
    sourceOnly
      ? `The sourced old-core runs reproduced ${reproduced} documented steps across ${rows.length} runs. The subject aged and the clock reached the recorded dates. The adapter could store event labels, but it did not establish the family, work, civic, or political state needed for this life. These results identify missing replay bindings and background state. They do not establish how the full populated game would behave.`
      : `The evaluator found ${reproduced} reproduced steps across ${rows.length} runs. The table separates record support from measured consequences. Supplied past facts and forced selections do not count as independently reproduced outcomes.`,
    "",
    "## Why the path broke",
    "",
    `Measured: the evaluator requires dated engine observations with record IDs for each target. A stored label or forced selection cannot satisfy that test. ${evidence("scripts/life-replay/evaluator.ts", 'observation.origin === "engine"')}`,
    "",
    "| Start | Mode | Steps | Labels only | Reproduced | Outside bounds | Unmeasured bounds | First broken link |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      ({ receipt, evaluation }) =>
        `| ${receipt.startDate} | ${receipt.mode} | ${evaluation.summary.total} | ${evaluation.summary.recordsOnly} | ${evaluation.summary.reproduced} | ${evaluation.summary.outOfRange} | ${evaluation.summary.unmeasuredRanges} | ${evaluation.firstBreak?.stepId ?? "None"} |`,
    ),
    "",
  ];
  if (sourceOnly)
    lines.push(
      `Measured: all supported steps below have generic event-label storage. The capability probe runs the canonical event writer on a discarded fork. It proves label storage, without validating the factual payload or changing the live world. ${evidence("scripts/life-replay/old-core.ts", "const probe = record(")}`,
      "",
      `Measured: initialization creates one subject and a birthplace. Family, employers, offices, and an electorate remain absent. Past checkpoint labels do not initialize active education, jobs, residences, or offices. ${evidence("scripts/life-replay/old-core.ts", "initialize(setup: CoreSetup)")}`,
      "",
      `Measured: era inputs and external events create audit labels without running state-changing handlers. The result is an adapter gap; native law and election systems were not exercised by this world. ${evidence("scripts/life-replay/old-core.ts", "input(input: WorldInput)")}`,
      "",
      `Inferred: god mode can control available native life-situation choices, but the adapter cannot interrupt internal old-clock decisions. Documented career actions need bindings to actual enabled decisions before their consequences can be tested. ${evidence("scripts/life-replay/old-core.ts", "decisions(): CoreDecision[]")}`,
      "",
    );
  lines.push(
    `Measured: prior links remain broken until their results or initialized past state are verified. The dependency list is a continuity check, not a claim that one historical event caused another. ${evidence("scripts/life-replay/evaluator.ts", "const chainBrokenBy")}`,
    "",
    `| Documented step | Source date window | ${tableRuns.map(({ receipt }) => receipt.mode).join(" | ")} | Public evidence |`,
    `| --- | --- | ${tableRuns.map(() => "---").join(" | ")} | --- |`,
  );
  for (const step of life.timeline) {
    const sources = step.sourceRefs.map((id) => {
      const citation = life.sources.find((source) => source.id === id)!;
      return `[${citation.publisher.replaceAll("|", "/")}](${citation.url})`;
    });
    lines.push(
      `| ${step.id} (${step.kind}) | ${step.date.earliest} through ${step.date.latest} | ${tableRuns.map(({ evaluation }) => status(evaluation.steps.find((row) => row.stepId === step.id)!)).join(" | ")} | ${sources.join("; ")} |`,
    );
  }
  lines.push("", "## Numbers and background", "");
  for (const { receipt, evaluation } of rows) {
    const ranges = evaluation.steps.flatMap((step) =>
      step.ranges.map((range) => ({ step, range })),
    );
    if (ranges.length > ZERO)
      lines.push(
        `Measured: ${receipt.mode} from ${dateText(receipt.startDate)} checked ${ranges.length} numeric bounds; ${evaluation.summary.outOfRange} were outside and ${evaluation.summary.unmeasuredRanges} were unmeasured. ${evidence("scripts/life-replay/evaluator.ts", "const ranges =")}`,
        "",
        ...ranges.map(
          ({ step, range }) =>
            `- ${step.stepId}, ${range.metric}: ${range.status}; actual ${range.actual ?? "unavailable"}, minimum ${range.minimum ?? "none"}, maximum ${range.maximum ?? "none"}.`,
        ),
        "",
      );
  }
  lines.push(
    "Historical point targets are exact comparisons, not population ranges. Legal age bounds test eligibility only. An unmeasured number does not pass the bound.",
    "",
    "The source file lists these public-data gaps:",
    "",
    ...life.unknowns.map((unknown) => `- ${unknown.field}: ${unknown.reason}`),
    "",
    `Inferred: retrospective annual statistics, adult faith descriptions, and endogenous later law outcomes must remain references rather than early world inputs. The runner excludes rows marked as references. ${evidence("scripts/life-replay/runner.ts", 'input.role !== "reference"')}`,
    "",
    "## What happens next",
    "",
    "P9 supplies the sourced data, runner, evaluator, and these gaps. P8 owns world initialization, typed event handlers, ordinary decision scoring, and measured consequences. Each missing binding must expose actual records through the versioned interface before the same replay can validate it.",
    "",
    `The mechanisms this life needs are ${[...new Set(life.timeline.map((step) => step.mechanism))].join(", ")}. Unavailable facts remain explicit gaps; they must not become invented private attributes.`,
    "",
    "## Method",
    "",
    "Diagnostic audit run in the worker's cloud environment. No player screen was exercised. Each receipt came from its own Node subprocess with a documented timeout. The life files and public citations remain developer data.",
    "",
    ...rows.map(
      ({ receipt, path }) =>
        `- ${receipt.mode}, ${dateText(receipt.startDate)} through ${dateText(receipt.endDate)}: ${receipt.simulatedDays} simulated days; horizon ${receipt.complete ? "complete" : "incomplete"}. Runner time: ${receipt.elapsedMilliseconds} milliseconds. Peak process RSS: ${receipt.peakRssBytes} bytes. Receipt: [${path.split("/").at(-ONE)}](${path}). Core revision: ${receipt.core.revision}.`,
    ),
    "",
    "Runner time excludes module import and subprocess startup. Peak RSS includes the process lifetime. A one-subject world without ordinary scheduled population activity cannot establish normal-year throughput. Adjacent manifests record the source hashes, Node version, and whether the measured source was clean.",
    "",
  );
  return lines.join("\n");
}
