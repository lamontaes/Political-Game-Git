/**
 * Which law applies on a date, at every level, for one series.
 *
 * Pure: callers pass the place's chain and its rows for the series. Each level
 * answers with its own phase in force on the date (a phase that hasn't started
 * doesn't apply; it's listed as pending). The levels then combine by the
 * series' doctrine:
 *
 * - floor (minimum wage): the highest floor in force governs. A local floor
 *   counts only where the state lets its places set one, read through the
 *   lifted `lawInForceFromCandidates` over the state's recorded authority
 *   answer, so a later enacted law changes it the same way.
 * - additive (income and sales tax): every level's tax applies together.
 * - single (property tax, benefit amounts): one level sets it.
 */
import {
  lawInForceFromCandidates,
  type LawCandidate,
} from "../rules/laws/law-in-force";
import { minimumWageSettingFromFacts } from "../rules/laws/minimum-wage-setting";
import type { LawChain, LawLevelName, LawRowInput } from "./laws-starting";

export type LawDoctrine = "floor" | "additive" | "single";

export const LAW_SERIES: Readonly<Record<string, LawDoctrine>> = {
  "minimum-wage": "floor",
  "income-tax": "additive",
  "sales-tax": "additive",
  "corporate-income-tax": "additive",
  "property-tax": "single",
  "snap-maximum": "single",
  "unemployment-weekly-maximum": "single",
  "medicaid-match": "single",
};

export interface LevelLaw {
  readonly level: LawLevelName;
  readonly jurisdiction: string;
  readonly row: LawRowInput | null;
  /** Why this level's law does not apply, when it is recorded but set aside. */
  readonly setAside?: string;
}

export interface LawInForceAnswer {
  readonly series: string;
  readonly date: string;
  readonly doctrine: LawDoctrine;
  /** The combined value in force: the governing floor, the sum, or the one level's value. */
  readonly value: number | null;
  readonly unit: string | null;
  readonly governing: LawRowInput | null;
  readonly levels: readonly LevelLaw[];
  /** Phases recorded for a later date, earliest first. */
  readonly pending: readonly LawRowInput[];
  readonly estimate: boolean;
}

/** Authority answers enacted after the start; empty until M3 writes enactments. */
export interface EnactedAuthority {
  readonly series: string;
  readonly jurisdiction: string;
  readonly answer: "yes" | "no";
  readonly measureId: string;
  readonly operativeAt: string;
  readonly sequence: number;
}

export function inForceOn(row: LawRowInput, date: string): boolean {
  return (
    row.effectiveDate <= date && (row.endDate === null || date < row.endDate)
  );
}

/**
 * The general tier for a place: a region tier whose counties include the
 * place's county, else the rest-of-state region, else the general rate.
 */
function tierFits(row: LawRowInput, chain: LawChain): number {
  const counties = row.terms?.counties as readonly string[] | undefined;
  if (counties !== undefined) {
    if (counties.some((county) => chain.countyGeoids[0] === county)) return 3;
    return counties.length === 0 ? 2 : 0;
  }
  return row.tier === "general" ? 1 : 0;
}

function levelRow(
  rows: readonly LawRowInput[],
  jurisdiction: string,
  level: LawLevelName,
  chain: LawChain,
  date: string,
): LawRowInput | null {
  let best: LawRowInput | null = null;
  let bestFit = 0;
  for (const row of rows) {
    if (row.jurisdiction !== jurisdiction || row.level !== level) continue;
    if (!inForceOn(row, date)) continue;
    // A county ordinance that covers only unincorporated areas skips a city.
    if (chain.incorporated && row.terms?.coversUnincorporatedOnly === true)
      continue;
    const fit = tierFits(row, chain);
    if (
      fit > bestFit ||
      (fit === bestFit &&
        fit > 0 &&
        best &&
        row.effectiveDate > best.effectiveDate)
    ) {
      best = row;
      bestFit = fit;
    }
  }
  // A statute enacted in play amends the level's law outright: from its
  // effective date it replaces any older row, tiered or not, and it stands
  // against a row the data dated later (the seed is not a prewritten future
  // that ignores what the town decided); only a later enactment replaces it.
  const enacted = rows
    .filter(
      (row) =>
        row.jurisdiction === jurisdiction &&
        row.level === level &&
        row.terms?.enactedBy !== undefined &&
        inForceOn(row, date),
    )
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  return enacted ?? best;
}

/** Whether the state lets its places set their own rule on a series. */
export function localAuthority(
  authorityRows: readonly LawRowInput[],
  enacted: readonly EnactedAuthority[],
  chain: LawChain,
  date: string,
): { allowed: boolean; measureId: string | null; preempts: boolean } {
  // A statute enacted in play amends the state's grant outright: its newest
  // row stands over the research's row, as at every other level (`levelRow`).
  const inState = authorityRows.filter(
    (row) => row.jurisdiction === chain.stateKey && inForceOn(row, date),
  );
  const starting =
    inState
      .filter((row) => row.terms?.enactedBy !== undefined)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ??
    inState[0];
  const candidate = (
    answer: "yes" | "no",
    measureId: string,
    operativeAt: string,
    origin: LawCandidate["origin"],
    sequence: number,
    preempts?: boolean,
  ): LawCandidate => ({
    answer,
    measureId,
    origin,
    level: "state-statute",
    operativeAt,
    operativeBasis: origin === "enacted" ? "enacted-date" : "state-rule",
    sequence,
    ...(preempts === undefined ? {} : { preempts }),
  });
  const law = lawInForceFromCandidates({
    enacted: enacted
      .filter((e) => e.jurisdiction === chain.stateKey && e.operativeAt <= date)
      .map((e) =>
        candidate(e.answer, e.measureId, e.operativeAt, "enacted", e.sequence),
      ),
    starting: starting
      ? candidate(
          starting.value === 1 ? "yes" : "no",
          starting.id,
          starting.effectiveDate,
          "in-force-at-start",
          0,
          starting.terms?.preempts === true,
        )
      : null,
  });
  return {
    allowed: law?.answer === "yes",
    measureId: law?.measureId ?? null,
    preempts: law?.preempts === true,
  };
}

export function resolveLawInForce(input: {
  readonly series: string;
  readonly chain: LawChain;
  readonly date: string;
  readonly rows: readonly LawRowInput[];
  readonly authorityRows?: readonly LawRowInput[];
  readonly enactedAuthority?: readonly EnactedAuthority[];
  /** For sales tax: the state's average local rate, when the place has no local row. */
  readonly localAverage?: readonly LawRowInput[];
}): LawInForceAnswer {
  const { series, chain, date, rows } = input;
  const doctrine = LAW_SERIES[series] ?? "single";
  const levels: LevelLaw[] = chain.levels.map(({ level, jurisdiction }) => ({
    level,
    jurisdiction,
    row: levelRow(rows, jurisdiction, level, chain, date),
  }));
  // Federal law set for one state (a benefit amount, a territory's own
  // federal minimum wage) is recorded under the state's key and is more
  // specific than the national row.
  const federalForState = levelRow(
    rows,
    chain.stateKey,
    "federal",
    chain,
    date,
  );
  if (federalForState) {
    const index = levels.findIndex((l) => l.level === "federal");
    levels[index] = {
      ...levels[index]!,
      jurisdiction: chain.stateKey,
      row: federalForState,
    };
  }
  if (series === "sales-tax" && input.localAverage) {
    const hasLocal = levels.some(
      (l) => (l.level === "city" || l.level === "county") && l.row,
    );
    const average = input.localAverage.find((row) => inForceOn(row, date));
    if (!hasLocal && average) {
      const index = levels.findIndex((l) => l.level === "city");
      levels[index] = { ...levels[index]!, row: average };
    }
  }
  const pending = rows
    .filter(
      (row) =>
        row.effectiveDate > date &&
        chain.levels.some((l) => l.jurisdiction === row.jurisdiction),
    )
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

  let governing: LawRowInput | null = null;
  let value: number | null = null;
  if (doctrine === "floor") {
    const authority = localAuthority(
      input.authorityRows ?? [],
      input.enactedAuthority ?? [],
      chain,
      date,
    );
    let local: LawRowInput | null = null;
    for (const [index, l] of levels.entries()) {
      if (l.level !== "city" && l.level !== "county") continue;
      if (!l.row) continue;
      if (!authority.allowed) {
        levels[index] = {
          ...l,
          setAside: authority.preempts
            ? "state law preempts local minimum wages"
            : "state law gives its places no minimum-wage power",
        };
        continue;
      }
      if (!local || (l.row.value ?? 0) > (local.value ?? 0)) local = l.row;
    }
    const federal = levels.find((l) => l.level === "federal")?.row ?? null;
    const state = levels.find((l) => l.level === "state")?.row ?? null;
    const fact = (
      row: LawRowInput | null,
      level: "federal" | "state" | "local",
    ) =>
      row && row.value !== null
        ? {
            hourlyMinor: row.value,
            level,
            measureId: row.id,
            designation: row.tier,
            effectiveAt: row.effectiveDate,
          }
        : null;
    const federalFact = fact(federal, "federal");
    const setting = minimumWageSettingFromFacts(
      federalFact,
      fact(state, "state") ?? federalFact,
      fact(local, "local"),
    );
    governing =
      [federal, state, local].find((row) => row?.id === setting?.measureId) ??
      null;
    value = setting?.hourlyMinor ?? null;
  } else if (doctrine === "additive") {
    // A territory's own income tax stands in place of the federal one.
    const state = levels.find((l) => l.level === "state");
    if (state?.row?.terms?.replacesFederal === true)
      for (const [index, l] of levels.entries())
        if (l.level === "federal" && l.row)
          levels[index] = {
            ...l,
            setAside: "the territory's own income tax applies in its place",
          };
    const applying = levels.filter(
      (l) => l.row && l.row.value !== null && !l.setAside,
    );
    value = applying.length
      ? round(applying.reduce((sum, l) => sum + (l.row!.value ?? 0), 0))
      : null;
    governing = applying[applying.length - 1]?.row ?? null;
  } else {
    const applying = [...levels].reverse().find((l) => l.row);
    governing = applying?.row ?? null;
    value = governing?.value ?? null;
  }
  const applied = levels.filter((l) => l.row && !l.setAside).map((l) => l.row!);
  return {
    series,
    date,
    doctrine,
    value,
    unit: governing?.unit ?? applied[0]?.unit ?? null,
    governing,
    levels,
    pending,
    estimate: applied.some((row) => row.estimate),
  };
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
