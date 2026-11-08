/**
 * Derives the federal prison's stay share per offense group from the two
 * sourced tables and writes it as parameter rows, for the federal case stream
 * (pool item world-federal-case-stream) to read when it is built.
 *
 * A federal prison stock is the yearly prison admissions times the mean time
 * each stays. The Sentencing Commission gives admissions and the mean sentence
 * by offense (data/research/justice/ussc-federal-sentencing-fy2025.json); the
 * Bureau of Prisons gives the stock by offense
 * (data/research/justice/bop-federal-offenses-2026.json). The stay share of a
 * group is the stock it must hold over admissions times mean sentence, in
 * months: the share of the sentence imposed that people in that group spend in
 * custody. The statutory ceiling is 54 days of good time a year (18 U.S.C.
 * 3624(b)), 85.2 percent; the derived shares are below it, so the case stream
 * must not take the ceiling as the typical stay.
 *
 * The groups pair the two sources' categories as follows (their categories do
 * not map one to one; the pairing is the researcher's, stated here so the
 * rows say what they stand on):
 *   drug         BOP drug offenses                 USSC drug trafficking
 *   weapons      BOP weapons, explosives, arson    USSC firearms
 *   immigration  BOP immigration                   USSC immigration
 *   sex          BOP sex offenses                  USSC child pornography, sexual abuse, obscenity/other sex
 *   fraud        BOP extortion, fraud, bribery     USSC fraud/theft/embezzlement, money laundering
 *                plus burglary, larceny, property
 *                plus banking and insurance
 *   robbery      BOP robbery                       USSC robbery
 *
 *   node --import tsx scripts/justice/derive-federal-stay-share.ts
 * rewrites the federalStayShare* rows at the end of src/core2/data/parameters.json;
 * src/core2/federal-stay-share.test.ts checks they equal what this gives.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BOP = "data/research/justice/bop-federal-offenses-2026.json";
const USSC = "data/research/justice/ussc-federal-sentencing-fy2025.json";
const PARAMETERS = "src/core2/data/parameters.json";

interface Bop {
  offenses: { id: string; inmates: number }[];
}
interface Ussc {
  offenses: { id: string; imprisoned: number; meanMonthsPrison: number }[];
}

/** Each group: the BOP categories that make its stock, the USSC offenses that make its flow. */
export const GROUPS = {
  Drug: { bop: ["drug"], ussc: ["drug-trafficking"] },
  Weapons: { bop: ["weapons-explosives-arson"], ussc: ["firearms"] },
  Immigration: { bop: ["immigration"], ussc: ["immigration"] },
  SexOffenses: {
    bop: ["sex-offenses"],
    ussc: ["child-pornography", "sexual-abuse", "obscenity-other-sex"],
  },
  Fraud: {
    bop: [
      "extortion-fraud-bribery",
      "burglary-larceny-property",
      "banking-insurance-counterfeit-embezzlement",
    ],
    ussc: ["fraud-theft-embezzlement", "money-laundering"],
  },
  Robbery: { bop: ["robbery"], ussc: ["robbery"] },
} as const;

/**
 * Groups whose two sources do not count the same cases, so the derived share is
 * not a true stay share (it can exceed the good-time ceiling). The Bureau counts
 * a person by their most serious offense in custody, the Commission by the
 * primary offense at sentencing: a prisoner whose primary offense was drug
 * trafficking but who also carries a firearm count (18 U.S.C. 924(c)) sits in
 * the Bureau's weapons group, and explosives and arson are Bureau weapons
 * offenses the Commission does not file under firearms. The case stream
 * calibrates such a group against its stock and does not read the share as a
 * stay.
 */
export const CATEGORY_MISMATCH: Partial<Record<keyof typeof GROUPS, string>> = {
  Weapons:
    "The Bureau's weapons, explosives and arson stock includes firearm counts from cases the Commission files under another primary offense, so the stock is larger than the firearms flow alone explains.",
};

/** The stay share of each group: stock x 12 / (admissions x mean months), rounded to three places. */
export function stayShares(
  bop: Bop,
  ussc: Ussc,
): Record<keyof typeof GROUPS, number> {
  const out = {} as Record<keyof typeof GROUPS, number>;
  for (const [name, group] of Object.entries(GROUPS)) {
    const stock = group.bop.reduce((n, id) => {
      const row = bop.offenses.find((o) => o.id === id);
      if (!row) throw new Error(`BOP has no offense ${id}`);
      return n + row.inmates;
    }, 0);
    const monthsAdmitted = group.ussc.reduce((n, id) => {
      const row = ussc.offenses.find((o) => o.id === id);
      if (!row) throw new Error(`USSC has no offense ${id}`);
      return n + row.imprisoned * row.meanMonthsPrison;
    }, 0);
    out[name as keyof typeof GROUPS] =
      Math.round((1000 * stock * 12) / monthsAdmitted) / 1000;
  }
  return out;
}

/** The parameter rows this derivation writes, keyed by the name an engine reads. */
export function parameterRows(shares: Record<keyof typeof GROUPS, number>) {
  const rows: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(shares)) {
    const mismatch = CATEGORY_MISMATCH[name as keyof typeof GROUPS];
    rows[`federalStayShare${name}`] = {
      value,
      tag: "TUNABLE",
      role: "coefficient",
      citation: `Derived by scripts/justice/derive-federal-stay-share.ts from the Bureau of Prisons stock by offense (${BOP}) and the Sentencing Commission's fiscal 2025 prison admissions and mean sentences (${USSC}): stock x 12 / (admissions x mean months). The share of the sentence imposed that people in the group spend in custody, below the 85.2 percent statutory good-time ceiling (18 U.S.C. 3624(b)); the federal case stream calibrates against the stock, so this is the value it starts from and is checked against the Bureau's table.${mismatch ? ` Category mismatch: ${mismatch}` : ""}`,
      spread: {
        low: Math.round(value * 500) / 1000,
        high: Math.round(value * 2000) / 1000,
        unit: "share of sentence served",
        citation:
          "Half to double: the admissions are one year's and the Bureau's offense table counts everyone it has offense data for.",
      },
    };
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bop = JSON.parse(readFileSync(BOP, "utf8")) as Bop;
  const ussc = JSON.parse(readFileSync(USSC, "utf8")) as Ussc;
  const rows = parameterRows(stayShares(bop, ussc));
  // Splice the rows in as the file's last keys, so the rest of the file is untouched.
  let text = readFileSync(PARAMETERS, "utf8").trimEnd();
  const first = text.indexOf(',\n  "federalStayShare');
  if (first >= 0) text = text.slice(0, first) + "\n}";
  const body = Object.entries(rows)
    .map(
      ([key, row]) =>
        `  ${JSON.stringify(key)}: ${JSON.stringify(row, null, 2).replace(/\n/g, "\n  ")}`,
    )
    .join(",\n");
  writeFileSync(
    PARAMETERS,
    `${text.slice(0, text.lastIndexOf("}")).trimEnd()},\n${body}\n}\n`,
  );
  console.log(
    Object.entries(rows)
      .map(([k, v]) => `${k} ${(v as { value: number }).value}`)
      .join("\n"),
  );
}
