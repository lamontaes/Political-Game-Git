import fs from "node:fs";
import path from "node:path";

import { derivePersonAppearance } from "../../src/simulation/person-appearance";
import {
  FRAMING_RATIOS,
  measureFigureFraming,
  type FigureFramingReport,
  type FigureMeasurement,
} from "./figure-framing";

/**
 * Composes deterministic review people into every registered room the project
 * can paint, and writes down what the shell would actually put on screen:
 * how tall the figure ends up, whether its feet meet the floor the anchor
 * declares, whether it escapes the plate, where each head, hair and garment
 * lands against the body anchor it attaches to, and exactly which assets the
 * compositor refused.
 *
 * This runs under Vitest rather than as a bare node CLI, because the runtime
 * visual library resolves its asset urls through Vite's `import.meta.glob` and
 * there is no second, node-only way to ask what art exists. A report generated
 * from a different index than the one the game loads would be a report about
 * nothing. `npm run measure:figures` therefore drives the test that calls this.
 *
 * The report approves nothing, promotes nothing, and derives no physical
 * measurement — see the header of `figure-framing.ts` for the confidence rules.
 */

export const FIGURE_FRAMING_DIRECTORY =
  "docs/agent/evidence/ui903-figure-framing";

/**
 * Four deterministic review people rather than one.
 *
 * Identity is owned by the person and derived from their id, so different ids
 * resolve to different body families, and a registration defect that only
 * shows on one body is exactly the kind this is for. These are ordinary
 * appearances; nothing downstream can tell they were chosen for a review.
 */
const SUBJECTS = [0, 1, 2, 3].map((index) => ({
  personId: `review-subject-${index}`,
  displayName: `Review subject ${index}`,
  appearance: derivePersonAppearance(`review-subject-${index}`),
}));

/** Placements where an unfitted component missed its declared anchor. */
export function misregistered(
  report: FigureFramingReport,
): readonly FigureMeasurement[] {
  return report.measurements.filter((row) =>
    row.layers.some(
      (layer) =>
        layer.originResidual !== null &&
        !layer.originResidual.fitted &&
        (Math.abs(layer.originResidual.x.value) > 0.001 ||
          Math.abs(layer.originResidual.y.value) > 0.001),
    ),
  );
}

/** Placements where the figure's feet missed the anchor's contact line. */
export function offTheFloor(
  report: FigureFramingReport,
): readonly FigureMeasurement[] {
  return report.measurements.filter(
    (row) =>
      row.contactResidualPercent !== null &&
      Math.abs(row.contactResidualPercent.value) > 0.5,
  );
}

function summarise(report: FigureFramingReport, mode: string): string {
  const rows = report.measurements;
  const drew = rows.filter((row) => row.composedHeightPercent !== null);
  const byClass: Record<string, number> = {};
  for (const row of rows)
    byClass[row.artClass] = (byClass[row.artClass] ?? 0) + 1;
  const complete = rows.filter((row) => row.completeRecipe).length;
  const lines = [
    `### ${mode}`,
    "",
    `- placements measured: ${rows.length}`,
    `- placements where some layer drew: ${drew.length}`,
    `- of those, COMPLETE recipes (compositor reported nothing): ${complete}`,
    `- partial draws (drew, but a slot or pose was reported): ${drew.length - complete}`,
    `- by output class: ${JSON.stringify(byClass)}`,
    `- feet off the declared contact line by more than 0.5% of the plate: ${offTheFloor(report).length}`,
    `- figures escaping the plate: ${drew.filter((row) => row.cropped === true).length}`,
    `- unfitted components not landing on their declared anchor: ${misregistered(report).length}`,
    "",
  ];
  const heights = drew
    .map((row) => row.fittedHeightPercent?.value ?? 0)
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  if (heights.length > 0)
    lines.push(
      `Fitted figure height spans ${heights[0]!.toFixed(1)}% to ` +
        `${heights[heights.length - 1]!.toFixed(1)}% of the plate.`,
      "",
    );
  return lines.join("\n");
}

function needsSection(report: FigureFramingReport): string {
  if (report.remainingAssetNeeds.length === 0)
    return "Nothing was refused in this pass.\n";
  return `${report.remainingAssetNeeds.map((need) => `- ${need}`).join("\n")}\n`;
}

function merge(reports: readonly FigureFramingReport[]): FigureFramingReport {
  const measurements: FigureMeasurement[] = [];
  const needs = new Set<string>();
  const rooms = new Set<string>();
  for (const report of reports) {
    measurements.push(...report.measurements);
    for (const need of report.remainingAssetNeeds) needs.add(need);
    for (const room of report.roomsWithoutFloorCalibration) rooms.add(room);
  }
  return {
    ...reports[0]!,
    measurements,
    remainingAssetNeeds: [...needs].sort(),
    roomsWithoutFloorCalibration: [...rooms].sort(),
  };
}

export function measureEveryPlacement(): {
  readonly production: FigureFramingReport;
  readonly candidate: FigureFramingReport;
} {
  return {
    production: merge(
      SUBJECTS.map((subject) =>
        measureFigureFraming({ ...subject, candidate: false }),
      ),
    ),
    candidate: merge(
      SUBJECTS.map((subject) =>
        measureFigureFraming({ ...subject, candidate: true }),
      ),
    ),
  };
}

export function renderFigureFramingMarkdown(
  production: FigureFramingReport,
  candidate: FigureFramingReport,
): string {
  const rooms = candidate.roomsWithoutFloorCalibration;
  const roomList =
    rooms.length === 0
      ? "None.\n"
      : `${rooms.map((room) => `- \`${room}\``).join("\n")}\n`;
  return [
    "# Figure framing and registration, measured",
    "",
    "Generated by `npm run measure:figures`. A development diagnostic: it",
    "approves no art, promotes nothing, and derives no physical measurement.",
    "",
    "## What this report does NOT establish",
    "",
    "Read this before quoting a number out of it. An earlier version of this",
    "file was cited as though it certified the generator; it does not, and the",
    "limits below are the reasons.",
    "",
    "- It composes plans DIRECTLY from a library. It does not go through the",
    "  ordinary runtime path, so it does not exercise the production",
    "  fixture/calibration refusals that decide what a player actually sees.",
    "  A count here is never a count of people in a playable room.",
    "- The four synthetic review subjects are not a cast. They say what the",
    "  compositor does with four identities, not what a generated household",
    "  looks like.",
    "- The registration check compares DECLARED origins against DECLARED body",
    "  anchors, and deliberately excludes fitted layers. It therefore says",
    "  nothing about whether a fitted garment's shoulder or neck geometry is",
    "  right. Only looking at the picture answers that.",
    "- The contact residual is the reserved box's bottom edge against the",
    "  anchor's contact line. It is not a measurement of visible sole pixels;",
    "  a figure with transparent padding under its feet would still read zero.",
    "- Off-plate crops are reported, not excluded. A cropped figure is a known",
    "  failure that stays recorded until the art or the anchor is repaired.",
    "",
    candidate.note,
    "",
    "Every number in `figure-framing.json` carries its own confidence class.",
    "`exact` means read from authored data, or computed from it by arithmetic",
    "that adds no information. `visual-estimate` means a proportion this tool",
    "assumes about human figures, which nobody measured — the standing and",
    "seated height ratios are the only two, and they are the same constants",
    "the runtime uses.",
    "",
    "## What the shell composes",
    "",
    summarise(production, "Production libraries"),
    summarise(
      candidate,
      "Candidate review libraries (development preview only)",
    ),
    "## Rooms that declare no floor calibration",
    "",
    "A room without a standard body width has no measurement to size a body",
    "against. That is a missing measurement, and the fix is to measure it —",
    "not to copy an estimate out of this report into the scene data.",
    "",
    roomList,
    "## Exact remaining asset needs",
    "",
    "Taken from the compositor's own refusals rather than from inspection, so",
    "this list says what the pipeline will actually reject, in its own words.",
    "",
    needsSection(candidate),
  ].join("\n");
}

export function writeFigureFramingReport(outDir = FIGURE_FRAMING_DIRECTORY): {
  readonly production: FigureFramingReport;
  readonly candidate: FigureFramingReport;
} {
  const out = path.resolve(outDir);
  const { production, candidate } = measureEveryPlacement();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "figure-framing.json"),
    `${JSON.stringify({ production, candidate, ratios: FRAMING_RATIOS }, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(out, "figure-framing.md"),
    renderFigureFramingMarkdown(production, candidate),
    "utf8",
  );
  return { production, candidate };
}
