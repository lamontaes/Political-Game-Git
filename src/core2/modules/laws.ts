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
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { residentsRuntime } from "./residents";
import { POLICY_QUESTIONS } from "../policy-answers";
import socialSecurity from "../data/laws/social-security-ages.json" with { type: "json" };
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
  onCalendarWork: lawTookEffect,
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
      // reading the real law at that date sees it (OPUS-WEB, Oct 12).
      effectiveDate: today < ANSWERS_AS_OF ? today : ANSWERS_AS_OF,
      endDate: null,
      source: entry.source ?? "data/research/laws/starting-law-2026",
      retrieved: today,
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
          r.jurisdiction === jurisdiction &&
          r.tier === "general",
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
): { earliestMonths: number; fullMonths: number; delayedMaxMonths: number } {
  const years = (series: string, fallback: number) =>
    lawInForce(api, series, date).value ?? fallback;
  const full = lawInForce(api, "social-security-full-retirement-age", date);
  const schedule = (full.governing?.terms?.schedule ?? []) as {
    bornThrough: number;
    months: number;
  }[];
  // Born on January 1: treated as born the year before (20 C.F.R. § 404.102).
  const year =
    Number(birthDate.slice(0, 4)) - (birthDate.slice(5) === "01-01" ? 1 : 0);
  const scheduled = schedule.find((r) => year <= r.bornThrough);
  return {
    earliestMonths: Math.round(
      years("social-security-earliest-claim-age", 62) * 12,
    ),
    fullMonths: scheduled?.months ?? Math.round((full.value ?? 67) * 12),
    delayedMaxMonths: Math.round(
      years("social-security-delayed-credit-age", 70) * 12,
    ),
  };
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
    readonly terms?: Readonly<Record<string, unknown>>;
  },
): LawRowInput {
  const row: LawRowInput = {
    id: `law:${input.jurisdiction}:${input.level}:${input.series}:general:${input.effectiveDate}:${input.measureId}`,
    jurisdiction: input.jurisdiction,
    level: input.level,
    series: input.series,
    tier: "general",
    value: input.value,
    effectiveDate: input.effectiveDate,
    endDate: null,
    source: input.citation,
    retrieved: api.state.date,
    estimate: false,
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
  if (input.effectiveDate > api.state.date)
    api.moduleCalendar(LAWS_MODULE_ID).schedule({
      key: `effect:${row.id}`,
      date: input.effectiveDate,
      kind: "law-takes-effect",
      source,
      sourceRecordIds: [row.id],
    });
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
    },
  });
  if (row.series === "minimum-wage") raiseToFloor(api, work.source);
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
  for (const job of rt.jobs.values()) {
    if (job.endsAt !== undefined || (job.hourlyMinor ?? floor) >= floor)
      continue;
    const employer = core.organizations.get(job.organizationId);
    if (
      !employer ||
      (core.visiblePlaceIds.size && !core.visiblePlaceIds.has(employer.placeId))
    )
      continue;
    api.rerateJob(job.id, floor, { ...source, asOf: core.date });
  }
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
  // The pay change through the core's own job record (core2-api-v12).
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
