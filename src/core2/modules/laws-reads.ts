import type { CoreAPI } from "../types";
import type { LawRowInput } from "../laws-starting";
import { default as data } from "../data/laws/public-pay-floor.json";
import type { LawLevelName } from "../laws-starting";
import { default as wageHistory } from "../../../data/research/laws/minimum-wage-history-2000-2026.json";
import { type LawChain, startingLawRows } from "../laws-starting";
import type { CoreState } from "../types";
import { POLICY_SERIES_BY_LEVEL, POLICY_QUESTIONS } from "../policy-answers";
import type { LawInForceAnswer, EnactedAuthority } from "../laws-in-force";
import { tableTraceOn } from "../module-state";
import {
  rowsCarriedToStart,
  resolveLawInForce,
  LAW_SERIES,
} from "../laws-resolve";

/** The laws engine's module id; `laws.ts` re-exports it for the engines that already import it there. */
export const LAWS_MODULE_ID = "core2-laws-v1";

/** The question list the law rows and the platforms answer; re-exported here so the past reads it through the laws entry. */
export { POLICY_QUESTIONS } from "../policy-answers";

/**
 * The laws engine's read doors: what every other engine, screen and scene asks
 * of the law table. A caller states what it wants, a law by its id, the laws of
 * a series, every law or the enactments of a series, and never opens
 * `core2-laws-v1` itself. Each door returns the engine's own rows as they are
 * stored: nothing is copied or computed, and none registers the module (a
 * caller that works without laws asks `modules.has(LAWS_MODULE_ID)` first, as
 * before). The one-law-in-force-on-a-date rule is `laws-in-force.ts`'s, not
 * these.
 */

/** One law row by its id, or undefined where no such law is kept. */
export function lawRowById(
  api: CoreAPI,
  lawId: string,
): LawRowInput | undefined {
  return api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as unknown as
    LawRowInput | undefined;
}

/** Every law row the world keeps (in force, pending and ended). */
export function allLawRows(api: CoreAPI): readonly LawRowInput[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as readonly LawRowInput[];
}

/**
 * The rows of one series as they are stored: every jurisdiction's, or one's
 * when `jurisdiction` is named. This is the stored rows only; `lawRows` in
 * laws.ts adds the level aliases for policy series.
 */
export function storedLawRowsOfSeries(
  api: CoreAPI,
  series: string,
  jurisdiction?: string,
): readonly LawRowInput[] {
  const table = api.moduleState(LAWS_MODULE_ID).table("laws");
  return (jurisdiction === undefined
    ? table.query("bySeriesOnly", [series])
    : table.query("bySeries", [
        jurisdiction,
        series,
      ])) as unknown as readonly LawRowInput[];
}

/** An act passed in play that settles one series: the rows of the enactments table. */
export function enactmentRowsOfSeries<T = unknown>(
  api: CoreAPI,
  series: string,
): readonly T[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("enactments")
    .query("bySeries", [series]) as unknown as readonly T[];
}

export const EMPLOYER_LEVELS = data.employerLevels as Readonly<
  Record<string, LawLevelName>
>;

/** The highest level whose floors reach a class that is a government of its own (a school district). */
export const BOUND_BY = data.boundBy as unknown as Readonly<
  Record<string, LawLevelName>
>;

/**
 * The highest level of government whose public-employee laws (a pay floor,
 * bargaining) reach a public employer class: its own level, except a school
 * district, a government of its own that only state and federal laws reach.
 * `publicEmployerLevel` below is where it is funded from.
 */
export function publicEmployerBoundLevel(
  classification: string,
): LawLevelName | undefined {
  return BOUND_BY[classification] ?? EMPLOYER_LEVELS[classification];
}

/** The level of government a public employer class belongs to (who funds it), if it is one. */
export function publicEmployerLevel(
  classification: string,
): LawLevelName | undefined {
  return EMPLOYER_LEVELS[classification];
}

export const CHAIN_ID = "chain";

/** The policy question whose state answer grants places their own minimum wage (`localAuthority`). */
export const LOCAL_WAGE_AUTHORITY_QUESTION =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";

type WageStep = {
  effectiveDate: string;
  rateMinor: number;
  sourceId: string;
  estimated?: string;
};

const WAGE_HISTORY = wageHistory as unknown as {
  sources: { id: string; citation?: string; url?: string; title?: string }[];
  federal: WageStep[];
  places: Record<string, WageStep[] | { noStateMinimum?: boolean }>;
};

/**
 * Earlier minimum wage rows for the federal level and the town's state: each
 * step ends where the next begins, and the last ends where that level's first
 * general starting row begins (a side tier recorded from an earlier date, such
 * as a small employer's rate, does not cut the general wage's history short). Levels without a starting row get none (no state law).
 */
export function minimumWageHistoryRows(
  stateKey: string,
  existing: readonly LawRowInput[],
): LawRowInput[] {
  const out: LawRowInput[] = [];
  const levels: [string, "federal" | "state", WageStep[]][] = [
    ["US", "federal", WAGE_HISTORY.federal],
  ];
  const own = WAGE_HISTORY.places[stateKey];
  if (Array.isArray(own)) levels.push([stateKey, "state", own]);
  for (const [jurisdiction, level, steps] of levels) {
    const first = existing
      .filter(
        (r) =>
          r.series === "minimum-wage" &&
          r.tier === "general" &&
          r.level === level &&
          r.jurisdiction === jurisdiction,
      )
      .map((r) => r.effectiveDate)
      .sort()[0];
    if (!first) continue;
    const before = steps
      .filter((s) => s.effectiveDate < first)
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    for (const [i, step] of before.entries()) {
      const source = WAGE_HISTORY.sources.find((s) => s.id === step.sourceId);
      out.push({
        id: `law:${jurisdiction}:${level}:minimum-wage:general:${step.effectiveDate}`,
        jurisdiction,
        level,
        series: "minimum-wage",
        tier: "general",
        value: step.rateMinor,
        unit: "minor/hour",
        effectiveDate: step.effectiveDate,
        endDate: before[i + 1]?.effectiveDate ?? first,
        source: [
          "data/research/laws/minimum-wage-history-2000-2026.json",
          source?.url ?? step.sourceId,
        ].join(" ; "),
        retrieved: "2026-10-13",
        estimate: step.estimated !== undefined || step.sourceId === "RECALL",
      });
    }
  }
  return out;
}

export function lawChain(api: CoreAPI): LawChain {
  const chain = api.moduleState(LAWS_MODULE_ID).table("chain").get(CHAIN_ID);
  if (!chain) throw new Error("Laws are not open in this world.");
  return chain as unknown as LawChain;
}

export function seriesRows(
  api: CoreAPI,
  series: string,
  jurisdiction?: string,
): readonly LawRowInput[] {
  const table = api.moduleState(LAWS_MODULE_ID).table("laws");
  return (jurisdiction === undefined
    ? table.query("bySeriesOnly", [series])
    : table.query("bySeries", [
        jurisdiction,
        series,
      ])) as unknown as readonly LawRowInput[];
}

/** The same canonical policy rows for current law, pending acts and legislative history. */
export function lawRows(
  api: CoreAPI,
  series: string,
  jurisdiction?: string,
): readonly LawRowInput[] {
  const aliases = POLICY_SERIES_BY_LEVEL[series];
  const ownRows = seriesRows(api, series, jurisdiction);
  return aliases
    ? [
        ...ownRows.filter((row) => !aliases[row.level]),
        ...Object.entries(aliases).flatMap(([level, canonical]) =>
          seriesRows(api, canonical, jurisdiction).filter(
            (row) => row.level === level,
          ),
        ),
      ]
    : ownRows;
}

/** Calibration facts consumed by a law reader; these are not enacted laws. */
export function calibrationRows(
  api: CoreAPI,
  series: string,
): readonly LawRowInput[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("calibrations")
    .query("bySeriesOnly", [series]) as unknown as LawRowInput[];
}

/** The law on a series for the town, on a date (today by default), at every level. */
export function lawInForce(
  api: CoreAPI,
  series: string,
  date: string = api.state.date,
): LawInForceAnswer {
  if (tableTraceOn() || date !== api.state.date)
    return readLawInForce(api, series, date);
  const writes = api.moduleState(LAWS_MODULE_ID).writes;
  let kept = todaysLaw.get(api.state);
  if (!kept || kept.writes !== writes || kept.date !== date)
    todaysLaw.set(api.state, (kept = { writes, date, answers: new Map() }));
  let answer = kept.answers.get(series);
  if (!answer)
    kept.answers.set(series, (answer = readLawInForce(api, series, date)));
  return answer;
}

/** The starting law of each state outside the town's chain, read once from the research. */
const outsideStartingRows = new Map<string, readonly LawRowInput[]>();

/** The chain a state is read by from outside it: the nation and the state, no county or town. */
const outsideChain = (stateKey: string): LawChain => ({
  placeKey: "",
  placeName: stateKey,
  townPlaceId: "",
  stateKey,
  countyGeoids: [],
  incorporated: false,
  levels: [
    { level: "federal", jurisdiction: "US" },
    { level: "state", jurisdiction: stateKey },
  ],
});

/**
 * A state's law as a world opens with it, for a state read from outside: the
 * research's starting rows, the minimum wage's dated history before them, and
 * every series recorded only from a later date carried to the world's first
 * day. The same three steps the played town's own state is opened with (one
 * rule, all 56 places), so no state waits a year for its own law.
 */
export function stateOpeningLawRows(
  stateKey: string,
  startedAt: string,
): readonly LawRowInput[] {
  const kept = `${stateKey}|${startedAt}`;
  let rows = outsideStartingRows.get(kept);
  if (!rows) {
    const starting = startingLawRows(outsideChain(stateKey));
    const held = new Set(starting.map((row) => row.id));
    const dated = [
      ...starting,
      ...minimumWageHistoryRows(stateKey, starting).filter(
        (row) => !held.has(row.id),
      ),
    ];
    outsideStartingRows.set(
      kept,
      (rows = [...dated, ...rowsCarriedToStart(dated, startedAt)]),
    );
  }
  return rows;
}

/**
 * The law on a series in any state, on a date, by the same rule as the
 * town's (`resolveLawInForce`): the research's starting law for the state and
 * the nation, with every act the laws table holds for them. A state outside
 * the town's chain has no copy of its starting law in the table, so it is read
 * from the research here. The town's own state reads the table as always.
 */
export function stateLawInForce(
  api: CoreAPI,
  stateKey: string,
  series: string,
  date: string = api.state.date,
): LawInForceAnswer {
  if (stateKey === lawChain(api).stateKey) return lawInForce(api, series, date);
  const chain = outsideChain(stateKey);
  const starting = stateOpeningLawRows(stateKey, api.state.startedAt);
  const enacted = seriesRows(api, series).filter(
    (row) =>
      row.jurisdiction === stateKey ||
      (row.level === "federal" && row.jurisdiction === "US"),
  );
  return resolveLawInForce({
    series,
    chain,
    date,
    rows: [...starting.filter((row) => row.series === series), ...enacted],
  });
}

/** The sole uncached path, also used for history and traced reads. */
function readLawInForce(
  api: CoreAPI,
  series: string,
  date: string,
): LawInForceAnswer {
  const chain = lawChain(api);
  // Only a wage floor reads the state's grant of local authority, and only
  // the sales tax its state's average local rate: no other law reads them.
  const floor = LAW_SERIES[series] === "floor";
  const rows = lawRows(api, series);
  return resolveLawInForce({
    series,
    chain,
    date,
    rows,
    ...(floor
      ? {
          authorityRows: seriesRows(api, "local-minimum-wage-authority"),
          authorityQuestionRows: seriesRows(api, LOCAL_WAGE_AUTHORITY_QUESTION),
          enactedAuthority: api
            .moduleState(LAWS_MODULE_ID)
            .table("enactments")
            .query("bySeries", [
              "local-minimum-wage-authority",
            ]) as unknown as readonly EnactedAuthority[],
        }
      : {}),
    ...(POLICY_QUESTIONS[series] && localPowerBarred(api, series, date)
      ? { statePreempts: true }
      : {}),
    ...(series === "income-tax"
      ? {
          localTaxGrant:
            lawInForce(api, "local-income-tax-authority", date).levels.find(
              (l) => l.level === "state",
            )?.row ?? null,
        }
      : {}),
    ...(series === "sales-tax"
      ? { localAverage: calibrationRows(api, "local-sales-tax-average") }
      : {}),
    ...(series === "property-tax"
      ? { calibrationRows: calibrationRows(api, series) }
      : {}),
  });
}

/** The series a state's bar on its places' own rule for one policy question is kept under. */
export const LOCAL_POWER_PREFIX = "local-power:";

/**
 * Whether the town's state bars its places from making their own rule on a
 * policy question on a date. The state's own law decides: a state bill that
 * bars (0) or grants (1) the power is a row on `local-power:<question>`, in
 * force from its effective date; with none, the researched starting answer
 * (`preempts`, data/research/laws/starting-law-2026) is the law in force.
 */
export function localPowerBarred(
  api: CoreAPI,
  question: string,
  date: string = api.state.date,
): boolean {
  const series = `${LOCAL_POWER_PREFIX}${question}`;
  // Most questions have no grant/bar act yet. An empty series cannot change
  // the researched starting rule; do not build an empty answer for each read.
  const row = seriesRows(api, series).length
    ? lawInForce(api, series, date).levels.find(
        (level) => level.level === "state",
      )?.row
    : undefined;
  if (row && row.value !== null) return row.value === 0;
  return (
    POLICY_QUESTIONS[question]?.answers[lawChain(api).stateKey]?.preempts ===
    true
  );
}

/** Today's answers by series, kept while the laws engine's tables are unwritten. */
const todaysLaw = new WeakMap<
  CoreState,
  { writes: number; date: string; answers: Map<string, LawInForceAnswer> }
>();

/**
 * The law on a series for the town today: `lawInForce`, answered once per
 * series a day until the laws engine writes a row. The answer is built only
 * from this engine's rows and the date, so a kept one is the one a fresh read
 * would build; callers read it and keep none of it. With the table trace on
 * every call reads again, so the law-wiring check still sees each reader.
 */
export function lawInForceToday(
  api: CoreAPI,
  series: string,
): LawInForceAnswer {
  return lawInForce(api, series);
}

/**
 * The levels of the town's chain whose law in force on a policy question says
 * yes, each with its row, in chain order (federal first): the one reading the
 * law-reach handlers, the budgets and the housing engine use. A higher level
 * saying no doesn't undo a lower level's yes.
 */
export function yesLevels(
  api: CoreAPI,
  key: string,
): readonly {
  level: string;
  jurisdiction: string;
  lawId: string;
  row: LawRowInput;
}[] {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return [];
  return lawInForce(api, key).levels.flatMap((l) =>
    l.row?.value === 1 && !l.setAside
      ? [
          {
            level: l.level,
            jurisdiction: l.jurisdiction,
            lawId: l.row.id,
            row: l.row,
          },
        ]
      : [],
  );
}
