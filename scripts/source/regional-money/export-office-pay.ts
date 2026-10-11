/** Export independently sourced government salary facts, never publisher tables. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { STATES } from "../../../src/simulation/state-reference";

export const OFFICE_PAY_OUTPUT_PATH = "src/simulation/office-pay.generated.ts";
export const OFFICE_PAY_FACTS_PATH =
  "data/source/official-office-pay/facts.json";
export const SALARY_OFFICES = [
  "governor",
  "state-legislator",
  "trial-court-judge",
] as const;

type SalaryOffice = (typeof SALARY_OFFICES)[number];
export interface OfficialSalaryFact {
  state: string;
  office: SalaryOffice;
  annualDollars: number;
  status: "SOURCED";
  sourceUrl: string;
  locator: string;
  referencePeriod: string;
  verification: string;
}
interface OfficialSalaryJournal {
  schema: string;
  accessedAt: string;
  facts: OfficialSalaryFact[];
}

/** These legacy hosts publish the government's own compensation records. */
const LEGACY_OFFICIAL_HOSTS = new Set([
  "cnmilaw.org",
  "www.opaguam.org",
  "www.kslegresearch.org",
  "media.ark.org",
  "www.dopusvi.org",
]);
export function validateSalaryJournal(journal: OfficialSalaryJournal): void {
  if (journal.schema !== "official-office-pay/v1" || !journal.accessedAt)
    throw new Error("Invalid official salary journal");
  const seen = new Set<string>();
  for (const fact of journal.facts) {
    const key = `${fact.state}:${fact.office}`;
    const url = new URL(fact.sourceUrl);
    if (
      !STATES[fact.state] ||
      !SALARY_OFFICES.includes(fact.office) ||
      !Number.isSafeInteger(fact.annualDollars) ||
      fact.annualDollars <= 0 ||
      fact.status !== "SOURCED" ||
      !fact.locator ||
      !fact.referencePeriod ||
      !fact.verification ||
      seen.has(key) ||
      url.protocol !== "https:" ||
      (!url.hostname.endsWith(".gov") &&
        !url.hostname.endsWith(".state.al.us") &&
        !url.hostname.endsWith(".state.nj.us") &&
        !url.hostname.endsWith(".state.nv.us") &&
        !LEGACY_OFFICIAL_HOSTS.has(url.hostname)) ||
      /bookofthestates|csg\.org|ncsl\.org/i.test(fact.sourceUrl)
    )
      throw new Error(`Invalid or duplicate official salary fact: ${key}`);
    seen.add(key);
  }
}

export function renderOfficePayModule(): string {
  const raw = readFileSync(OFFICE_PAY_FACTS_PATH, "utf8");
  const journal = JSON.parse(raw) as OfficialSalaryJournal;
  validateSalaryJournal(journal);
  const rows = (office: SalaryOffice) =>
    journal.facts
      .filter((fact) => fact.office === office)
      .sort((a, b) => a.state.localeCompare(b.state))
      .map((fact) => `${fact.state}:${fact.annualDollars}`)
      .join(";");
  const meta = {
    source:
      "Official government statutes, compensation schedules and legislative records; each fact cites its own reference period. Missing annual figures use the existing labeled official-source estimate.",
    journalSha256: createHash("sha256").update(raw).digest("hex"),
    asOf: journal.accessedAt,
    governors: journal.facts.filter((fact) => fact.office === "governor")
      .length,
    legislators: journal.facts.filter(
      (fact) => fact.office === "state-legislator",
    ).length,
    judges: journal.facts.filter((fact) => fact.office === "trial-court-judge")
      .length,
    citations: journal.facts.map((fact) => ({
      state: fact.state,
      office: fact.office,
      annualDollars: fact.annualDollars,
      status: fact.status,
      sourceUrl: fact.sourceUrl,
      locator: fact.locator,
      referencePeriod: fact.referencePeriod,
    })),
  };
  return `/**
 * GENERATED — do not edit by hand.
 * Official salary facts from data/source/official-office-pay/facts.json.
 * Historical reference periods are explicit. Missing annual figures are absent,
 * never zero; the existing salary reader estimates them from official facts.
 */

export const OFFICE_PAY_META = ${JSON.stringify(meta, null, 2)} as const;

/** State or territory postal code:governor annual salary in dollars. */
export const GOVERNOR_SALARY_ROWS =
  ${JSON.stringify(rows("governor"))};

/** State or territory postal code:legislator annual salary in dollars. */
export const LEGISLATOR_SALARY_ROWS =
  ${JSON.stringify(rows("state-legislator"))};

/** State or territory postal code:general trial court judge annual salary in dollars. */
export const TRIAL_JUDGE_SALARY_ROWS =
  ${JSON.stringify(rows("trial-court-judge"))};
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
