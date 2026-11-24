/**
 * The federal courts, as a national flow and a stock (Nation, Nov 8, 2026).
 * No case, judge or defendant is kept: the federal courts are results and
 * counts, and who was sentenced is built when someone opens the case
 * (pool item justice-federal-case-stream). Each month, for each offense
 * group, the Sentencing Commission's yearly prison admissions
 * (data/research/justice/ussc-federal-sentencing-fy2025.json) arrive at the
 * group's mean sentence; people leave after the share of that sentence they
 * serve (the stay share derived in scripts/justice/derive-federal-stay-share.ts
 * and kept in src/core2/data/parameters.json: federalStayShare*), so the
 * Bureau of Prisons' stock by group (the opening stock) is explained by those
 * causes and is checked against the Bureau's table, never steered to it.
 * The reduce-mandatory-minimums law in force, once Congress enacts it, takes
 * the sentence of the cases still subject to a minimum down to the mean of
 * cases relieved of it, in the group's mandatory-minimum share of cases, for
 * the admissions after the law took effect: the stock falls as the people
 * sentenced under it, not the ones already inside, leave.
 */
import bop from "../../../data/research/justice/bop-federal-offenses-2026.json" with { type: "json" };
import ussc from "../../../data/research/justice/ussc-federal-sentencing-fy2025.json" with { type: "json" };
import groups from "../data/justice/federal-groups.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import { lawApplied } from "../law-reach/applied";
import { registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import { lawInForce } from "./laws";

export const FEDERAL_COURTS_MODULE_ID = "federal-courts";
const RUN_KIND = "federal-courts";
const MONTHS_PER_YEAR = 12;
export const REDUCE_MANDATORY_MINIMUMS =
  "us-federal-positions:justice-rights.reduce-mandatory-minimums";

const GROUPS = groups as unknown as Readonly<
  Record<
    "Drug" | "Weapons" | "Immigration" | "SexOffenses" | "Fraud" | "Robbery",
    { readonly bop: readonly string[]; readonly ussc: readonly string[] }
  >
>;
type Group = keyof typeof GROUPS;

interface UsscOffense {
  readonly id: string;
  readonly sentenced: number;
  readonly imprisoned: number;
  readonly meanMonthsPrison: number;
}
interface BopOffense {
  readonly id: string;
  readonly inmates: number;
}
const USSC = ussc as unknown as {
  offenses: readonly UsscOffense[];
  mandatoryMinimums: {
    stillSubjectAtSentencingPct: number;
    meanMonthsStillSubject: number;
    meanMonthsRelieved: number;
    shareOfMandatoryMinimumCasesByOffensePct: Readonly<Record<string, number>>;
  };
  individualsSentenced: number;
};
const BOP = bop as unknown as { offenses: readonly BopOffense[] };

/** The USSC offense ids behind a group, as the mandatory-minimum table names them. */
const MM_KEY: Readonly<Record<Group, string>> = {
  Drug: "drug",
  Weapons: "firearms",
  Immigration: "",
  SexOffenses: "sexual-abuse",
  Fraud: "fraud",
  Robbery: "",
};

export interface FederalCourtsRow {
  readonly id: string;
  readonly month: string;
  readonly group: string;
  readonly admitted: number;
  readonly released: number;
  readonly stock: number;
  /** The people sentenced before the law reduced minimums, and under it. */
  readonly oldStock: number;
  readonly newStock: number;
  /** The reduce-mandatory-minimums law's factor on the admissions' sentence (1 where not in force). */
  readonly sentenceFactor: number;
  readonly lawIds: readonly string[];
}

const monthOf = (date: string) => date.slice(0, "YYYY-MM".length);
const table = (api: CoreAPI, name: string) =>
  api.moduleState(FEDERAL_COURTS_MODULE_ID).table(name);

const sum = (ids: readonly string[], pick: (o: UsscOffense) => number) =>
  USSC.offenses
    .filter((o) => ids.includes(o.id))
    .reduce((n, o) => n + pick(o), 0);

/** A group's prison admissions a year and mean months, from the Commission's table. */
function flowOf(group: Group) {
  const ids = GROUPS[group].ussc as readonly string[];
  const admitted = sum(ids, (o) => o.imprisoned);
  const months = sum(ids, (o) => o.imprisoned * o.meanMonthsPrison);
  return { admitted, mean: admitted ? months / admitted : 0 };
}

/**
 * How far the reduce-mandatory-minimums law takes the group's mean sentence:
 * the share of its cases still subject to a minimum (the Commission's share
 * of all cases still subject, times the group's share of those cases, over
 * the group's own cases) moves from the mean sentence of cases still subject
 * to that of cases relieved of it.
 */
export function reductionFactor(group: Group): number {
  const mm = USSC.mandatoryMinimums;
  const share =
    (mm.shareOfMandatoryMinimumCasesByOffensePct[MM_KEY[group]] ?? 0) / 100;
  const ids = GROUPS[group].ussc as readonly string[];
  const cases = sum(ids, (o) => o.sentenced);
  if (!cases || !share) return 1;
  const subject = Math.min(
    1,
    (USSC.individualsSentenced *
      (mm.stillSubjectAtSentencingPct / 100) *
      share) /
      cases,
  );
  return 1 - subject * (1 - mm.meanMonthsRelieved / mm.meanMonthsStillSubject);
}

function stay(api: CoreAPI, group: Group): number {
  return api.parameter(`federalStayShare${group}`);
}

/** The group's opening stock: the Bureau's sentenced people in its categories. */
function openingStock(group: Group): number {
  return (GROUPS[group].bop as readonly string[]).reduce(
    (n, id) => n + (BOP.offenses.find((o) => o.id === id)?.inmates ?? 0),
    0,
  );
}

/** The latest month's row for a group, or undefined. */
export function federalCourtsFor(
  api: CoreAPI,
  group: string,
): FederalCourtsRow | undefined {
  if (!(api.state as CoreState).modules.has(FEDERAL_COURTS_MODULE_ID))
    return undefined;
  const latest = (
    table(api, "state").get("federal-courts:state") as unknown as
      { latest?: Record<string, string> } | undefined
  )?.latest?.[group];
  return latest
    ? (table(api, "months").get(latest) as unknown as FederalCourtsRow)
    : undefined;
}

function run(api: CoreAPI): void {
  const month = monthOf(api.state.date);
  const months = table(api, "months");
  const stateRow =
    (table(api, "state").get("federal-courts:state") as unknown as
      { latest?: Record<string, string> } | undefined) ?? {};
  const latest: Record<string, string> = { ...(stateRow.latest ?? {}) };
  const law = lawInForce(api, REDUCE_MANDATORY_MINIMUMS);
  const inForce = (law.value ?? 0) > 0;
  const lawIds = inForce && law.governing ? [law.governing.id] : [];
  for (const group of Object.keys(GROUPS) as Group[]) {
    const flow = flowOf(group);
    if (!flow.admitted) continue;
    const previous = latest[group]
      ? (months.get(latest[group]!) as unknown as FederalCourtsRow)
      : undefined;
    // Two cohorts: those sentenced before the law (the opening stock and the
    // admissions while it was not in force) and those sentenced under it, who
    // serve the shortened sentence. People leave each cohort at its own rate.
    const old = previous?.oldStock ?? openingStock(group);
    const recent = previous?.newStock ?? 0;
    const factor = inForce ? reductionFactor(group) : 1;
    const admitted = flow.admitted / MONTHS_PER_YEAR;
    const served = flow.mean * stay(api, group) || 1;
    const oldReleased = old / served;
    const newReleased =
      recent / (served * (previous?.sentenceFactor ?? factor));
    const oldStock = Math.max(0, old - oldReleased + (inForce ? 0 : admitted));
    const newStock = Math.max(
      0,
      recent - newReleased + (inForce ? admitted : 0),
    );
    const released = oldReleased + newReleased;
    const row: FederalCourtsRow = {
      id: `federal-courts:${group}:${month}`,
      month,
      group,
      admitted,
      released,
      stock: oldStock + newStock,
      oldStock,
      newStock,
      sentenceFactor: factor,
      lawIds,
    };
    months.put(row as unknown as { id: string });
    latest[group] = row.id;
    // stopgapId: SG-JUSTICE-federal-prison-cost-flat (the shorter stock saves the Treasury nothing)
    // The law reached the group's people sentenced under it: the engine read
    // it to shorten their sentence. The count is who serves the shorter term.
    if (inForce && law.governing && factor < 1)
      lawApplied(api, {
        key: REDUCE_MANDATORY_MINIMUMS,
        lawId: law.governing.id,
        targetId: `federal-courts:${group}`,
        target: "group",
        engine: FEDERAL_COURTS_MODULE_ID,
        what: "federal-sentence-shortened",
        count: Math.max(1, Math.round(newStock)),
      });
  }
  table(api, "state").put({
    id: "federal-courts:state",
    latest,
  } as unknown as { id: string });
}

function schedule(api: CoreAPI): void {
  const next =
    addDays(makeIsoDate(`${monthOf(api.state.date)}-01`), 32).slice(
      0,
      "YYYY-MM".length,
    ) + "-12";
  api.moduleCalendar(FEDERAL_COURTS_MODULE_ID).schedule({
    key: `${RUN_KIND}:${next}`,
    date: next,
    kind: RUN_KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation:
        "U.S. Sentencing Commission, fiscal 2025 sourcebook; Bureau of Prisons offense table.",
    },
    sourceRecordIds: ["federal-courts:state"],
  });
}

export const FEDERAL_COURTS_MODULE: CoreModule = {
  id: FEDERAL_COURTS_MODULE_ID,
  state: { schemaVersion: 1, tables: { state: {}, months: {} } },
  onCalendarWork(api, work) {
    if (work.kind !== RUN_KIND) return;
    run(api);
    schedule(api);
  },
  onDay(api) {
    const state = table(api, "state");
    if (state.get("federal-courts:state")) return;
    state.put({ id: "federal-courts:state", latest: {} } as unknown as {
      id: string;
    });
    run(api);
    schedule(api);
  },
};

/** Install the engine in a world (after the laws). */
export function openFederalCourts(core: CoreState): void {
  if (!core.modules.has(FEDERAL_COURTS_MODULE_ID))
    registerModule(core, FEDERAL_COURTS_MODULE);
}
