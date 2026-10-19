/**
 * Laws in force: which law applies to each person, business and place at every
 * level, from the start date's real law.
 *
 * At the opening the module loads the real law of every level that covers the
 * town (federal, state, county areas, the place) and puts each later phase on
 * its calendar. On a phase's date it records "law took effect" as a public
 * record; for a minimum wage, every job in the town paying under the new floor
 * is raised to it that day. Later engines read law through `lawInForce`.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import { lawHistory } from "../past-module";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { residentsRuntime } from "./residents";
import { rerateCountedJobs } from "../residents-economy";
import { POLICY_QUESTIONS } from "../policy-answers";
import {
  holdPublicPay,
  PUBLIC_PAY_FLOOR,
  PUBLIC_PAY_REVIEW,
} from "../public-pay-floor";
import socialSecurity from "../data/laws/social-security-ages.json" with { type: "json" };
import {
  socialSecurityAgesFrom,
  type SocialSecurityAges,
} from "../social-security-law";
import wageHistory from "../../../data/research/laws/minimum-wage-history-2000-2026.json" with { type: "json" };
import {
  lawChainForPlace,
  startingLawRows,
  type LawChain,
  type LawRowInput,
} from "../laws-starting";
import {
  inForceOn,
  resolveLawInForce,
  type EnactedAuthority,
  type LawInForceAnswer,
} from "../laws-in-force";

export const LAWS_MODULE_ID = "core2-laws-v1";
const CHAIN_ID = "chain";
/** The calibration date the starting policy answers are read as of. */
const ANSWERS_AS_OF = "2024-07-01";

export const LAWS_MODULE: CoreModule = {
  id: LAWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      laws: {
        indexes: {
          bySeries: { fields: ["jurisdiction", "series"] },
          bySeriesOnly: { fields: ["series"] },
        },
      },
      chain: {},
      /** Laws passed in play (M3 writes them); empty at the opening. */
      enactments: {
        indexes: { bySeries: { fields: ["series"] } },
      },
      /** Each raise the minimum wage made, for the worker's record. */
      raises: {
        indexes: { byPerson: { fields: ["personId"] } },
      },
    },
  },
  onCalendarWork: (api, work) => {
    lawTookEffect(api, work);
    // A public pay floor in force holds later public hires to it, monthly.
    if (work.kind === PUBLIC_PAY_REVIEW) recordPublicPay(api, work.source);
  },
};

function sourceOf(row: LawRowInput, asOf: string): Source {
  const citation = Array.isArray(row.source)
    ? row.source.join(" ; ")
    : (row.source as string);
  return row.estimate
    ? { tag: "ESTIMATED", citation, asOf, estimatedFrom: citation }
    : { tag: "SOURCED", citation, asOf };
}

/** Register the module on a core and load the town's starting law. */
export function openLaws(core: CoreState): LawChain {
  if (!core.modules.has(LAWS_MODULE_ID)) registerModule(core, LAWS_MODULE);
  const api = coreAPI(core);
  const placeKey = api.state.placeMetadata.placeKey;
  if (!placeKey) throw new Error("Laws need the town's place key.");
  const chain = lawChainForPlace(placeKey);
  const state = api.moduleState(LAWS_MODULE_ID);
  state.table("chain").put({ id: CHAIN_ID, ...chain } as unknown as ModuleRow);
  const calendar = api.moduleCalendar(LAWS_MODULE_ID);
  const today = api.state.date;
  for (const row of startingLawRows(chain)) {
    state.table("laws").put(row as unknown as ModuleRow);
    if (row.effectiveDate > today)
      calendar.schedule({
        key: `effect:${row.id}`,
        date: row.effectiveDate,
        kind: "law-takes-effect",
        source: sourceOf(row, row.retrieved > today ? today : row.retrieved),
        sourceRecordIds: [row.id],
      });
  }
  // The minimum wage's dated changes since 2000, before the starting rows
  // (owner's history ruling; OPUS-WEB reads the law at past dates).
  for (const row of minimumWageHistoryRows(chain.stateKey, [
    ...state.table("laws").rows(),
  ] as unknown as LawRowInput[]))
    if (!state.table("laws").get(row.id))
      state.table("laws").put(row as unknown as ModuleRow);
  // Social Security's retirement ages are federal law (owner, Oct 12).
  for (const row of socialSecurityRows(today))
    if (!state.table("laws").get(row.id))
      state.table("laws").put(row as unknown as ModuleRow);
  // A law whose first recorded phase starts after the start date is in force
  // on day one at that phase's terms, as an estimate (never unknown).
  const carried = rowsCarriedToStart(
    [...state.table("laws").rows()] as unknown as LawRowInput[],
    today,
  );
  if (carried.length) {
    // stopgapId: SG-GOV-start-law-carried-back
    api.stopgap("SG-GOV-start-law-carried-back");
    for (const row of carried)
      if (!state.table("laws").get(row.id))
        state.table("laws").put(row as unknown as ModuleRow);
  }
  // The state's researched answers to the policy questions are its law in
  // force at the opening (audit 3; BOARD "next" item 4).
  for (const [question, entry] of Object.entries(POLICY_QUESTIONS)) {
    const answer = entry.answers[chain.stateKey];
    if (answer?.answer !== "yes" && answer?.answer !== "no") continue;
    const row: LawRowInput = {
      id: `law:${chain.stateKey}:state:${question}:general:starting`,
      jurisdiction: chain.stateKey,
      level: "state",
      series: question,
      tier: "general",
      value: answer.answer === "yes" ? 1 : 0,
      // In force by the research's calibration date, so outcome research
      // reading the real law at that date sees it (OPUS-WEB, Oct 12); when
      // it was enacted, by whom, is the law's history (`enactmentOf`).
      effectiveDate: today < ANSWERS_AS_OF ? today : ANSWERS_AS_OF,
      endDate: null,
      source: entry.source ?? "data/research/laws/starting-law-2026",
      retrieved: ANSWERS_AS_OF,
      estimate: answer.estimated !== undefined,
    };
    if (!state.table("laws").get(row.id))
      state.table("laws").put(row as unknown as ModuleRow);
  }
  return chain;
}

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
 * starting row begins. Levels without a starting row get none (no state law).
 */
function minimumWageHistoryRows(
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

/**
 * Rows for laws recorded only from a later date: for each level's series with
 * no phase in force on the start date, its earliest phase (every tier of it)
 * applies from the start until that phase begins, marked as an estimate.
 */
function rowsCarriedToStart(
  rows: readonly LawRowInput[],
  today: string,
): LawRowInput[] {
  const groups = new Map<string, LawRowInput[]>();
  for (const row of rows) {
    const key = `${row.jurisdiction}|${row.level}|${row.series}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const out: LawRowInput[] = [];
  for (const group of groups.values()) {
    if (group.some((row) => inForceOn(row, today))) continue;
    const later = group.filter((row) => row.effectiveDate > today);
    if (!later.length) continue;
    const first = later.map((row) => row.effectiveDate).sort()[0]!;
    for (const row of later.filter((r) => r.effectiveDate === first))
      out.push({
        ...row,
        id: `${row.id}:from-start`,
        effectiveDate: today,
        endDate: first,
        source: [
          ...(Array.isArray(row.source) ? row.source : [row.source]),
          `estimate: the phase recorded from ${first}, applied from the start date until then`,
        ].join(" ; "),
        estimate: true,
      });
  }
  return out;
}

const SOCIAL_SECURITY = socialSecurity as unknown as {
  source: string;
  retrieved: string;
  effectiveDate: string;
  series: Record<
    string,
    {
      valueYears: number;
      schedule?: { bornThrough: number; months: number }[];
    }
  >;
};

function socialSecurityRows(today: string): LawRowInput[] {
  return Object.entries(SOCIAL_SECURITY.series).map(([series, row]) => ({
    id: `law:US:federal:${series}:general:starting`,
    jurisdiction: "US",
    level: "federal",
    series,
    tier: "general",
    value: row.valueYears,
    unit: "years",
    effectiveDate:
      SOCIAL_SECURITY.effectiveDate < today
        ? SOCIAL_SECURITY.effectiveDate
        : today,
    endDate: null,
    source: SOCIAL_SECURITY.source,
    retrieved: SOCIAL_SECURITY.retrieved,
    estimate: false,
    ...(row.schedule ? { terms: { schedule: row.schedule } } : {}),
  }));
}

/**
 * A person's Social Security ages under the law in force, in months of age:
 * the earliest claim, the full retirement age for their birth year (an
 * enacted change replaces the schedule or the age), and the age delayed
 * credits stop. For CORE's retirement choice, which decides within them.
 */
export function socialSecurityAges(
  api: CoreAPI,
  birthDate: string,
  date: string = api.state.date,
): SocialSecurityAges {
  const years = (series: string, fallback: number) =>
    lawInForce(api, series, date).value ?? fallback;
  const full = lawInForce(api, "social-security-full-retirement-age", date);
  return socialSecurityAgesFrom(birthDate, {
    earliestYears: years("social-security-earliest-claim-age", 62),
    fullYears: full.value ?? 67,
    delayedYears: years("social-security-delayed-credit-age", 70),
    schedule: (full.governing?.terms?.schedule ?? []) as {
      bornThrough: number;
      months: number;
    }[],
  });
}

export function lawChain(api: CoreAPI): LawChain {
  const chain = api.moduleState(LAWS_MODULE_ID).table("chain").get(CHAIN_ID);
  if (!chain) throw new Error("Laws are not open in this world.");
  return chain as unknown as LawChain;
}

function seriesRows(api: CoreAPI, series: string): readonly LawRowInput[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .query("bySeriesOnly", [series]) as unknown as readonly LawRowInput[];
}

/**
 * When and how a law was enacted: a law passed in play from its own record
 * (the day it passed, its margin); a day-one law from its history (the
 * world's past: the enactment date, body, session and roll calls). Null for a
 * law with neither.
 */
export function enactmentOf(
  api: CoreAPI,
  row: LawRowInput,
): {
  passedOn: string;
  margin: number;
  body: string | null;
  session: Readonly<Record<string, string>> | null;
} | null {
  if (row.terms?.enactedBy) {
    const margin = Number(row.terms.margin);
    return {
      passedOn: row.retrieved,
      margin: Number.isFinite(margin) ? margin : 0,
      body: null,
      session: null,
    };
  }
  const history = lawHistory(api, row.id);
  if (!history) return null;
  const margins = history.rollCalls.map(
    (c) => (c.yes - c.no) / Math.max(1, c.yes + c.no),
  );
  return {
    passedOn: history.enactedOn,
    margin: margins.length ? Math.min(...margins) : 0,
    body: history.body,
    session: history.session,
  };
}

/**
 * The latest law enacted on a series, in play or before day one: the day it
 * passed, the margin it passed by (the narrowest chamber's yes minus no, over
 * those voting), and its value. Null when no record says when it passed.
 */
export function lastEnactment(
  api: CoreAPI,
  series: string,
): { passedOn: string; margin: number; value: number; lawId: string } | null {
  let latest: {
    passedOn: string;
    margin: number;
    value: number;
    lawId: string;
  } | null = null;
  for (const row of seriesRows(api, series)) {
    if (row.effectiveDate > api.state.date && !row.terms?.enactedBy) continue;
    const enacted = enactmentOf(api, row);
    if (!enacted || enacted.passedOn > api.state.date) continue;
    if (latest && enacted.passedOn <= latest.passedOn) continue;
    latest = {
      passedOn: enacted.passedOn,
      margin: enacted.margin,
      value: row.value ?? 0,
      lawId: row.id,
    };
  }
  return latest;
}

/** The law on a series for the town, on a date (today by default), at every level. */
export function lawInForce(
  api: CoreAPI,
  series: string,
  date: string = api.state.date,
): LawInForceAnswer {
  const chain = lawChain(api);
  return resolveLawInForce({
    series,
    chain,
    date,
    rows: seriesRows(api, series),
    authorityRows: seriesRows(api, "local-minimum-wage-authority"),
    enactedAuthority: api
      .moduleState(LAWS_MODULE_ID)
      .table("enactments")
      .query("bySeries", [
        "local-minimum-wage-authority",
      ]) as unknown as readonly EnactedAuthority[],
    localAverage: seriesRows(api, "local-sales-tax-average"),
  });
}

/**
 * An enacted law: a new dated row at its level, read by `lawInForce` from its
 * effective date like any starting row, and put on the calendar so it takes
 * effect as a public record (and raises pay, for a minimum wage).
 */
export function enactLaw(
  api: CoreAPI,
  input: {
    readonly jurisdiction: string;
    readonly level: LawRowInput["level"];
    readonly series: string;
    readonly value: number;
    readonly unit?: string;
    readonly effectiveDate: string;
    readonly measureId: string;
    readonly citation: string;
    /** True when the effective date or value rests on an assumption, not on the measure's text or a law. */
    readonly estimate?: boolean;
    readonly terms?: Readonly<Record<string, unknown>>;
  },
): LawRowInput {
  const lawsTable = api.moduleState(LAWS_MODULE_ID).table("laws");
  const baseId = `law:${input.jurisdiction}:${input.level}:${input.series}:general:${input.effectiveDate}:${input.measureId}`;
  const byBill = input.terms?.enactedByBill;
  const enactedBy = (id: string) =>
    (lawsTable.get(id) as unknown as LawRowInput | undefined)?.terms
      ?.enactedByBill;
  // Measure numbers repeat across bodies and sessions: a row another bill
  // enacted keeps its id, and a later provision of the same bill on the same
  // series and date replaces the earlier one (one row, one calendar entry).
  let id = baseId;
  for (
    let n = 2;
    lawsTable.get(id) && (byBill === undefined || enactedBy(id) !== byBill);
    n += 1
  )
    id = `${baseId}:${n}`;
  const replaced = lawsTable.get(id) !== undefined;
  const row: LawRowInput = {
    id,
    jurisdiction: input.jurisdiction,
    level: input.level,
    series: input.series,
    tier: "general",
    value: input.value,
    effectiveDate: input.effectiveDate,
    endDate: null,
    source: input.citation,
    retrieved: api.state.date,
    estimate: input.estimate === true,
    ...(input.unit ? { unit: input.unit } : {}),
    terms: { ...(input.terms ?? {}), enactedBy: input.measureId },
  };
  api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .put(row as unknown as ModuleRow);
  const source = {
    tag: "SOURCED" as const,
    citation: input.citation,
    asOf: api.state.date,
  };
  if (input.effectiveDate > api.state.date) {
    if (!replaced)
      api.moduleCalendar(LAWS_MODULE_ID).schedule({
        key: `effect:${row.id}`,
        date: input.effectiveDate,
        kind: "law-takes-effect",
        source,
        sourceRecordIds: [row.id],
      });
  }
  // An act in force the day it's enacted (a federal act without a date of
  // its own) takes effect now (audit 3: federal acts never fired).
  else
    lawTookEffect(api, {
      key: `effect:${row.id}`,
      date: api.state.date,
      kind: "law-takes-effect",
      source,
      sourceRecordIds: [row.id],
    } as unknown as ModuleCalendarWork);
  return row;
}

/** Every tracked series for the town on a date: the bench's "law here" view. */
export function lawHere(
  api: CoreAPI,
  date: string = api.state.date,
): readonly LawInForceAnswer[] {
  return [
    "minimum-wage",
    "income-tax",
    "sales-tax",
    "property-tax",
    "snap-maximum",
    "unemployment-weekly-maximum",
    "unemployment-insurance",
    "medicaid-match",
    "social-security-tax",
    "medicare-tax",
  ].map((series) => lawInForce(api, series, date));
}

function lawTookEffect(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "law-takes-effect") return;
  const id = work.sourceRecordIds[0]!;
  const row = api.moduleState(LAWS_MODULE_ID).table("laws").get(id) as
    LawRowInput | undefined;
  if (!row || !inForceOn(row, api.state.date)) return;
  const town = lawChain(api).townPlaceId;
  // What it replaced: the law in force on the series the day before. A
  // policy question set to 0 ends that law (a repeal).
  const before = lawInForce(
    api,
    row.series,
    addDays(makeIsoDate(api.state.date), -1),
  ).governing;
  const ends =
    before &&
    before.id !== row.id &&
    row.value === 0 &&
    (before.value ?? 0) !== 0;
  const decidedBy = row.terms?.decidedBy;
  api.emit({
    id: `law-took-effect:${row.id}`,
    date: api.state.date,
    kind: "law-took-effect",
    personIds: [],
    placeId: town,
    source: work.source,
    publicRecord: true,
    news: true,
    facts: {
      lawId: row.id,
      series: row.series,
      level: row.level,
      jurisdiction: row.jurisdiction,
      tier: row.tier,
      value: String(row.value),
      unit: row.unit ?? "",
      change: ends
        ? "ended"
        : before && (before.value ?? 0) !== 0
          ? "replaced"
          : "new",
      ...(before && before.id !== row.id ? { replacesLawId: before.id } : {}),
      ...(row.terms?.enactedBy
        ? { enactedBy: String(row.terms.enactedBy) }
        : {}),
      ...(decidedBy
        ? {
            decidedBy: String(decidedBy),
            decision: String(row.terms?.decision ?? ""),
          }
        : {}),
    },
  });
  if (row.series === "minimum-wage") raiseToFloor(api, work.source);
  if (row.series === PUBLIC_PAY_FLOOR) recordPublicPay(api, work.source);
}

/**
 * The public pay floor's raises, each on the worker's record like a minimum
 * wage raise. stopgapId: SG-GOV-public-pay-floor-owner
 */
function recordPublicPay(api: CoreAPI, source: Source): void {
  const raises = api.moduleState(LAWS_MODULE_ID).table("raises");
  for (const r of holdPublicPay(api, source))
    raises.put({
      id: `raise:${r.jobId}:${api.state.date}`,
      personId: r.personId,
      jobId: r.jobId,
      date: api.state.date,
      fromMinor: r.fromMinor,
      toMinor: r.toMinor,
      lawId: r.lawId,
    });
}

/**
 * Raise every job in the town paying under the minimum wage now in force.
 * Jobs at an employer outside the town's chain keep their own law.
 */
function raiseToFloor(api: CoreAPI, source: Source): void {
  const core = api.state as CoreState;
  for (const commitment of [...core.work.commitments.values()])
    raiseOne(api, commitment.id, source);
  // The counted residents' jobs in town rise too (two-level population).
  const floor = lawInForce(api, "minimum-wage").value;
  const rt = residentsRuntime(core);
  if (floor === null || !rt) return;
  // Each employer's wage flow is recomputed once; a counted job no wage flow
  // pays (its worker filled in, its flow ended) has no pay here to raise.
  const raised = new Map<string, number>();
  for (const job of rt.jobs.values()) {
    if (job.endsAt !== undefined || (job.hourlyMinor ?? floor) >= floor)
      continue;
    const employer = core.organizations.get(job.organizationId);
    if (
      !employer ||
      (core.visiblePlaceIds.size && !core.visiblePlaceIds.has(employer.placeId))
    )
      continue;
    raised.set(job.id, floor);
  }
  rerateCountedJobs(core, raised);
}

/**
 * Raise one job to the minimum wage in force where it's paid under it (an
 * enforcement finding, or the law taking effect). Returns whether it rose.
 * Jobs at an employer outside the town's chain keep their own law.
 */
export function raiseOne(
  api: CoreAPI,
  commitmentId: string,
  source: Source,
): boolean {
  const answer = lawInForce(api, "minimum-wage");
  const floor = answer.value;
  if (floor === null || !answer.governing) return false;
  const core = api.state as CoreState;
  const town = core.visiblePlaceIds;
  const raises = api.moduleState(LAWS_MODULE_ID).table("raises");
  const commitment = core.work.commitments.get(commitmentId);
  if (!commitment || commitment.hourlyMinor >= floor) return false;
  if (commitment.endsAt !== undefined && commitment.endsAt <= core.date)
    return false;
  const employer = core.organizations.get(commitment.organizationId);
  if (!employer || (town.size && !town.has(employer.placeId))) return false;
  const from = commitment.hourlyMinor;
  // The pay change through the core's own job record.
  api.rerateJob(commitment.jobId, floor, { ...source, asOf: core.date });
  raises.put({
    id: `raise:${commitment.id}:${core.date}`,
    personId: commitment.personId,
    jobId: commitment.jobId,
    date: core.date,
    fromMinor: from,
    toMinor: floor,
    lawId: answer.governing.id,
  });
  api.emit({
    id: `minimum-wage-raise:${commitment.id}:${core.date}`,
    date: core.date,
    kind: "pay-raised-to-minimum-wage",
    personIds: [commitment.personId],
    placeId: employer.placeId,
    source,
    facts: {
      jobId: commitment.jobId,
      fromMinor: String(from),
      toMinor: String(floor),
      lawId: answer.governing.id,
    },
  });
  return true;
}
