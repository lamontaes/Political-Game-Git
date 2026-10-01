/**
 * Export what states pay their governor and legislators, from the locked
 * Book of the States tables.
 *
 * Reads the saved table pages in `data/source/book-of-the-states/raw/`
 * (The Book of the States 2023, Council of State Governments: table 4.3, The
 * Governors, table 3.9, Legislative Compensation, and table 5.4, Compensation
 * of Judges) and writes
 * `src/simulation/office-pay.generated.ts`: one annual salary in whole dollars
 * per state or territory. Governor salaries are as of January 1, 2022;
 * legislator salaries are the 2023 regular-session annual salary.
 *
 * Only a plain annual figure is written. A legislature paid a per diem, a
 * weekly amount, or two different salaries by chamber (Utah, Vermont,
 * Virginia), or nothing, is left out rather than written as zero or guessed.
 * Run with `npm run export:office-pay`; `-- --check` fails when the committed
 * output is stale.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { STATES } from "../../../src/simulation/state-reference";

export const OFFICE_PAY_OUTPUT_PATH = "src/simulation/office-pay.generated.ts";
const RAW = "data/source/book-of-the-states/raw";
const LOCK = "data/source/book-of-the-states/artifact-lock.json";
const UPDATES = "data/source/office-pay-updates/updates.json";

const decode = (text: string) =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();

function tableRows(file: string): string[][] {
  const html = readFileSync(`${RAW}/${file}`, "utf8");
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1]!.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) =>
      decode(cell[1]!),
    ),
  );
}

const usps = new Map(
  Object.entries(STATES).map(([code, state]) => [state.name, code]),
);
usps.set("Northern Mariana Islands", "MP");
usps.set("U.S. Virgin Islands", "VI");
usps.set("American Samoa", "AS");
usps.set("Guam", "GU");
usps.set("Puerto Rico", "PR");
const codeFor = (name: string): string | null =>
  usps.get(name.replace(/[*†‡]+$/g, "").trim()) ?? null;

/** A single plain annual dollar figure, or null. */
function plainDollars(text: string): number | null {
  const match = /^\$?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\.?$/.exec(
    text.trim(),
  );
  return match ? Number(match[1]!.replace(/,/g, "")) : null;
}

export function renderOfficePayModule(): string {
  const governors = new Map<string, number>();
  for (const cells of tableRows("table-2023-4-3.html")) {
    const code = cells[1] ? codeFor(cells[1]) : null;
    const dollars = cells[2] ? plainDollars(cells[2]) : null;
    if (code && dollars !== null && dollars > 0) governors.set(code, dollars);
  }
  const legislators = new Map<string, number>();
  for (const cells of tableRows("table-2023-3-9.html")) {
    const code = cells[1] ? codeFor(cells[1]) : null;
    const dollars = cells[3] ? plainDollars(cells[3]) : null;
    // The saved page holds the table twice: first with 2022 figures (mileage
    // 58.5 cents), then with the 2023 figures the title names (65.5 cents).
    // Later rows replace earlier ones, so the 2023 figure stands.
    if (code && dollars !== null && dollars > 0) legislators.set(code, dollars);
  }
  // Table 5.4: the general trial courts' salary is the last column.
  const judges = new Map<string, number>();
  for (const cells of tableRows("table-2023-5-4.html")) {
    const code = cells[1] ? codeFor(cells[1]) : null;
    const dollars = cells[8] ? plainDollars(cells[8]) : null;
    if (code && dollars !== null && dollars > 0) judges.set(code, dollars);
  }
  // A newer official source than the 2023 tables replaces that state's row.
  const updates = (
    JSON.parse(readFileSync(UPDATES, "utf8")) as {
      updates: {
        office: "governor" | "state-legislator" | "trial-court-judge";
        state: string;
        annualDollars: number;
        effectiveFrom: string;
        source: string;
      }[];
    }
  ).updates;
  for (const update of updates) {
    const table =
      update.office === "governor"
        ? governors
        : update.office === "trial-court-judge"
          ? judges
          : legislators;
    table.set(update.state, update.annualDollars);
  }
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as {
    asOf: string;
    artifacts: { sha256: string }[];
  };
  const meta = {
    source:
      "Council of State Governments, The Book of the States 2023, table 4.3 (governors' salaries, as of January 1, 2022) and table 3.9 (legislators' annual salary, 2023) and table 5.4 (general trial court judges' salary).",
    lockedSha256: lock.artifacts.map((artifact) => artifact.sha256),
    asOf: lock.asOf,
    governors: governors.size,
    legislators: legislators.size,
    judges: judges.size,
    newerThanTables: updates.map((update) => ({
      office: update.office,
      state: update.state,
      annualDollars: update.annualDollars,
      effectiveFrom: update.effectiveFrom,
      source: update.source,
    })),
  };
  const join = (map: Map<string, number>) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, dollars]) => `${code}:${dollars}`)
      .join(";");
  return `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/regional-money/export-office-pay.ts\` from the
 * locked Book of the States tables. A state whose pay is not one plain annual
 * figure is absent, never zero.
 */

export const OFFICE_PAY_META = ${JSON.stringify(meta, null, 2)} as const;

/** \`state or territory postal code:governor's annual salary in dollars\`. */
export const GOVERNOR_SALARY_ROWS =
  ${JSON.stringify(join(governors))};

/** \`state or territory postal code:legislator's annual salary in dollars\`. */
export const LEGISLATOR_SALARY_ROWS =
  ${JSON.stringify(join(legislators))};

/** \`state or territory postal code:general trial court judge's annual salary in dollars\`. */
export const TRIAL_JUDGE_SALARY_ROWS =
  ${JSON.stringify(join(judges))};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const output = renderOfficePayModule();
  if (process.argv.includes("--check")) {
    if (readFileSync(OFFICE_PAY_OUTPUT_PATH, "utf8") !== output)
      throw new Error(`Stale ${OFFICE_PAY_OUTPUT_PATH}`);
    console.log(`${OFFICE_PAY_OUTPUT_PATH} is current.`);
  } else {
    writeFileSync(OFFICE_PAY_OUTPUT_PATH, output);
    console.log(`wrote ${OFFICE_PAY_OUTPUT_PATH}`);
  }
}
