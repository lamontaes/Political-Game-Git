/**
 * Every law the game has, with the links that can be read from data alone:
 * where it starts (link 1), who may change it (link 2), its law-reach
 * handler and its researched outcome-web links (link 6). The world run
 * (check.ts) adds the rest. Read-only; play never imports this.
 */
import billCatalog from "../../src/core2/data/legislature/bill-catalog.json" with { type: "json" };
import seriesPowers from "../../src/core2/data/legislature/series-powers.json" with { type: "json" };
import startingLaw from "../../src/core2/data/laws/starting-law.json" with { type: "json" };
import reachA from "../../src/core2/data/laws/reach-group-a.json" with { type: "json" };
import reachB from "../../src/core2/data/laws/reach-group-b.json" with { type: "json" };
import webLinks from "../../data/research/outcome-web/links.json" with { type: "json" };
import federalAnswers from "../../src/core2/data/legislature/federal-answers.json" with { type: "json" };
import { POLICY_QUESTIONS } from "../../src/core2/policy-answers";
import { policyHandlerKeys } from "../../src/core2/law-reach/host";
import { registerLawReach } from "../../src/core2/law-reach/index";

export type LawKind = "question" | "budget-line" | "amount";

export interface LawEntry {
  /** The policy key law reach and the laws table use: a question, a series, or "budget-line:<line>". */
  readonly key: string;
  readonly kind: LawKind;
  /** The bill catalog's subject, or "starting law" for an amount no bill can set. */
  readonly family: string;
  readonly name: string;
  readonly catalog: {
    readonly id: string;
    readonly operations: readonly string[];
    readonly levels: readonly string[];
  } | null;
  /** The law amount's own series (budget lines and questions: null). */
  readonly series: string | null;
}

interface CatalogPolicy {
  id: string;
  name: string;
  kind: string;
  question?: string;
  line?: string;
  series?: string;
  operations: string[];
  levels: string[];
}

const STARTING = (
  startingLaw as unknown as {
    jurisdictions: Record<
      string,
      { level: string; series: string; estimate: boolean }[]
    >;
  }
).jurisdictions;

/**
 * Starting-law series that are not a law a body passes: each stands in for
 * the laws it summarizes, which are in the list themselves.
 */
export const NOT_A_LAW: Readonly<Record<string, string>> = {
  "local-sales-tax-average":
    "the average local sales tax rate where a place has no city row of its own (an estimate standing in for local sales-tax laws, which the sales-tax amount covers)",
};

/** Series a body changes through another law: the route, for link 2. */
const CHANGED_BY: Readonly<Record<string, string>> = {
  "local-minimum-wage-authority":
    "question us-policy-positions:labor-workforce.local-minimum-wage-authority writes this series (group-a-wages.ts localWageAuthority)",
  "unemployment-insurance":
    "every state must run the program (26 U.S.C. 3304); bodies change it through unemployment-weekly-maximum and state-unemployment-tax",
};

/** Every law: the bill catalog's policies, then each starting-law series no bill names. */
export function allLaws(): readonly LawEntry[] {
  const out: LawEntry[] = [];
  const seen = new Set<string>();
  for (const subject of (
    billCatalog as {
      subjects: { id: string; topics: { policies: CatalogPolicy[] }[] }[];
    }
  ).subjects)
    for (const topic of subject.topics)
      for (const p of topic.policies) {
        const key =
          p.kind === "policy-question"
            ? p.question!
            : p.kind === "budget-line"
              ? `budget-line:${p.line}`
              : (p.series ?? p.id.replace(/^law:/, ""));
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          key,
          kind:
            p.kind === "policy-question"
              ? "question"
              : p.kind === "budget-line"
                ? "budget-line"
                : "amount",
          family: subject.id,
          name: p.name,
          catalog: { id: p.id, operations: p.operations, levels: p.levels },
          series: p.kind === "law-amount" ? key : null,
        });
      }
  const series = new Set<string>();
  for (const rows of Object.values(STARTING))
    for (const r of rows) series.add(r.series);
  series.add("property-tax");
  for (const s of [...series].sort()) {
    if (seen.has(s) || s in NOT_A_LAW) continue;
    seen.add(s);
    out.push({
      key: s,
      kind: "amount",
      family: "starting law",
      name: s,
      catalog: null,
      series: s,
    });
  }
  return out;
}

const FEDERAL_ANSWERS = (
  federalAnswers as unknown as { questions: Record<string, unknown> }
).questions;

/**
 * Series a place lacks a row for because its law has none of it, from a
 * survey of every place: the absence is the real starting value (zero).
 */
const NONE_BY_SURVEY: Readonly<Record<string, string>> = {
  "inheritance-tax":
    "data/research/money/death-taxes-2026.json surveys every state; a state it does not list levies no inheritance tax",
  "state-unemployment-tax":
    "American Samoa, Guam and the Northern Mariana Islands run no unemployment insurance program (their unemployment-insurance row is 0; 26 U.S.C. 3306(j) covers the states, D.C., Puerto Rico and the Virgin Islands)",
  "unemployment-weekly-maximum":
    "American Samoa, Guam and the Northern Mariana Islands run no unemployment insurance program (their unemployment-insurance row is 0)",
  "local-income-tax-authority":
    "D.C. and the territories have no local governments below them that could levy an income tax (one level of government)",
};

/** The 56 places' state-level keys (50 states, D.C., five territories). */
export const PLACE_KEYS = Object.keys(STARTING)
  .filter((k) => /^US-[A-Z]{2}$/.test(k))
  .sort();

/** Link 1 from data: how many of the 56 places start with a row, and at which levels. */
export function existsInData(law: LawEntry): {
  places: number;
  missing: readonly string[];
  estimated: number;
  levels: Readonly<Record<string, number>>;
  evidence: string;
} {
  if (law.kind === "question") {
    const q = POLICY_QUESTIONS[law.key];
    const answers = q?.answers ?? {};
    // A federal answer (the research's "US" row, or Congress's own standing
    // answer) is law in every place.
    const federal =
      answers.US?.answer === "yes" ||
      answers.US?.answer === "no" ||
      FEDERAL_ANSWERS[law.key] !== undefined;
    if (federal)
      return {
        places: 56,
        missing: [],
        estimated: 0,
        levels: { federal: 1 },
        evidence: answers.US
          ? "src/core2/policy-answers.ts (federal answer)"
          : "src/core2/data/legislature/federal-answers.json",
      };
    const have = PLACE_KEYS.filter((k) => {
      const a = answers[k]?.answer;
      return a === "yes" || a === "no";
    });
    const estimated = have.filter(
      (k) => (answers[k] as { estimate?: boolean } | undefined)?.estimate,
    ).length;
    return {
      places: have.length,
      missing: PLACE_KEYS.filter((k) => !have.includes(k)),
      estimated,
      levels: { state: have.length },
      evidence:
        "src/core2/policy-answers.ts (data/research/laws/starting-law-2026)",
    };
  }
  if (law.kind === "budget-line")
    return {
      places: 56,
      missing: [],
      estimated: 0,
      levels: {},
      evidence:
        "budgets opened per government in the world (src/core2/modules/budgets.ts openBudgets)",
    };
  const levels: Record<string, number> = {};
  const places = new Set<string>();
  let estimated = 0;
  let federal = false;
  for (const [jur, rows] of Object.entries(STARTING))
    for (const r of rows) {
      if (r.series !== law.series) continue;
      levels[r.level] = (levels[r.level] ?? 0) + 1;
      if (r.estimate) estimated += 1;
      if (jur === "US" || r.level === "federal") federal = true;
      else if (PLACE_KEYS.includes(jur)) places.add(jur);
    }
  // A federal law (one row in US) is in force in every place it covers.
  const count = federal || NONE_BY_SURVEY[law.key] ? 56 : places.size;
  return {
    places: law.series === "property-tax" ? 56 : count,
    missing:
      federal || law.series === "property-tax" || NONE_BY_SURVEY[law.key]
        ? []
        : PLACE_KEYS.filter((k) => !places.has(k)),
    estimated,
    levels,
    evidence:
      law.series === "property-tax"
        ? "src/core2/data/laws/starting-law.json propertyTax"
        : `src/core2/data/laws/starting-law.json jurisdictions${NONE_BY_SURVEY[law.key] ? `; elsewhere none: ${NONE_BY_SURVEY[law.key]}` : ""}`,
  };
}

/** Link 2 from data: the bill catalog's operations and levels, and the series' powers. */
export function changeInData(law: LawEntry): {
  ok: boolean;
  why: string;
  evidence: string;
} {
  const powers = (
    seriesPowers as { series: Record<string, { levels: string[] }> }
  ).series;
  if (!law.catalog && CHANGED_BY[law.key])
    return { ok: true, why: "", evidence: CHANGED_BY[law.key]! };
  if (!law.catalog) {
    const p = law.series ? powers[law.series] : undefined;
    return {
      ok: false,
      why: p
        ? `series-powers lets ${p.levels.join(", ")} set it, but no bill catalog policy offers it, so no body can propose it`
        : "no bill catalog policy and no series-powers row: no body can propose, enact or repeal it",
      evidence: "src/core2/data/legislature/bill-catalog.json",
    };
  }
  const ops = law.catalog.operations;
  const both =
    law.kind === "question"
      ? ops.includes("enact") && ops.includes("repeal")
      : ops.length >= 1;
  return {
    ok: both && law.catalog.levels.length > 0,
    why: both
      ? ""
      : `catalog operations ${ops.join(", ")} lack enact or repeal`,
    evidence: `bill-catalog ${law.catalog.id}: ${ops.join("/")} at ${law.catalog.levels.join(", ")}`,
  };
}

/** The law-reach data row and handler for a key. */
export function reachInData(law: LawEntry): {
  group: "A" | "B" | null;
  mechanic: string | null;
  handlers: boolean;
  stopgapId: string | null;
} {
  registerLawReach();
  const a = (
    reachA as unknown as {
      policies: Record<string, { mechanic: string; stopgapId?: string }>;
    }
  ).policies[law.key];
  const b = reachB as unknown as {
    policies: Record<string, { mechanic: string; stopgapId?: string }>;
    budgetLines: Record<string, { mechanic?: string; stopgapId?: string }>;
  };
  const bRow =
    b.policies[law.key] ??
    (law.kind === "budget-line"
      ? b.budgetLines[law.key.slice("budget-line:".length)]
      : undefined);
  return {
    group: a ? "A" : bRow ? "B" : null,
    mechanic: a?.mechanic ?? bRow?.mechanic ?? null,
    handlers: policyHandlerKeys().includes(law.key),
    stopgapId: a?.stopgapId ?? bRow?.stopgapId ?? null,
  };
}

export interface WebLinkRow {
  key: string;
  status: string;
  from: string;
  to: string;
  unsupportedReason: string | null;
}
const LINKS = (webLinks as unknown as { links: WebLinkRow[] }).links;

/** Link 6 from data: the researched outcome-web links that start from this law. */
export function webLinksOf(law: LawEntry): readonly WebLinkRow[] {
  const froms =
    law.kind === "budget-line"
      ? [
          `budget.${law.key.slice("budget-line:".length)}-added-pct`,
          `budget:${law.key.slice("budget-line:".length)}`,
        ]
      : [`law:${law.key}`, `law.${law.key}`];
  return LINKS.filter((l) => froms.includes(l.from));
}
