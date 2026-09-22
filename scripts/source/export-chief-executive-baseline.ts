/**
 * `npm run export:chief-executive-baseline` — the NATIONWIDE1 chief-executive
 * research baseline, as a module the browser build can read.
 *
 * One row per state and for the District of Columbia: which office is that
 * jurisdiction's chief executive and how many years its ordinary full term
 * runs, with the source that was read and the class of evidence it is.
 *
 * This is RESEARCH, not admitted law. Nothing here is a rule the game applies
 * by itself: `state-executive-term-rules.ts` uses the term length to calibrate
 * its own disclosed game profile, and says so wherever a player inspects the
 * office. A value RULES admits through the rules-capability port still wins
 * over both.
 *
 * Regenerate with `npm run export:chief-executive-baseline`; `--check` fails
 * when the committed module has drifted from the research file.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { format } from "prettier";

import { REPO_ROOT } from "./registry";

export const CHIEF_EXECUTIVE_BASELINE_INPUT_PATH =
  "data/research/nationwide1/chief-executive-baseline-51.json";

export const CHIEF_EXECUTIVE_BASELINE_OUTPUT_PATH =
  "src/simulation/nationwide-world/chief-executive-baseline.generated.ts";

interface ResearchRow {
  readonly key: string;
  readonly name: string;
  readonly kind: string;
  readonly officeKind: string;
  readonly ordinaryTermYears: number;
  readonly source: string;
  readonly sourceLocator: string;
  readonly evidenceClass: string;
  readonly checkedOn: string;
  readonly limits: string;
}

interface ResearchFile {
  readonly schemaVersion: string;
  readonly origin: Readonly<Record<string, string>>;
  readonly runtimeAdmitted: boolean;
  readonly scope: string;
  readonly checkedOn: string;
  readonly rows: readonly ResearchRow[];
}

function readResearch(): ResearchFile {
  return JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, CHIEF_EXECUTIVE_BASELINE_INPUT_PATH),
      "utf-8",
    ),
  ) as ResearchFile;
}

export async function renderChiefExecutiveBaselineModule(): Promise<string> {
  const research = readResearch();
  if (research.runtimeAdmitted)
    throw new Error(
      "The chief-executive baseline is research input. A file claiming runtime admission is not this input.",
    );
  const keys = research.rows.map((row) => row.key);
  if (new Set(keys).size !== keys.length)
    throw new Error("Two rows claim the same jurisdiction key.");
  const rows = [...research.rows].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const meta = {
    schemaVersion: research.schemaVersion,
    origin: research.origin,
    scope: research.scope,
    checkedOn: research.checkedOn,
    rowCount: rows.length,
    runtimeAdmitted: false,
    excerptRetrieved: false,
  };
  const text = [
    "/**",
    " * GENERATED — do not edit by hand.",
    " *",
    " * Written by `scripts/source/export-chief-executive-baseline.ts` from",
    ` * \`${CHIEF_EXECUTIVE_BASELINE_INPUT_PATH}\`, the NATIONWIDE1 research input.`,
    " * Research evidence, never admitted law. Regenerate with",
    " * `npm run export:chief-executive-baseline`.",
    " */",
    "",
    `export const CHIEF_EXECUTIVE_BASELINE_META = ${JSON.stringify(meta, null, 2)} as const;`,
    "",
    "/** One JSON string, parsed once on first use. */",
    `export const CHIEF_EXECUTIVE_BASELINE_ROWS: string = ${JSON.stringify(
      JSON.stringify(rows),
    )};`,
    "",
  ].join("\n");
  // Committed source is formatted source; the gate checks both.
  return format(text, { parser: "typescript" });
}

if (process.argv[1]?.endsWith("export-chief-executive-baseline.ts")) {
  const text = await renderChiefExecutiveBaselineModule();
  const outputPath = resolve(REPO_ROOT, CHIEF_EXECUTIVE_BASELINE_OUTPUT_PATH);
  if (process.argv.includes("--check")) {
    const committed = readFileSync(outputPath, "utf-8");
    if (committed !== text) {
      console.error(
        `${CHIEF_EXECUTIVE_BASELINE_OUTPUT_PATH} does not match the research input. Run npm run export:chief-executive-baseline.`,
      );
      process.exit(1);
    }
    console.log(
      `export:chief-executive-baseline --check: ${CHIEF_EXECUTIVE_BASELINE_OUTPUT_PATH} matches the research input.`,
    );
  } else {
    writeFileSync(outputPath, text, "utf-8");
    console.log(
      `export:chief-executive-baseline wrote ${CHIEF_EXECUTIVE_BASELINE_OUTPUT_PATH} (${text.length} bytes).`,
    );
  }
}
